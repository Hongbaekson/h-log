import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, readdir, unlink, rmdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { buildProvisioning, buildDashboard } from './observability-config.mjs';

const execute=promisify(execFile),app=resolve(import.meta.dirname,'..'),project='hlog-observe-alerts-local';
const docker=async args=>(await execute('docker',args,{cwd:app,windowsHide:true,timeout:180000,maxBuffer:2*1024*1024})).stdout.trim();
async function eventually(check,timeout=120000){let last;const end=Date.now()+timeout;while(Date.now()<end){try{return await check();}catch(e){last=e;}await delay(1000);}throw last;}

test('real Grafana provisions, preserves firing on missing data and delivers only safe mock notifications',{skip:process.env.HLOG_OBSERVABILITY_ALERTS_SMOKE!=='1',timeout:900000},async()=>{
  for(const kind of ['container','volume','network'])assert.equal(await docker([kind,'ls','-q','--filter',`label=com.docker.compose.project=${project}`]),'');
  const scratch=await mkdtemp(resolve(tmpdir(),'hlog-alerts-')),path=name=>resolve(scratch,name).replaceAll('\\','/');
  await chmod(scratch,0o700);
  if(process.platform==='win32')await execute('icacls',[scratch,'/inheritance:r','/grant:r',`${process.env.USERNAME}:(OI)(CI)F`]);
  const password=randomBytes(24).toString('hex'),oldPassword=process.env.HLOG_GRAFANA_PASSWORD_FILE,oldPort=process.env.HLOG_GRAFANA_PORT;
  const compose=['compose','-p',project,'-f','compose.observability.yaml','-f','compose.observability-alerts.yaml','-f',path('compose.json'),'--profile','observability'];
  let preserve=false;
  try {
    await writeFile(path('password'),password,{mode:0o444});process.env.HLOG_GRAFANA_PASSWORD_FILE=path('password');process.env.HLOG_GRAFANA_PORT='3037';
    await writeFile(path('mode'),'normal');await writeFile(path('events.jsonl'),'');
    const nodeImage=(await readFile(resolve(app,'Dockerfile'),'utf8')).match(/^FROM (node:[^\s]+)/m)[1];
    const provision=buildProvisioning();
    // Accelerated test clock only; production 60s evaluation, for durations and 24h reminder stay in source.
    provision.groups[0].interval='10s';for(const r of provision.groups[0].rules)if(r.for!=='0s')r.for='20s';
    provision.policies[0].group_wait='1s';provision.policies[0].group_interval='10s';provision.policies[0].repeat_interval='30s';
    for(const route of [provision.policies[0].routes[0],provision.policies[0].routes[0].routes[0]]){route.group_wait='1s';route.group_interval='10s';route.repeat_interval='30s';}
    await writeFile(path('alerts.json'),JSON.stringify(provision));
    await writeFile(path('datasource.json'),JSON.stringify({apiVersion:1,datasources:[{name:'H-Log Prometheus',uid:'hlog-prometheus',type:'prometheus',access:'proxy',url:'http://fixture:8080/prom',isDefault:true,editable:false,jsonData:{httpMethod:'POST',timeInterval:'1s'}}]}));
    await writeFile(path('prometheus.json'),JSON.stringify({global:{scrape_interval:'1s',evaluation_interval:'1s'},scrape_configs:[{job_name:'fixture',honor_labels:true,static_configs:[{targets:['fixture:8080']}]}]}));
    await writeFile(path('compose.json'),JSON.stringify({services:{
      prometheus:{volumes:[`${path('prometheus.json')}:/etc/prometheus/prometheus.yml:ro`]},
      grafana:{environment:{GF_UNIFIED_ALERTING_MIN_INTERVAL:'10s',GF_UNIFIED_ALERTING_EXECUTE_ALERTS:'true'},volumes:[`${path('datasource.json')}:/etc/grafana/provisioning/datasources/prometheus.yml:ro`,`${path('alerts.json')}:/etc/grafana/provisioning/alerting/hlog.json:ro`]},
      fixture:{image:nodeImage,user:'node',read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],networks:['monitoring_net'],volumes:[`${resolve(app,'scripts/observability-alerts.fixture.mjs').replaceAll('\\','/')}:/fixture.mjs:ro`,`${scratch.replaceAll('\\','/')}:/fixture`],command:['node','/fixture.mjs'],mem_limit:'96m',cpus:0.2},
    }}));
    await docker([...compose,'config','--quiet']);
    await docker([...compose,'run','--rm','--no-deps','--entrypoint','promtool','prometheus','check','config','/etc/prometheus/prometheus.yml']);
    await docker([...compose,'up','-d','--wait','--wait-timeout','120']);
    const inspect=async service=>JSON.parse(await docker(['inspect',await docker([...compose,'ps','-q',service])]))[0];
    const grafana=await inspect('grafana');
    assert.deepEqual(grafana.HostConfig.PortBindings,{});
    assert.equal(grafana.HostConfig.LogConfig.Type,'none');
    const origin='http://127.0.0.1:3037',authorization=`Basic ${Buffer.from('owner:'+password).toString('base64')}`;
    const api=async url=>{const r=await fetch(origin+url,{headers:{authorization},signal:AbortSignal.timeout(10000)});assert.equal(r.status,200,url);return r.json();};
    const states=async()=> (await api('/api/prometheus/grafana/api/v1/rules')).data.groups.flatMap(g=>g.rules);
    const state=async uid=>(await states()).find(r=>r.uid===uid||r.name===provision.groups[0].rules.find(x=>x.uid===uid).title);
    const events=async()=> (await readFile(path('events.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
    const eventCount=async(signal,status)=>(await events()).filter(e=>e.signal===signal&&e.status===status).length;
    const mode=async value=>writeFile(path('mode'),value);
    const live=await api('/api/v1/provisioning/alert-rules');assert.equal(live.length,provision.groups[0].rules.length);
    await eventually(async()=>assert.equal((await api('/api/dashboards/uid/hlog-operations')).dashboard.panels.length,buildDashboard().panels.length));
    assert.deepEqual((await api('/api/v1/provisioning/policies')).routes[0].mute_time_intervals,['hlog-delivery-disabled']);
    console.log(`PASS: actual dashboard and ${live.length} Grafana-managed rules provisioned; delivery muted by default`);
    provision.contactPoints[0].receivers[0].settings.url='http://fixture:8080/notify';
    for(const route of [provision.policies[0].routes[0],provision.policies[0].routes[0].routes[0]]) delete route.mute_time_intervals;
    await writeFile(path('alerts.json'),JSON.stringify(provision));
    await docker([...compose,'up','-d','--force-recreate','--no-deps','grafana']);
    await eventually(()=>api('/api/health'));
    await eventually(async()=>assert.equal((await state('hlog-http-blog')).state,'inactive'));
    await mode('fault');
    await eventually(async()=>assert.equal((await state('hlog-http-blog')).state,'pending'));
    await eventually(async()=>assert.equal((await state('hlog-http-blog')).state,'firing'));
    await eventually(async()=>assert.equal(await eventCount('http-blog','firing'),1));
    await delay(12000);assert.equal(await eventCount('http-blog','firing'),1,'duplicate suppressed before repeat');
    await eventually(async()=>assert((await eventCount('http-blog','firing'))>=2));
    await mode('nodata');
    await eventually(async()=>assert((await events()).some(e=>e.signal==='DatasourceNoData'&&e.status==='firing')));
    assert.equal(await eventCount('http-blog','resolved'),0);
    await mode('error');
    await eventually(async()=>assert((await events()).some(e=>e.signal==='DatasourceError'&&e.status==='firing')));
    assert.equal(await eventCount('http-blog','resolved'),0);
    await mode('partial');
    await eventually(async()=>assert((await eventCount('scrape','firing'))>0));
    assert.equal(await eventCount('http-blog','resolved'),0,'missing individual series must not evict and resolve the business alert');
    await mode('normal');
    await eventually(async()=>assert((await eventCount('http-blog','resolved'))>0));
    if(process.env.HLOG_OBSERVABILITY_MATRIX==='1') {
      const matrix=[];
      for(const [fault,signal] of [['disk','disk-critical'],['tls','tls-blog-critical'],['lease','expired-lease'],['stale','stale-db'],['never','autopublish-deadline'],['backup-broken','backup-failure'],['restore-broken','restore-failure']]) {
        const before=(await events()).length,started=Date.now();
        const matching=async status=>(await events()).slice(before).filter(e=>e.signal===signal&&e.status===status);
        await mode(fault);
        await eventually(async()=>assert.equal((await state('hlog-'+signal)).state,'firing'));
        await eventually(async()=>assert((await matching('firing')).length>0));
        const firingMs=Date.now()-started,count=(await matching('firing')).length;
        assert(firingMs<=120000,'firing and mock delivery exceeded the bound');
        await delay(12000);assert.equal((await matching('firing')).length,count);
        await mode('normal');await eventually(async()=>assert((await matching('resolved')).length>0));
        matrix.push({fault,signal,input:'bounded synthetic metrics; real PromQL/Grafana/mock',firingBoundMs:120000,firingMs,mockFiring:true,duplicateSuppressed:true,mockResolved:true});
        console.log(`PASS: bounded ${fault}, mock firing/dedup/resolution`);
      }
      await mkdir(resolve(app,'private/observe-step6'),{recursive:true});
      await writeFile(resolve(app,'private/observe-step6/synthetic-failures.json'),JSON.stringify(matrix,null,2));
    }
    for(const event of await events()) {
      assert.deepEqual(Object.keys(event).sort(),['observed_at','runbook','service','severity','signal','status']);
      assert.doesNotMatch(JSON.stringify(event),new RegExp(`${password}|PRIVATE_QUERY_ERROR|fixture:|prometheus:|generatorURL|datasource_uid`));
    }
    const firstId=grafana.Id;await docker([...compose,'up','-d','--force-recreate','--no-deps','grafana']);
    await eventually(async()=>assert.equal((await api('/api/dashboards/uid/hlog-operations')).dashboard.uid,'hlog-operations'));
    assert.notEqual((await inspect('grafana')).Id,firstId);
    assert.equal((await api('/api/v1/provisioning/alert-rules')).length,live.length);
    console.log('PASS: provisioning, pending/firing, dedup/reminder, NoData/Error and missing-series retention, fresh resolved, safe webhook and recreation');
    if(process.env.HLOG_OBSERVABILITY_KEEP_PREVIEW==='1') {
      await mkdir(resolve(app,'private/observe-step5'),{recursive:true});
      await writeFile(resolve(app,'private/observe-step5/preview.json'),JSON.stringify({origin,scratch,compose,passwordFile:path('password')}));
      preserve=true;console.log('Preview retained for desktop/mobile verification; cleanup recipe is private/observe-step5/preview.json');
    }
  } catch(error) {
    await mkdir(resolve(app,'private/observe-step5'),{recursive:true});
    const logs=await docker([...compose,'logs','--no-color','grafana']).catch(()=> 'logs unavailable');
    await writeFile(resolve(app,'private/observe-step5/last-error.log'),logs.replaceAll(password,'[redacted]'));
    await writeFile(resolve(app,'private/observe-step5/last-events.jsonl'),await readFile(path('events.jsonl'),'utf8'));
    throw error;
  } finally {
    if(!preserve) {
      await docker([...compose,'down','--volumes','--timeout','15']);
      for(const name of await readdir(scratch))await unlink(resolve(scratch,name));await rmdir(scratch);
    }
    for(const [key,value]of [['HLOG_GRAFANA_PASSWORD_FILE',oldPassword],['HLOG_GRAFANA_PORT',oldPort]])if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
