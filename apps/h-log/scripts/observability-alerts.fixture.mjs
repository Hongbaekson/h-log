import { createServer } from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function fixtureMetrics(now, mode='normal') {
  const values={};
  for(const job of ['prometheus','hlog','host','database','probe-exporter']) values[`up{job="${job}"}`]=1;
  for(const target of ['home','blog']) {
    values[`up{job="http",target="${target}"}`]=1;
    if(mode!=='partial' || target!=='blog')values[`probe_success{target="${target}"}`]=Number(mode!=='fault'||target!=='blog');
    values[`probe_duration_seconds{target="${target}"}`]=0.1;
    values[`probe_ssl_earliest_cert_expiry{target="${target}"}`]=now+30*86400;
  }
  values.pg_up=1; values['node_cpu_seconds_total{cpu="0",mode="idle"}']=now;
  values.node_memory_MemAvailable_bytes=500; values.node_memory_MemTotal_bytes=1000;
  for(const [name,value] of [['avail_bytes',500],['size_bytes',1000],['files_free',500],['files',1000]]) values[`node_filesystem_${name}{mountpoint="docker-data"}`]=value;
  for(const source of ['db','expectations','autopublish','backup','restore']) {
    values[`hlog_metrics_collection_success{source="${source}"}`]=1;
    values[`hlog_metrics_collected_timestamp_seconds{source="${source}"}`]=now;
    values[`hlog_metrics_source_state{source="${source}",state="missing"}`]=0;
  }
  values.hlog_db_connections=1;values.hlog_db_max_connections=100;values.hlog_db_waiting_locks=0;
  values['hlog_publish_jobs{importance="required",state="succeeded"}']=6;
  values['hlog_publish_oldest_pending_age_seconds{importance="required"}']=0;
  values['hlog_publish_pending_age_unknown_jobs{importance="required"}']=0;
  values['hlog_publish_expired_leases{importance="required"}']=0;
  for(const task of ['autopublish','backup','restore']) {
    values[`hlog_batch_result{task="${task}",result="succeeded"}`]=1;
    values[`hlog_schedule_expected_enabled{task="${task}"}`]=0;
    values[`hlog_schedule_enabled_timestamp_seconds{task="${task}"}`]=0;
    values[`hlog_schedule_maintenance_from_timestamp_seconds{task="${task}"}`]=0;
    values[`hlog_schedule_maintenance_until_timestamp_seconds{task="${task}"}`]=0;
    if(task==='autopublish') {
      values.hlog_autopublish_last_attempt_timestamp_seconds=now-60;
      values.hlog_autopublish_last_success_timestamp_seconds=now-30;
      values.hlog_autopublish_last_success_slot_timestamp_seconds=0;
    } else {
      values[`hlog_batch_last_attempt_timestamp_seconds{task="${task}"}`]=now-60;
      values[`hlog_batch_last_success_timestamp_seconds{task="${task}"}`]=now-30;
    }
  }
  for(const window of ['day','month']) {
    values[`hlog_usage_known_cost_usd{window="${window}"}`]=0.1;
    values[`hlog_usage_budget_ratio{window="${window}"}`]=0.1;
    values[`hlog_usage_unknown_events{window="${window}"}`]=0;
    values[`hlog_usage_included_events{window="${window}"}`]=1;
    values[`hlog_usage_budget_state{window="${window}",state="limited"}`]=1;
  }
  return values;
}

if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  createServer(async(req,res)=>{
    try {
      const mode=(await readFile('/fixture/mode','utf8')).trim();
      if(req.url==='/metrics') {
        res.setHeader('Content-Type','text/plain');
        res.end(Object.entries(fixtureMetrics(Date.now()/1000,mode)).map(([key,value])=>`${key} ${value}`).join('\n')+'\n');
      } else if(req.url==='/notify' && req.method==='POST') {
        let bytes=0,text='';for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw Error('too large');text+=chunk;}
        const value=JSON.parse(text);
        await appendFile('/fixture/events.jsonl',JSON.stringify(value)+'\n');res.end('ok');
      } else if(req.url.startsWith('/prom/')) {
        if(mode==='nodata') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'success',data:{resultType:'vector',result:[]}}));return;}
        if(mode==='error') {res.writeHead(503).end('PRIVATE_QUERY_ERROR');return;}
        const body=[];for await(const chunk of req)body.push(chunk);
        const result=await fetch('http://prometheus:9090'+req.url.slice(5),{method:req.method,body:body.length?Buffer.concat(body):undefined,headers:{'Content-Type':req.headers['content-type']??'application/x-www-form-urlencoded'}});
        res.writeHead(result.status,{'Content-Type':'application/json'}).end(await result.text());
      } else res.writeHead(404).end();
    } catch {res.writeHead(500).end('fixture_failed');}
  }).listen(8080,'0.0.0.0');
}
