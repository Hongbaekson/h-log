import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { mkdir,writeFile,unlink } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { makeBlogFixture,statistics } from './performance-fixtures.mjs';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { getPublicBlogIndex, getPublicBlogPostBySlug, getPublicBlogPostNavigation } from '../lib/blog-public.ts';
import { getPublicBlogSeries } from '../lib/blog-series.ts';
import { runLocalProjection } from '../lib/public-read-rebuild.ts';
import { loadPublicBlogDetail, loadProjectRelatedPosts, loadPublicBlogIndex } from '../lib/blog-public-source.ts';
import { readPublicBlogList,publicReadMode } from '../lib/public-blog-list.ts';
import { readPublicBlogDetail } from '../lib/public-blog-detail.ts';
import { createBrainRepository } from '../lib/brain-postgres-repository.ts';
import { fingerprint,projectionContext } from '../lib/public-read-model.ts';

test('projected lists preserve the current public set without transferring original bodies', { skip: process.env.HLOG_PROJECTION_TEST !== '1' }, async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname,'127.0.0.1'); assert.match(url.pathname,/^\/hlog_projection_[a-z0-9_]+$/); assert(!url.search);
  url.pathname='/postgres'; const admin=new pg.Client({ connectionString:url.href }); await admin.connect();
  const name='hlog_projection_'+randomUUID().replaceAll('-','');
  await admin.query(`create database ${name}`); await admin.query(`comment on database ${name} is 'hlog-public-read-local-v1'`);
  url.pathname='/'+name; const pool=new pg.Pool({ connectionString:url.href,max:12 });
  const oldPool=globalThis.hlogBlogPublicPool, oldMode=process.env.HLOG_PUBLIC_READ_MODEL;
  const queries=[];let afterQuery;
  const observed={ connect:async()=>{
    const client=await pool.connect();
    return { release:(...args)=>client.release(...args), query:async(...args)=>{
      const result=await client.query(...args); if(result.command==='SELECT')queries.push({sql:args[0],args:args[1],rows:result.rows});
      await afterQuery?.(args[0]);return result;
    }};
  }};
  try {
    await runBlogMigrations(url.href);
    const fixture=makeBlogFixture(10),repo=createPostgresBlogRepository(pool);
    for(const post of fixture.posts)for(const version of fixture.versions.filter(v=>v.postId===post.id))
      await repo.savePost({post:{...post,currentVersionId:version.id},version,tags:fixture.tags.filter(v=>v.postId===post.id),sources:fixture.sources.filter(v=>v.postId===post.id),assets:[],publishJobs:[]});
    await pool.query("update posts set current_version_id=id||'-v1'");
    await runLocalProjection(pool,{command:'rebuild',kind:'all',confirmOwnedLocal:true});
    globalThis.hlogBlogPublicPool=observed; process.env.HLOG_PUBLIC_READ_MODEL='projected';
    const expected=await repo.findPublicBlogContent();
    const rebuild=()=>runLocalProjection(pool,{command:'rebuild',kind:'all',confirmOwnedLocal:true});
    const sourceIndex=async(page=1,tag,pageSize=6)=>getPublicBlogIndex(await repo.findPublicBlogContent(),{page,tag,pageSize});
    const withoutSeries=value=>{const index={...value};delete index.series;return index;};
    const bodyReads=()=>queries.filter(q=>q.sql.includes('select to_jsonb(p) post')).length;
    async function assertWarmDetail() {
      queries.length = 0;
      const slug = 'perf-0000';
      const store = await repo.findPublicBlogContent();
      const actual = await loadPublicBlogDetail(slug);
      const { markdown, contentHtml, ...post } = getPublicBlogPostBySlug(slug, store);
      assert(markdown && contentHtml);
      assert.deepEqual(actual.post, post);
      assert.deepEqual(actual.navigation, getPublicBlogPostNavigation(slug, store));
      assert.equal(actual.publicationDate, store.posts.find(p => p.slug === slug).publishedAt);
      assert.equal(bodyReads(), 0);
      assert.equal(queries.flatMap(q => q.rows).filter(row => row.content_markdown || row.content_html).length, 0);
      const bytes = Buffer.byteLength(JSON.stringify(queries.map(q => q.rows)));
      assert(bytes < 90000, 'detail response should carry one target and a bounded set of navigation links');
      console.log('warm detail', store.posts.length, queries.length, bytes);
    }
    await t.test('detail shares the current target and bounded navigation', assertWarmDetail);
    await t.test('detail sees title-only edits, damaged payload, renderer change and withdrawal', async () => {
      const slug = 'perf-0000';
      await pool.query("update post_versions set title='새 공개 제목' where id='perf-0000-v1'");
      const updated = await loadPublicBlogDetail(slug);
      assert.equal(updated.post.title, '새 공개 제목');
      for (const mode of ['source', 'shadow']) {
        assert.deepEqual(await readPublicBlogDetail(pool, slug, projectionContext(), mode), updated);
      }
      const policy = projectionContext({restrictedTerms: [{category: 'organization_name', value: '새 공개 제목'}]});
      assert.equal(await readPublicBlogDetail(pool, slug, policy, 'projected'), undefined);
      await rebuild();
      await pool.query("update public_read_entries set payload=jsonb_set(payload,'{detail,title}',to_jsonb('damaged'::text)) where source_id=$1", [slug]);
      assert.equal((await loadPublicBlogDetail(slug)).post.title, '새 공개 제목');
      await pool.query("update public_read_generations set version_manifest=jsonb_set(version_manifest,'{renderer}','0') where status='active'");
      assert.equal((await loadPublicBlogDetail(slug)).post.title, '새 공개 제목');
      await rebuild();
      afterQuery = async sql => {
        if (sql.includes('where not usable')) {
          afterQuery = undefined;
          await pool.query("update posts set status='retracted' where slug='perf-0001'");
        }
      };
      assert.equal((await loadPublicBlogDetail(slug)).navigation.next.href, '/blog/perf-0001');
      assert.equal((await loadPublicBlogDetail(slug)).navigation.next.href, '/blog/perf-0002');
      assert.equal(await loadPublicBlogDetail('perf-0001'), undefined);
      await pool.query("update post_versions set title='합성 검수 0' where id='perf-0000-v1'");
      await pool.query("update posts set status='published' where slug='perf-0001'");
      await rebuild();
    });
    await t.test('series, Portfolio and Brain links reflect only selected public copies', async () => {
      const slug = 'home-recent-posts', brain = createBrainRepository(pool);
      const brainEnabled = process.env.HLOG_BRAIN_DATABASE_ENABLED;
      process.env.HLOG_BRAIN_DATABASE_ENABLED = '1';
      try {
        await pool.query("update posts set slug=$1 where id='perf-0000'", [slug]);
        const draft = { title: 'original', originalText: 'unselected', publicTitle: '공개 생각', publicSummary: '공개 요약',
          publicBody: '공개 본문', kind: 'question', basis: 'question', topic: 'tools', tags: [],
          sources: [{ label: '연결 글', href: '/blog/'+slug }] };
        const command = commandRevision => ({commandRevision, commandId: randomUUID()});
        const note = await brain.saveDraft(draft, undefined, 0, command(0));
        await brain.publish(note.id, 1, true, command(1));
        await rebuild();
        const detail = await loadPublicBlogDetail(slug);
        assert.deepEqual(detail.projectConnections, await loadProjectRelatedPosts('h-log-public-reading'));
        assert.equal(detail.projectConnections[0].postSlug, slug);
        assert.equal(detail.series.posts[0].slug, slug);
        assert(detail.brainLinks.some(link => link.href === '/brain/'+note.id));
        await brain.unpublish(note.id, 1, command(2));
        assert(!(await loadPublicBlogDetail(slug)).brainLinks.some(link => link.href === '/brain/'+note.id));
        await pool.query("alter table brain_notes rename to unavailable_brain_notes");
        try { assert.equal((await loadPublicBlogDetail(slug)).brainLinks, null); }
        finally { await pool.query("alter table unavailable_brain_notes rename to brain_notes"); }
        await pool.query("update posts set status='retracted' where slug=$1", [slug]);
        assert.equal(await loadPublicBlogDetail(slug), undefined);
        assert.deepEqual(await loadProjectRelatedPosts('h-log-public-reading'), []);
      } finally {
        if (brainEnabled === undefined) delete process.env.HLOG_BRAIN_DATABASE_ENABLED;
        else process.env.HLOG_BRAIN_DATABASE_ENABLED = brainEnabled;
        await pool.query("update posts set status='published',slug='perf-0000' where id='perf-0000'");
        await rebuild();
      }
    });
    await t.test('warm list loads page rows and aggregate metadata only',async()=>{
      queries.length=0; const actual=await loadPublicBlogIndex(1);
      assert.equal(queries.flatMap(q=>q.rows).filter(row=>'content_markdown' in row||'content_html' in row).length,0);
      assert.deepEqual({...actual,series:undefined},{...getPublicBlogIndex(expected),series:undefined});
      assert.doesNotMatch(JSON.stringify(actual),/PERF_PRIVATE/);
      assert(Buffer.byteLength(JSON.stringify(queries.map(q=>q.rows)))<15000);
    });
    await t.test('all filters, normalized pages, source and shadow preserve results',async()=>{
      for(const page of [-1,0,1,2,999999,Number.MAX_SAFE_INTEGER])for(const tag of [undefined,'Redis','postgres','unknown'])
        assert.deepEqual(withoutSeries(await loadPublicBlogIndex(page,tag)),await sourceIndex(page,tag));
      assert.equal(publicReadMode(undefined),'projected'); // environment is explicit in this suite
      assert.equal(publicReadMode('source'),'source');assert.throws(()=>publicReadMode('bad'),/invalid_public_read_mode/);
      for(const mode of ['source','shadow'])assert.deepEqual(withoutSeries(await readPublicBlogList(pool,{},projectionContext(),mode)),await sourceIndex());
      const active=(await pool.query('select active_generation from public_read_state')).rows[0].active_generation;
      await pool.query('update public_read_state set active_generation=null');
      assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1)),await sourceIndex());
      await pool.query('update public_read_state set active_generation=$1',[active]);
    });
    await t.test('series and list use the same publication snapshot',async()=>{
      await pool.query("update posts set slug='home-recent-posts' where id='perf-0000'");await rebuild();
      const series=getPublicBlogSeries(await repo.findPublicBlogContent());assert(series.length>0);
      afterQuery=async sql=>{if(sql.includes('where not usable')){afterQuery=undefined;await pool.query("update posts set status='retracted' where id='perf-0000'");}};
      assert.deepEqual((await loadPublicBlogIndex(1)).series,series);
      assert.deepEqual((await loadPublicBlogIndex(1)).series,getPublicBlogSeries(await repo.findPublicBlogContent()));
      await pool.query("update posts set status='published',slug='perf-0000' where id='perf-0000'");await rebuild();
    });
    await t.test('withdrawal and tag changes use one snapshot and the next request sees the change',async()=>{
      const before=await sourceIndex();
      afterQuery=async sql=>{if(sql.includes('where not usable')){afterQuery=undefined;await pool.query("update posts set status='retracted' where id='perf-0000'");}};
      assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1)),before);
      assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1)),await sourceIndex());
      await pool.query("update posts set status='published' where id='perf-0000'");
      await pool.query("update post_tags set tag='nextjs' where id='perf-0000-tag-0'");
      assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1,'Next.js')),await sourceIndex(1,'Next.js'));
      await pool.query("update post_tags set tag='PostgreSQL' where id='perf-0000-tag-0'");await rebuild();
    });
    await t.test('corrupt or missing off-page entries are recomputed, never silently omitted',async()=>{
      const active=(await pool.query('select active_generation from public_read_state')).rows[0].active_generation;
      await pool.query("update public_read_entries set list_payload=jsonb_set(list_payload,'{title}','\"BROKEN_LIST\"') where generation_id=$1 and source_id='perf-0009'",[active]);
      queries.length=0;assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1)),await sourceIndex());assert.equal(bodyReads(),1);
      await pool.query("update public_read_entries set list_payload=jsonb_set(list_payload,'{tags}','42') where generation_id=$1 and source_id='perf-0009'",[active]);
      await pool.query("update public_read_entries set list_hash=public_read_list_hash(result,list_payload) where generation_id=$1 and source_id='perf-0009'",[active]);
      assert.deepEqual(withoutSeries(await loadPublicBlogIndex(1)),await sourceIndex());
      await pool.query("delete from public_read_entries where generation_id=$1 and source_id='perf-0009'",[active]);
      const marker=(await pool.query("select source_epoch,metadata_revision from public_read_state cross join public_read_sources where kind='blog' and source_id='perf-0009'")).rows[0];
      const context=projectionContext(),key=fingerprint([marker.source_epoch,{kind:'blog',source_id:'perf-0009'},marker.metadata_revision,'perf-0009-v1',context.manifest,context.policyFingerprint]);
      const other=await pool.connect();
      try {
        await other.query('begin');await other.query('select pg_advisory_xact_lock(hashtextextended($1,710493709))',[key]);
        queries.length=0;await assert.rejects(loadPublicBlogIndex(1),/projection_busy/);assert.equal(bodyReads(),0);
      } finally {await other.query('rollback');other.release();}
      queries.length=0;
      const concurrent=await Promise.all(Array.from({length:8},()=>loadPublicBlogIndex(1)));
      for(const result of concurrent)assert.deepEqual(withoutSeries(result),await sourceIndex());
      assert.equal(bodyReads(),1,'eight cold misses share one original computation');
      await rebuild();
    });
    await t.test('a thumbnail appearing or disappearing after rebuild is checked on each response',async()=>{
      const bytes=Buffer.from('owned thumbnail '+randomUUID()),hash=createHash('sha256').update(bytes).digest('hex');
      const src='/blog-assets/thumbnails/'+hash+'.png',path=join(process.cwd(),'public',src);
      await pool.query(`insert into post_assets(id,post_id,post_version_id,type,path,alt,status,asset_hash,verified_at,generated_by,created_at)
        values('list-thumbnail','perf-0000','perf-0000-v1','image',$1,'검수 그림','ready',$2,now(),'fixture',now())`,[src,hash]);
      await runLocalProjection(pool,{command:'rebuild',kind:'all',confirmOwnedLocal:true});
      assert.equal((await loadPublicBlogIndex(1)).posts[0].thumbnail,undefined);
      await mkdir(join(process.cwd(),'public/blog-assets/thumbnails'),{recursive:true});
      try {
        await writeFile(path,bytes,{flag:'wx'});
        assert.deepEqual((await loadPublicBlogIndex(1)).posts[0].thumbnail,{src,alt:'검수 그림'});
        await writeFile(path,'corrupt');
        assert.equal((await loadPublicBlogIndex(1)).posts[0].thumbnail,undefined);
      } finally {await unlink(path);await pool.query("delete from post_assets where id='list-thumbnail'");}
    });
    await t.test('unsupported state, missing markers, changed policy and DB failure fail closed',async()=>{
      await rebuild();
      const blocked=projectionContext({restrictedTerms:[{category:'organization_name',value:'합성 검수'}]});
      assert.equal((await readPublicBlogList(pool,{},blocked,'projected')).pagination.totalItems,0);
      await pool.query('update public_read_state set writer_protocol=99');
      await assert.rejects(loadPublicBlogIndex(1),/projection_unavailable/);
      await pool.query('update public_read_state set writer_protocol=1');
      await pool.query("delete from public_read_sources where kind='blog' and source_id='perf-0000'");
      await assert.rejects(loadPublicBlogIndex(1),/projection_marker_missing/);
      await pool.query("update posts set updated_at=updated_at+interval '1 millisecond' where id='perf-0000'");
      for(const table of ['posts','public_read_entries']){
        await pool.query(`alter table ${table} rename to unavailable_table`);
        try{await assert.rejects(loadPublicBlogIndex(1));}finally{await pool.query(`alter table unavailable_table rename to ${table}`);}
      }
      const original=(await pool.query("select content_markdown from post_versions where id='perf-0000-v1'")).rows[0].content_markdown;
      await pool.query("update post_versions set content_markdown=repeat('x',1048576) where id='perf-0000-v1'");
      queries.length=0;await assert.rejects(loadPublicBlogIndex(1),/projection_fallback_limit/);assert.equal(bodyReads(),0);
      await pool.query("update post_versions set content_markdown=$1 where id='perf-0000-v1'",[original]);await rebuild();
    });
    await t.test('1000 posts and eight concurrent readers stay bounded',async()=>{
      const large=makeBlogFixture(1000),existing=new Set((await pool.query('select id from posts')).rows.map(r=>r.id));
      for(const post of large.posts.filter(p=>!existing.has(p.id)))for(const version of large.versions.filter(v=>v.postId===post.id))
        await repo.savePost({post:{...post,currentVersionId:version.id},version,tags:large.tags.filter(v=>v.postId===post.id),sources:large.sources.filter(v=>v.postId===post.id),assets:[],publishJobs:[]});
      await pool.query("update posts set current_version_id=id||'-v1'");await rebuild();
      const expected=await sourceIndex();await loadPublicBlogIndex(1);queries.length=0;
      const cpu=process.cpuUsage(),samples=[];
      for(let batch=0;batch<4;batch++)await Promise.all(Array.from({length:8},async()=>{
        const start=performance.now(),result=await loadPublicBlogIndex(1);samples.push(performance.now()-start);assert.deepEqual(withoutSeries(result),expected);
      }));
      assert.equal(bodyReads(),0);assert.equal(queries.length,96);
      const transferred=queries.reduce((n,q)=>n+Buffer.byteLength(JSON.stringify(q.rows)),0);
      assert(transferred/32<15000);const used=process.cpuUsage(cpu);
      console.log('projected list benchmark '+JSON.stringify({posts:1000,requests:32,concurrency:8,latencyMs:statistics(samples,true),sqlPerRequest:queries.length/32,returnedBytesPerRequest:transferred/32,cpuMs:(used.user+used.system)/1000,rssBytes:process.memoryUsage().rss}));
      const query=queries.find(q=>q.sql.includes('replacements as'));
      const client=await pool.connect();
      try {
        await client.query('begin');await client.query('analyze');
        const explain=async()=>{
          const plans=[];
          for(let i=0;i<5;i++)plans.push((await client.query('explain (analyze,buffers,format json) '+query.sql,query.args)).rows[0]['QUERY PLAN'][0]);
          const indexes=new Set();const scan=node=>{if(node['Index Name'])indexes.add(node['Index Name']);for(const child of node.Plans??[])scan(child);};scan(plans[4].Plan);
          return {executionMs:statistics(plans.map(p=>p['Execution Time'])),sharedHitBlocks:plans[4].Plan['Shared Hit Blocks'],tempWrittenBlocks:plans[4].Plan['Temp Written Blocks'],indexes:[...indexes]};
        };
        const existing=await explain();
        await client.query("create index list_candidate on posts(published_at desc,id) include(current_version_id,slug,updated_at) where status='published'");
        const candidate=await explain();
        console.log('projected list explain '+JSON.stringify({existing,candidate}));
      } finally {await client.query('rollback');client.release();}
      await assertWarmDetail();
      await pool.query("delete from public_read_entries where generation_id=(select active_generation from public_read_state) and source_id in (select id from posts where status='published' order by id limit 11)");
      queries.length=0;await assert.rejects(loadPublicBlogIndex(1),/projection_fallback_limit/);assert.equal(bodyReads(),0);
      await assert.rejects(loadPublicBlogDetail('perf-0999'), /projection_fallback_limit/);
      assert.equal(await loadPublicBlogDetail('perf-draft'), undefined);
      await pool.query('update public_read_state set active_generation=null');
      await assert.rejects(loadPublicBlogIndex(1),/projection_fallback_limit/);
      assert.equal((await readPublicBlogList(pool,{},projectionContext(),'source')).pagination.totalItems,1000);
    });
  } finally {
    if(oldPool===undefined)delete globalThis.hlogBlogPublicPool;else globalThis.hlogBlogPublicPool=oldPool;
    if(oldMode===undefined)delete process.env.HLOG_PUBLIC_READ_MODEL;else process.env.HLOG_PUBLIC_READ_MODEL=oldMode;
    await pool.end();await admin.query(`drop database ${name}`);await admin.end();
  }
});
