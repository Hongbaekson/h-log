// Local synthetic benchmark. It never accepts a database URL or a remote app URL.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { cpus, totalmem, tmpdir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { createBrainRepository } from '../lib/brain-postgres-repository.ts';
import { getPublicBlogIndex, getPublicBlogPosts } from '../lib/blog-public.ts';
import { layoutBrainGraph } from '../lib/brain-layout.ts';
import { brainCatalog } from '../lib/brain-catalog.ts';
import { selectPublicBrain } from '../lib/brain.ts';
import { BLOG_SIZES, BRAIN_SIZES, FIXTURE_DATE, BUDGETS, fingerprint, statistics, makeBlogFixture, makeBrainFixture } from './performance-fixtures.mjs';
import { measureBrainBrowser, verifyProtectedUi } from './performance-browser.mjs';

const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=promisify(execFile),require=createRequire(import.meta.url);
const DB_IMAGE='pgvector/pgvector:pg16@sha256:a36250871de0833b8757561c72f2477ef1ddd1101afa4e617fb552e0de514c6b';
const args=process.argv.slice(2);
if(!args.includes('--local')||args.some(a=>!['--local','--cleanup-check','--smoke'].includes(a))) {
  console.error('Usage: node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local [--cleanup-check | --smoke]');
  process.exitCode=1;
} else await main().catch(()=>{process.exitCode=1;});

async function main() {
  const label='hlog-perf-'+randomUUID().slice(0,8),output=join(app,'private','performance-baseline',label);
  const scratch=await mkdtemp(join(tmpdir(),label+'-'));
  await mkdir(output,{recursive:true});
  const result={startedAt:new Date().toISOString(),profile:args.includes('--smoke')?'smoke':'baseline',fixtureVersion:1,budgets:BUDGETS,cpu:[],http:[],browser:[],fixtures:[],publicResults:[],
    rebuild_duration_ms:null,rebuildStatus:'Persistent projection/rebuild is not implemented; fixture seeding is not rebuild time.'};
  const containers=[],secretFiles=[];let network=false,imageCreated=false,pool,browser,stage='preflight',interrupted=false;
  const onSignal=()=>{interrupted=true;};process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
  const checkAbort=()=>assert(!interrupted,'Interrupted');
  const command=async(binary,parameters,timeout=120000)=>run(binary,parameters,{cwd:app,windowsHide:true,timeout,maxBuffer:16*1024*1024});
  const docker=async parameters=>(await command('docker',parameters)).stdout.trim();
  const image=label+':app',db=label+'-db',web=label+'-web';
  async function envFile(name,text) {const path=join(scratch,name);await writeFile(path,text,{mode:0o600});secretFiles.push(path);return path;}
  async function removeContainer(name) {
    assert(containers.includes(name));
    assert.equal(await docker(['inspect','--format','{{index .Config.Labels "hlog.performance.owner"}}',name]),label);
    await docker(['rm','-fv',name]);containers.splice(containers.indexOf(name),1);
  }
  async function eventually(fn) {for(let i=0;i<120;i++){checkAbort();try{return await fn();}catch{await new Promise(r=>setTimeout(r,500));}}throw Error('Local readiness failed');}
  function measure(fn) {
    for(let i=0;i<2;i++)fn();const samples=[];
    for(let i=0;i<5;i++){checkAbort();const t=performance.now();fn();samples.push(performance.now()-t);}
    return {warmups:2,samples,ms:statistics(samples)};
  }
  try {
    const dockerEndpoint=process.env.DOCKER_CONTEXT
      ?await docker(['context','inspect',process.env.DOCKER_CONTEXT,'--format','{{.Endpoints.docker.Host}}'])
      :process.env.DOCKER_HOST||await docker(['context','inspect','--format','{{.Endpoints.docker.Host}}']);
    assert(/^(?:npipe|unix):/.test(dockerEndpoint),'A local Docker socket is required; remote Docker endpoints are refused');
    const playwright=require(process.env.HLOG_PERF_PLAYWRIGHT_MODULE||'playwright');
    const packageVersion=require((process.env.HLOG_PERF_PLAYWRIGHT_MODULE||'playwright')+'/package.json').version;
    const packageJson=JSON.parse(await readFile(join(app,'package.json'),'utf8'));
    const sourceFiles=(await command('git',['ls-files','--','app','components','lib','migrations','public','package.json','package-lock.json','next.config.ts','Dockerfile'])).stdout.trim().split(/\r?\n/);
    const sourceHash=fingerprint(await Promise.all(sourceFiles.map(async path=>[path,fingerprint(await readFile(join(app,path),'base64'))])));
    const harnessHash=fingerprint(await Promise.all(['performance-baseline.mjs','performance-fixtures.mjs','performance-browser.mjs'].map(async path=>[path,await readFile(join(app,'scripts',path),'utf8')])));
    result.environment={commit:(await command('git',['rev-parse','HEAD'])).stdout.trim(),sourceHash,harnessHash,node:process.version,
      next:packageJson.dependencies.next,playwright:packageVersion,platform:platform(),cpu:cpus()[0].model,logicalCpus:cpus().length,memoryBytes:totalmem(),
      docker:await docker(['version','--format','{{.Server.Version}}']),dbImage:DB_IMAGE,appLimits:{cpus:2,memory:'2g'},dbLimits:{cpus:1,memory:'1g'}};
    result.method={cpu:'Host pure functions, 2 warmups/5 samples; median only.',http:'32 warm requests per route/concurrency 1 or 8; 1 warmup. First route request recorded separately; DB/OS caches not flushed.',
      browser:'Fresh context cold navigation then same-context warm navigation; 1440/390 x CPU 1/4 x 3 pairs; reduced motion, DPR1, no network throttling.',
      interaction:'Keyboard click dispatch to second animation frame after layout DOM changes (brain to topics); not field INP.',heap:'Runtime.getHeapUsage usedSize after forced GC and one brain/topics/brain roundtrip; not a leak proof.',
      p95:'Sorted sample at ceil(0.95*n)-1; p50 is middle value or mean of two middle values.',comparison:'Same fixture/source-independent harness hash, hardware, image build/tool versions, resource limits and conditions. Regression limit = larger baseline run median * ratio + allowance; HTTP p95 compares larger run p95. Never pool different conditions.'};
    const password=randomBytes(24).toString('hex');
    stage='create-isolated-db';
    await docker(['network','create','--label',`hlog.performance.owner=${label}`,label]);network=true;
    const dbEnv=await envFile('db.env',`POSTGRES_PASSWORD=${password}\nPOSTGRES_DB=hlog_perf_local\n`);
    await docker(['run','-d','--name',db,'--label',`hlog.performance.owner=${label}`,'--network',label,'--cpus','1','--memory','1g','-p','127.0.0.1::5432','--env-file',dbEnv,'--tmpfs','/var/lib/postgresql/data',DB_IMAGE]);containers.push(db);
    const port=(await docker(['port',db,'5432/tcp'])).split(':').at(-1);
    const databaseUrl=`postgresql://postgres:${password}@127.0.0.1:${port}/hlog_perf_local`;
    pool=new pg.Pool({connectionString:databaseUrl,max:4,connectionTimeoutMillis:3000});
    await eventually(()=>pool.query('select 1'));await runBlogMigrations(databaseUrl);
    if(args.includes('--cleanup-check'))throw Error('Intentional cleanup probe');
    stage='build';console.log('Building current production image; '+label);
    try {const build=await command('docker',['build','--target','runner','--label',`hlog.performance.owner=${label}`,'-t',image,'.'],900000);imageCreated=true;await writeFile(join(output,'build.log'),build.stdout+build.stderr);}
    catch(error){await writeFile(join(output,'build.log'),(error.stdout??'')+(error.stderr??''));throw Error('Build failed');}
    result.environment.imageId=await docker(['image','inspect',image,'--format','{{.Id}}']);
    const webEnv=await envFile('web.env',`DATABASE_URL=postgresql://postgres:${password}@${db}:5432/hlog_perf_local\nHLOG_PUBLIC_BASE_URL=https://hlog.example.org\nHLOG_BRAIN_DATABASE_ENABLED=1\nHLOG_ADMIN_ENABLED=0\nHLOG_RESUME_PDF_ENABLED=0\nHLOG_PRIVACY_ORGANIZATION_NAMES=[]\nHLOG_PRIVACY_PRIVATE_REPOSITORIES=[]\n`);
    async function startWeb() {
      if(containers.includes(web))await removeContainer(web);
      await docker(['run','-d','--name',web,'--label',`hlog.performance.owner=${label}`,'--network',label,'--cpus','2','--memory','2g','-p','127.0.0.1::3000','--env-file',webEnv,image]);containers.push(web);
      const port=(await docker(['port',web,'3000/tcp'])).split(':').at(-1);const origin=`http://127.0.0.1:${port}`;
      await eventually(async()=>assert.equal((await fetch(origin+'/resume',{signal:AbortSignal.timeout(10000)})).status,200));return origin;
    }
    let requestNumber=0;
    async function request(origin,path,expected=200) {
      checkAbort();const started=performance.now();
      const response=await fetch(origin+path,{headers:{'x-real-ip':`performance-${requestNumber++}`,'user-agent':'HLogLocalPerformance'},redirect:'manual',signal:AbortSignal.timeout(120000)});
      const ttfb=performance.now()-started,body=await response.text(),elapsed=performance.now()-started;
      assert.equal(response.status,expected,path);assert(!body.includes('PERF_PRIVATE'),'Private fixture appeared in public response');
      return {ms:elapsed,ttfb,bytes:Buffer.byteLength(body)};
    }
    const repository=createPostgresBlogRepository(pool);
    const originals=async()=>fingerprint((await pool.query('select * from post_versions order by id')).rows);
    for(const count of args.includes('--smoke')?[10]:BLOG_SIZES) {
      stage='blog-'+count;checkAbort();const store=makeBlogFixture(count);
      result.fixtures.push({kind:'blog',count,sha256:fingerprint(store),versionsPerPost:2,hiddenPosts:2,thumbnails:0,markdownBytes:Buffer.byteLength(store.versions[0].contentMarkdown),htmlBytes:Buffer.byteLength(store.versions[0].contentHtml)});
      result.cpu.push({kind:'blog',count,list_model_cpu_ms:measure(()=>getPublicBlogIndex(store)),full_model_cpu_ms:measure(()=>getPublicBlogPosts(store))});
      await pool.query('truncate posts cascade');
      for(const post of store.posts)for(const version of store.versions.filter(v=>v.postId===post.id))await repository.savePost({post:{...post,currentVersionId:version.id},version,tags:store.tags.filter(t=>t.postId===post.id),sources:store.sources.filter(s=>s.postId===post.id),assets:[],publishJobs:[]});
      await pool.query("update posts set current_version_id=id||'-v1'");
      await pool.query('analyze');const before=await originals();
      const actual=getPublicBlogIndex(await repository.findPublicBlogContent()),expected=getPublicBlogIndex(store);
      assert.deepEqual(actual,expected);assert(!JSON.stringify(actual).includes('PERF_PRIVATE'));
      result.publicResults.push({kind:'blog',count,sha256:fingerprint(actual),ids:actual.posts.map(p=>p.slug),pagination:actual.pagination});
      const origin=await startWeb();
      for(const path of ['/blog','/blog/perf-0000','/blog/perf-0000.md','/api/search?q=Redis']) {
        const first=await request(origin,path);await request(origin,path);
        for(const concurrency of [1,8]) {
          const samples=[];let next=0;
          await Promise.all(Array.from({length:concurrency},async()=>{while(next++<32)samples.push(await request(origin,path));}));
          const row={count,path,concurrency,routeFirst:first,request_ms:statistics(samples.map(s=>s.ms),true),ttfb_ms:statistics(samples.map(s=>s.ttfb),true),samples};
          result.http.push(row);await writeFile(join(output,'progress.json'),JSON.stringify({stage,httpConditions:result.http.length}));
        }
      }
      await request(origin,'/sitemap.xml');await request(origin,'/blog/perf-draft',404);await request(origin,'/blog/perf-retracted',404);
      assert.equal(await originals(),before);console.log('PASS blog '+count+' CPU, 256 warm HTTP requests and public boundary');
    }
    browser=await playwright.chromium.launch({headless:true,...(process.env.HLOG_PERF_BROWSER_CHANNEL?{channel:process.env.HLOG_PERF_BROWSER_CHANNEL}:{})});
    result.environment.browser=browser.version();result.environment.appNode=await docker(['exec',web,'node','--version']);
    // Keep Blog small and fixed while measuring Brain; each graph is a new owned synthetic fixture.
    await pool.query("update posts set status='retracted' where id not in (select id from posts where status='published' order by id limit 10)");
    for(const count of args.includes('--smoke')?[28]:BRAIN_SIZES) {
      stage='brain-'+count;checkAbort();const {graph,snapshots}=makeBrainFixture(count);
      result.fixtures.push({kind:'brain',count,sha256:fingerprint(graph),edges:graph.edges.length,extraBodyBytes:snapshots[0]?Buffer.byteLength(snapshots[0].sections[0].paragraphs[0]):null,
        degrees:graph.nodes.reduce((hist,node)=>{const n=graph.edges.filter(e=>e.from===node.id||e.to===node.id).length;hist[n]=(hist[n]??0)+1;return hist;},{})});
      result.cpu.push({kind:'brain',count,layout_cpu_ms:measure(()=>layoutBrainGraph(graph,'brain',1)),timeline_cpu_ms:measure(()=>layoutBrainGraph(graph,'timeline',1))});
      await pool.query('truncate brain_notes cascade');const client=await pool.connect();
      try {await client.query('begin');for(const snapshot of snapshots) {
        await client.query('insert into brain_notes(id,current_revision,published_revision,public_node,created_at,updated_at) values($1,2,1,$2,$3,$3)',[snapshot.id,snapshot,FIXTURE_DATE]);
        for(const revision of [1,2])await client.query('insert into brain_note_versions(note_id,revision,draft,created_at) values($1,$2,$3,$4)',[snapshot.id,revision,
          {title:'PERF_PRIVATE_ORIGINAL',originalText:'PERF_PRIVATE_ORIGINAL',publicTitle:revision===1?snapshot.title:'PERF_PRIVATE_UNSELECTED',publicSummary:snapshot.summary,
            publicBody:snapshot.sections[0].paragraphs.join('\n\n'),kind:snapshot.kind,basis:snapshot.basis,topic:snapshot.topic,tags:snapshot.tags,links:snapshot.links,sources:snapshot.sources,questions:snapshot.questions},FIXTURE_DATE]);
      }await client.query('commit');}catch(error){await client.query('rollback');throw error;}finally{client.release();}
      const expected=await createBrainRepository(pool,{},selectPublicBrain(brainCatalog)).findPublicGraph();assert.deepEqual(expected,graph);
      const brainOriginals=async()=>fingerprint((await pool.query('select * from brain_note_versions order by note_id,revision')).rows);
      const before=await brainOriginals(),origin=await startWeb();
      await request(origin,'/brain');await request(origin,'/brain?view=list&_rsc=perf');await request(origin,'/sitemap.xml');
      result.publicResults.push({kind:'brain',count,sha256:fingerprint(graph),nodes:graph.nodes.map(n=>n.id),edgeCount:graph.edges.length});
      if(count===28)result.ui=await verifyProtectedUi(browser,origin,graph,output);
      result.browser.push(...await measureBrainBrowser(browser,origin,graph,output,checkAbort));
      assert.equal(await brainOriginals(),before);console.log('PASS brain '+count+' CPU and 24 browser samples');
    }
    result.completedAt=new Date().toISOString();
  } catch(error) {
    result.failure={stage,type:error.name,cleanupProbe:args.includes('--cleanup-check')};
    console.error('FAILED '+stage+'; '+error.message.replace(/postgresql:\/\/\S+/g,'[database URL]'));
    throw error;
  } finally {
    const cleanupErrors=[];
    for(const cleanup of [async()=>{if(browser)await browser.close();},async()=>{if(pool)await pool.end();},
      ...[...containers].reverse().map(name=>()=>removeContainer(name)),
      async()=>{if(network){assert.equal(await docker(['network','inspect','--format','{{index .Labels "hlog.performance.owner"}}',label]),label);await docker(['network','rm',label]);}},
      async()=>{if(imageCreated){assert.equal(await docker(['image','inspect','--format','{{index .Config.Labels "hlog.performance.owner"}}',image]),label);await docker(['image','rm',image]);}},
      ...secretFiles.map(path=>()=>unlink(path)),()=>rmdir(scratch)]) {
      try{await cleanup();}catch{cleanupErrors.push('Owned resource cleanup failed');}
    }
    result.cleanup={complete:cleanupErrors.length===0,errors:cleanupErrors};
    process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);
    const serialized=JSON.stringify(result,null,2);assert(!serialized.includes('PERF_PRIVATE'));
    await writeFile(join(output,'result.json'),serialized+'\n');
    console.log('Result: '+output+'; cleanup='+result.cleanup.complete);
    if(cleanupErrors.length)throw Error('Cleanup incomplete');
  }
}
