import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, unlink, rmdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildProvisioning, buildDashboard } from './observability-config.mjs';
import { fixtureMetrics } from './observability-alerts.fixture.mjs';

test('bounded rehearsal signals cover capacity, expiry, deadlines, leases and broken batches', () => {
  assert.equal(fixtureMetrics(200000, 'disk')['node_filesystem_avail_bytes{mountpoint="docker-data"}'], 1);
  assert.equal(fixtureMetrics(200000, 'tls')['probe_ssl_earliest_cert_expiry{target="blog"}'], 200000 + 2 * 86400);
  assert.equal(fixtureMetrics(200000, 'lease')['hlog_publish_expired_leases{importance="required"}'], 1);
  assert.equal(fixtureMetrics(200000, 'stale')['hlog_metrics_collected_timestamp_seconds{source="db"}'], 199819);
  assert.equal(fixtureMetrics(200000, 'never')['hlog_schedule_expected_enabled{task="autopublish"}'], 1);
  for (const task of ['backup', 'restore']) assert.equal(fixtureMetrics(200000, task + '-broken')[`hlog_batch_result{task="${task}",result="failed"}`], 1);
});

test('provisioned rules preserve unknown states and use bounded private notification policy', () => {
  const config=buildProvisioning(), rules=config.groups[0].rules;
  assert.equal(config.groups[0].interval,'60s');
  assert(rules.length>=25);
  assert.equal(new Set(rules.map(r=>r.uid)).size,rules.length);
  for(const rule of rules) {
    assert.deepEqual(Object.keys(rule.labels).sort(),['rule','service','severity']);
    assert.equal(rule.condition,'B');
    assert.equal(rule.noDataState,rule.uid==='hlog-query-health'?'NoData':'KeepLast');
    assert.equal(rule.execErrState,rule.uid==='hlog-query-health'?'Error':'KeepLast');
  }
  const policy=config.policies[0];
  assert.deepEqual(policy.group_by,['service','rule','severity']);
  assert.equal(policy.group_wait,'30s'); assert.equal(policy.group_interval,'5m'); assert.equal(policy.repeat_interval,'24h');
  assert.equal(config.contactPoints[0].receivers[0].settings.url,'http://127.0.0.1:9/hlog-disabled');
  assert.deepEqual(policy.routes[0].mute_time_intervals,['hlog-delivery-disabled']);
  assert.deepEqual(policy.routes[0].routes[0].mute_time_intervals,['hlog-delivery-disabled']);
  const dashboard=buildDashboard();
  assert.equal(dashboard.timezone,'Asia/Seoul');
  assert.equal(dashboard.panels.filter(p=>p.type==='row').length,4);
  for(const panel of dashboard.panels.filter(p=>p.targets)) assert(panel.description.includes('60초') && panel.fieldConfig.defaults.unit);
});

test('checked-in provisioning matches its source',async()=>{
  for(const [file,value] of [['grafana/provisioning/alerting/hlog.json',buildProvisioning()],['grafana/dashboards/hlog.json',buildDashboard()]]) {
    assert.deepEqual(JSON.parse(await readFile(resolve(import.meta.dirname,'../deploy/observability',file),'utf8')),value);
  }
});

test('real PromQL distinguishes fresh normal, lost series, first deadlines and failures', {skip:process.env.HLOG_OBSERVABILITY_RULES_TEST!=='1',timeout:120000}, async()=>{
  const directory=await mkdtemp(join(tmpdir(),'hlog-promql-')),rules=buildProvisioning().groups[0].rules;
  const normal=fixtureMetrics(600), expr=id=>rules.find(r=>r.uid==='hlog-'+id).data[0].model.expr;
  const sample=(id,value)=>({expr:expr(id),eval_time:'10m',exp_samples:value===undefined?[]:[{labels:'{}',value}]});
  const cases=[];
  const scenario=(values,checks)=>cases.push({interval:'1m',input_series:Object.entries(values).map(([series,value])=>({series,values:series.startsWith('node_cpu_seconds_total')?'0+60x20':`${value}x20`})),promql_expr_test:checks});
  scenario(normal,rules.map(r=>sample(r.labels.rule,0)));
  const fault={...normal,'probe_success{target="blog"}':0,'hlog_publish_jobs{importance="required",state="failed"}':1,'hlog_usage_unknown_events{window="day"}':1};
  scenario(fault,[sample('http-blog',1),sample('required-failed',1),sample('unknown-cost',1)]);
  const partial={...fault};delete partial['probe_success{target="blog"}'];
  scenario(partial,[sample('http-blog',undefined),sample('scrape',1)]);
  const httpOnly={...normal};for(const target of ['home','blog'])delete httpOnly[`probe_ssl_earliest_cert_expiry{target="${target}"}`];
  scenario(httpOnly,[sample('tls-blog-warning',0),sample('scrape',0)]);
  const lostCertificate={interval:'1m',input_series:Object.entries(normal).map(([series,value])=>({series,values:series==='probe_ssl_earliest_cert_expiry{target="blog"}'?`${value}x4 stale _ _ _ _ _`:`${value}x20`})),promql_expr_test:[sample('tls-blog-warning',undefined),sample('scrape',1)]};
  cases.push(lostCertificate);
  const stale={...fault,'hlog_metrics_collected_timestamp_seconds{source="db"}':300};
  scenario(stale,[sample('required-failed',undefined),sample('source-db',0),sample('stale-db',1)]);
  const never={...normal,'hlog_schedule_expected_enabled{task="backup"}':1,'hlog_schedule_deadline_timestamp_seconds{task="backup"}':599,'hlog_metrics_collection_success{source="backup"}':0,'hlog_metrics_source_state{source="backup",state="missing"}':1};
  delete never['hlog_metrics_collected_timestamp_seconds{source="backup"}'];
  for(const key of Object.keys(never))if(key.startsWith('hlog_batch_')&&key.includes('task="backup"'))delete never[key];
  scenario(never,[sample('backup-deadline',1),sample('source-backup',0)]);
  scenario({...never,'hlog_schedule_deadline_timestamp_seconds{task="backup"}':601},[sample('backup-deadline',0)]);
  const lost={...never,'hlog_metrics_collected_timestamp_seconds{source="backup"}':300};
  scenario(lost,[sample('source-backup',1),sample('backup-deadline',undefined)]);
  const maintenance={...normal,'hlog_schedule_expected_enabled{task="restore"}':1,'hlog_schedule_deadline_timestamp_seconds{task="restore"}':90000,'hlog_schedule_maintenance_from_timestamp_seconds{task="restore"}':580,'hlog_schedule_maintenance_until_timestamp_seconds{task="restore"}':660};
  scenario(maintenance,[sample('restore-deadline',0)]);
  scenario({...maintenance,'hlog_schedule_deadline_timestamp_seconds{task="restore"}':500},[sample('restore-deadline',1)]);
  const scheduled=(now, enabled, success, from=0, until=0)=>{
    const values={...fixtureMetrics(now),
      'hlog_schedule_expected_enabled{task="autopublish"}':1,
      'hlog_schedule_enabled_timestamp_seconds{task="autopublish"}':enabled,
      'hlog_schedule_deadline_timestamp_seconds{task="autopublish"}':Math.max(Math.ceil(enabled/86400),Math.floor(now/86400))*86400+1800,
      'hlog_schedule_maintenance_from_timestamp_seconds{task="autopublish"}':from,
      'hlog_schedule_maintenance_until_timestamp_seconds{task="autopublish"}':until,
      hlog_autopublish_last_success_slot_timestamp_seconds:success};
    return {interval:'1m',input_series:Object.entries(values).map(([series,value])=>({series,values:`${value}x${Math.ceil(now/60)+1}`}))};
  };
  for(const [now,enabled,success,from,until,expected] of [
    [88201,86340,0,0,0,1], // 08:59 activation, 09:30 deadline missed.
    [88201,87000,0,0,0,0], // 09:10 activation starts the next day.
    [172801,86340,0,0,0,1], // New daily slot must not resolve yesterday's miss.
    [172801,86340,172800,0,0,0], // New verified success can resolve.
    [174601,86340,0,170000,175000,1], // Maintenance must retain an older miss.
    [174601,86340,86400,170000,175000,0], // Only the maintenance slot is suppressed.
    [261001,86340,86400,170000,175000,1], // First post-maintenance slot is due.
  ]) {
    cases.push({...scheduled(now,enabled,success,from,until),promql_expr_test:[{expr:expr('autopublish-deadline'),eval_time:`${now}s`,exp_samples:[{labels:'{}',value:expected}]}]});
  }
  cases.push({interval:'1m',input_series:[{series:'up{job="http",target="blog"}',values:'1x5'},{series:'probe_success{target="blog"}',values:'0x5'}],alert_rule_test:[
    {eval_time:'1m',alertname:'hlog-http-blog',exp_alerts:[]},
    {eval_time:'3m',alertname:'hlog-http-blog',exp_alerts:[{exp_labels:rules.find(r=>r.uid==='hlog-http-blog').labels,exp_annotations:{}}]},
  ]});
  cases.push({interval:'1s',input_series:[{series:'up{job="hlog"}',values:'1x181'},{series:'hlog_metrics_collected_timestamp_seconds{source="backup"}',values:'0x181'}],promql_expr_test:[
    {expr:expr('stale-backup'),eval_time:'180s',exp_samples:[{labels:'{}',value:0}]},
    {expr:expr('stale-backup'),eval_time:'181s',exp_samples:[{labels:'{}',value:1}]},
  ]});
  try {
    await writeFile(join(directory,'rules.json'),JSON.stringify({groups:[{name:'test',interval:'1m',rules:rules.filter(r=>r.uid==='hlog-http-blog').map(r=>({alert:r.uid,expr:`(${r.data[0].model.expr}) > 0`,for:r.for,labels:r.labels}))}]}));
    await writeFile(join(directory,'tests.json'),JSON.stringify({rule_files:['/fixture/rules.json'],evaluation_interval:'1m',tests:cases}));
    const image=(await readFile(resolve(import.meta.dirname,'../compose.observability.yaml'),'utf8')).match(/image: (prom\/prometheus:[^\s]+)/)[1];
    const result=await promisify(execFile)('docker',['run','--rm','--network','none','--read-only','--tmpfs','/tmp:size=64m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',`type=bind,source=${directory},target=/fixture,readonly`,'--entrypoint','promtool',image,'test','rules','/fixture/tests.json'],{timeout:90000,maxBuffer:200000});
    assert.match(result.stdout,/SUCCESS/);
    console.log(`PASS: ${rules.length} real PromQL rules, freshness/missing/maintenance/first-slot boundaries and pending duration`);
  } finally {await unlink(join(directory,'rules.json')).catch(()=>undefined);await unlink(join(directory,'tests.json')).catch(()=>undefined);await rmdir(directory);}
});
