import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFile,writeFile,mkdir,unlink,rmdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
assert.equal(process.env.HLOG_OBSERVABILITY_RECOVERY,'1','explicit local recovery rehearsal opt-in required');
const execute=promisify(execFile),app=resolve(import.meta.dirname,'..'),dir=resolve(app,'private/observe-step6');
const descriptor=JSON.parse(await readFile(resolve(dir,'stack.json'),'utf8'));
assert.equal(descriptor.project,'hlog-observe-probes-local');
const origin=new URL(descriptor.origin);assert.equal(origin.hostname,'127.0.0.1');assert.equal(origin.protocol,'http:');
const environment={...process.env,...descriptor.environment,HLOG_GRAFANA_PORT:origin.port};
const docker=async args=>(await execute('docker',args,{cwd:app,env:environment,windowsHide:true,timeout:180000,maxBuffer:2*1024**2})).stdout.trim();
const ids=()=>docker(['ps','-aq','--filter',`label=com.docker.compose.project=${descriptor.project}`]).then(s=>s.split(/\s+/).filter(Boolean));
assert.deepEqual((await ids()).sort(),descriptor.ids.sort());
const containers=JSON.parse(await docker(['inspect',...descriptor.ids]));
const source=name=>containers.find(c=>c.Config.Labels['com.docker.compose.service']===name);
const secret=(await readFile(descriptor.passwordFile,'utf8')).trim();
const api=async (route,options={})=>{const r=await fetch(descriptor.origin+route,{...options,headers:{authorization:'Basic '+Buffer.from('owner:'+secret).toString('base64'),'content-type':'application/json'},signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);return r.json();};
const time=Math.floor(Date.now()/1000)-120;
const route='/api/datasources/proxy/uid/hlog-prometheus/api/v1/query?'+new URLSearchParams({query:'up{job="prometheus"}',time:String(time)});
const before=(await api(route)).data.result;assert.equal(before.length,1);
// Provisioned dashboards would be recreated even from an empty DB. This marker
// exists only in Grafana storage and therefore proves an actual data restore.
const marker='Cold recovery '+Date.now();
await api('/api/dashboards/db',{method:'POST',body:JSON.stringify({dashboard:{uid:'hlog-recovery-proof',title:marker,schemaVersion:41,panels:[]}})});
const composeFile=descriptor.compose[descriptor.compose.indexOf('--profile')-1];
assert.equal(composeFile.replaceAll('\\','/'),resolve(descriptor.scratch,'compose.json').replaceAll('\\','/'));
const original=await readFile(composeFile,'utf8'),config=JSON.parse(original);
const backup=resolve(descriptor.scratch,'volume-backup');await mkdir(backup);
const image=(await readFile(resolve(app,'Dockerfile'),'utf8')).match(/^FROM (node:[^\s]+)/m)[1];
const owned=[];let switched=false,complete=false;
try{
  await docker([...descriptor.compose,'stop','prometheus','grafana']);
  for(const [name,target] of [['prometheus','/prometheus'],['grafana','/var/lib/grafana']]){
    const old=source(name).Mounts.find(m=>m.Destination===target).Name;
    const key='recovered_'+name,newName=descriptor.project+'_'+key;
    assert(!(await docker(['volume','ls','-q'])).split('\n').includes(newName),'must not adopt an existing volume');
    await docker(['volume','create','--label',`com.docker.compose.project=${descriptor.project}`,'--label',`com.docker.compose.volume=${key}`,newName]);
    owned.push({name,newName,old});
    const prefix=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','DAC_OVERRIDE','--cap-add','FOWNER','--security-opt','no-new-privileges','--user','0:0','--mount',`type=bind,source=${backup},target=/backup`];
    await docker([...prefix,'--mount',`type=volume,source=${old},target=/data,readonly`,'--entrypoint','tar',image,'-cf',`/backup/${name}.tar`,'-C','/data','.']);
    await docker([...prefix,'--mount',`type=volume,source=${newName},target=/data`,'--entrypoint','tar',image,'-xpf',`/backup/${name}.tar`,'-C','/data']);
    config.volumes[key]={name:newName};
    config.services[name].volumes.push(`${key}:${target}`);
  }
  await writeFile(composeFile,JSON.stringify(config));switched=true;
  await docker([...descriptor.compose,'up','-d','--no-deps','--force-recreate','prometheus','grafana']);
  let last;
  for(let i=0;i<120;i++){try{assert.deepEqual((await api(route)).data.result,before);assert.equal((await api('/api/dashboards/uid/hlog-operations')).dashboard.uid,'hlog-operations');assert.equal((await api('/api/dashboards/uid/hlog-recovery-proof')).dashboard.title,marker);assert.equal((await api('/api/v1/provisioning/alert-rules')).length,43);const rules=(await api('/api/prometheus/grafana/api/v1/rules')).data.groups.flatMap(g=>g.rules);assert.equal(rules.length,43);assert(rules.every(r=>r.state==='inactive'&&r.health==='ok'));last=undefined;break;}catch(error){last=error;await delay(1000);}}
  if(last)throw last;
  await api('/api/dashboards/uid/hlog-recovery-proof',{method:'DELETE'});
  descriptor.ids=await ids();await writeFile(resolve(dir,'stack.json'),JSON.stringify(descriptor,null,2));
  complete=true;
  for(const item of owned)await docker(['volume','rm',item.old]);
  await writeFile(resolve(dir,'volume-recovery.json'),JSON.stringify({verifiedAt:new Date().toISOString(),fixedQueryTimestamp:time,historicalSampleRestored:true,dashboardRestored:true,unprovisionedMarkerRestored:true,ruleCount:43,newVolumes:true,oldVolumesRemoved:true},null,2));
  console.log('PASS: cold archives restored into NEW Prometheus/Grafana volumes; historical sample and dashboard/rules match');
}finally{
  if(!complete){
    if(switched)await writeFile(composeFile,original);
    await docker([...descriptor.compose,'up','-d','--no-deps','--force-recreate','prometheus','grafana']);
    for(const item of owned)await docker(['volume','rm',item.newName]);
    descriptor.ids=await ids();await writeFile(resolve(dir,'stack.json'),JSON.stringify(descriptor,null,2));
  }
  for(const name of ['prometheus','grafana'])await unlink(resolve(backup,name+'.tar')).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await rmdir(backup);
}
