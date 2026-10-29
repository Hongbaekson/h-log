// Source for provisioned JSON. Regenerate with npm run observability:config.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const datasource={type:'prometheus',uid:'hlog-prometheus'};
export const runbook='https://github.com/Hongbaekson/h-log/blob/main/apps/h-log/deploy/observability/README.md#대응-절차';
const up=job=>`(min(up{job="${job}"}) == 1)`;
const readable=source=>`(${up('hlog')} and on() (min(hlog_metrics_collection_success{source="${source}"}) == 1))`;
export const fresh=source=>`(${readable(source)} and on() (time() - max(hlog_metrics_collected_timestamp_seconds{source="${source}"}) <= 180))`;
const gate=(expression,known)=>`(${expression}) and on() (${known})`;
const sum0=selector=>`(sum(${selector}) or vector(0))`;
const firstMissing=task=>`((max(hlog_metrics_source_state{source="${task}",state="missing"}) == 1) unless on() max(max_over_time(hlog_metrics_collected_timestamp_seconds{source="${task}"}[7d])))`;
const batchKnown=task=>`(${fresh(task)} or (${firstMissing(task)} and on() ${fresh('expectations')}))`;
const select=(metric,task)=>`max(${metric}{task="${task}"})`;
export const cpu='1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))';
export const memory='min(node_memory_MemAvailable_bytes) / min(node_memory_MemTotal_bytes)';

export function buildProvisioning() {
  const rules=[];
  const add=(id,title,expr,hold='0s',severity='warning',service='hlog')=>rules.push({uid:'hlog-'+id,title,condition:'B',for:hold,
    noDataState:id==='query-health'?'NoData':'KeepLast',execErrState:id==='query-health'?'Error':'KeepLast',
    labels:{service,rule:id,severity},annotations:{summary:title,runbook_url:runbook},isPaused:false,
    data:[{refId:'A',datasourceUid:datasource.uid,relativeTimeRange:{from:600,to:0},model:{refId:'A',datasource,expr,instant:true,range:false,intervalMs:60000,maxDataPoints:1}},
      {refId:'B',datasourceUid:'__expr__',relativeTimeRange:{from:0,to:0},model:{refId:'B',type:'math',expression:'$A > 0',datasource:{type:'__expr__',uid:'__expr__'}}}]});
  add('query-health','지표 조회 No Data / Error','1 - min(up{job="prometheus"})','0s','warning','monitoring');
  for(const target of ['home','blog']) add('http-'+target,`${target} 접속 실패`,gate(`1 - min(probe_success{target="${target}"})`,`min(up{job="http",target="${target}"}) == 1`),'2m','critical','web');
  add('database','DB 연결 실패',gate('1 - min(pg_up)',up('database')),'2m','critical','database');
  const scrape=['host','database','hlog','probe-exporter'].map(j=>`(min(up{job="${j}"}) == bool 1) or vector(0)`);
  scrape.push('(count(pg_up) > bool 0) or vector(0)');
  for(const target of ['home','blog']) {
    scrape.push(`((min(up{job="http",target="${target}"}) == bool 1) * (count(probe_success{target="${target}"}) > bool 0)) or vector(0)`);
    scrape.push(`1 - (((count(probe_ssl_earliest_cert_expiry{target="${target}"}) or vector(0)) == bool 0) * ((count(max_over_time(probe_ssl_earliest_cert_expiry{target="${target}"}[7d])) > bool 0) or vector(0)))`);
  }
  add('scrape','수집 대상 누락 / 실패',`1 - (${scrape.map(s=>'('+s+')').join(' * ')})`,'3m','warning','monitoring');
  for(const source of ['db','expectations','autopublish','backup','restore']) {
    const valid=['db','expectations'].includes(source)?readable(source):`(${readable(source)} or (${firstMissing(source)} and on() ${fresh('expectations')}))`;
    add('source-'+source,`${source} 수집 오류 / 누락`,`1 - ((${valid}) or vector(0))`,'3m','warning','monitoring');
    add('stale-'+source,`${source} 수집 시각 180초 초과`,gate(`time() - max(hlog_metrics_collected_timestamp_seconds{source="${source}"}) > bool 180`,up('hlog')),'0s','warning','monitoring');
  }
  add('cpu','CPU 사용률 85% 초과',gate(`(${cpu}) > bool 0.85`,up('host')),'15m','warning','host');
  add('memory','가용 메모리 10% 미만',gate(`(${memory}) < bool 0.1`,up('host')),'10m','warning','host');
  for(const [kind,available,total] of [['disk','avail_bytes','size_bytes'],['inode','files_free','files']]) for(const [severity,limit,hold] of [['warning',0.15,'10m'],['critical',0.05,'5m']]) {
    add(kind+'-'+severity,`${kind} 가용 ${limit*100}% 미만`,gate(`min(node_filesystem_${available}{mountpoint="docker-data"} / node_filesystem_${total}{mountpoint="docker-data"}) < bool ${limit}`,up('host')),hold,severity,'host');
  }
  for(const target of ['home','blog']) for(const [severity,days] of [['warning',14],['critical',3]]) {
    // A successful plain HTTP probe has no certificate: N/A. Failed probes never resolve a prior TLS alert.
    const certificate=`probe_ssl_earliest_cert_expiry{target="${target}"}`;
    add('tls-'+target+'-'+severity,`${target} TLS 만료 ${days}일 미만`,gate(`(min(${certificate}) - time() < bool ${days*86400}) or (vector(0) unless on() max(max_over_time(${certificate}[7d])))`,`min(up{job="http",target="${target}"}) == 1 and on() min(probe_success{target="${target}"}) == 1`),'0s',severity,'web');
  }
  add('connections','DB 연결 한도 80% 초과',gate('max(hlog_db_connections) / max(hlog_db_max_connections) > bool 0.8',fresh('db')),'10m','warning','database');
  add('locks','DB 잠금 대기',gate('max(hlog_db_waiting_locks) > bool 0',fresh('db')),'5m','warning','database');
  add('required-failed','현재 버전 필수 작업 실패',gate(`${sum0('hlog_publish_jobs{importance="required",state="failed"}')} > bool 0`,fresh('db')),'1m');
  add('pending','필수 작업 대기 10분 초과',gate('max(hlog_publish_oldest_pending_age_seconds{importance="required"}) > bool 600',fresh('db')),'5m');
  add('unknown-age','작업 대기 시각 미확인',gate('sum(hlog_publish_pending_age_unknown_jobs) > bool 0',fresh('db')));
  add('expired-lease','만료된 작업 lease',gate('sum(hlog_publish_expired_leases) > bool 0',fresh('db')),'1m');
  for(const task of ['autopublish','backup','restore']) {
    add(task+'-failure',`${task} 최근 실행 실패`,gate(`${sum0(`hlog_batch_result{task="${task}",result=~"failed|interrupted|unverified|budget_blocked"}`)} > bool 0`,batchKnown(task)));
    const attempt=task==='autopublish'?'max(hlog_autopublish_last_attempt_timestamp_seconds)':select('hlog_batch_last_attempt_timestamp_seconds',task);
    add(task+'-running',`${task} 실행 30분 초과`,gate(`${sum0(`hlog_batch_result{task="${task}",result="running"}`)} * ((time() - (${attempt} or vector(time()))) > bool 1800)`,batchKnown(task)));
    const enabled=select('hlog_schedule_expected_enabled',task),deadline=select('hlog_schedule_deadline_timestamp_seconds',task);
    let late=`(time() > bool ${deadline})`;
    if(task==='autopublish') {
      // Last expired 09:30 KST deadline, including yesterday during today's grace period.
      // Skip only slots inside maintenance; an earlier miss remains until verified success.
      const due='floor(vector((time() - 1800) / 86400)) * 86400';
      const from=select('hlog_schedule_maintenance_from_timestamp_seconds',task),until=select('hlog_schedule_maintenance_until_timestamp_seconds',task);
      const inMaintenance=`(${from} > 0) and on() ((${due}) >= ${from}) and on() ((${due}) <= ${until})`;
      const slot=`(((ceil(${from} / 86400) - 1) * 86400 and on() (${inMaintenance})) or ((${due}) unless on() (${inMaintenance})))`;
      late=`(${slot} >= bool (ceil(${select('hlog_schedule_enabled_timestamp_seconds',task)} / 86400) * 86400)) * (${slot} > bool (max(hlog_autopublish_last_success_slot_timestamp_seconds) or vector(0)))`;
    }
    const validity=task==='autopublish'?batchKnown(task):`(${fresh(task)} or ${firstMissing(task)})`;
    // A disabled schedule is explicitly 0. Missing/invalid expectations or an old summary never resolve it.
    add(task+'-deadline',`${task} 예정 성공 누락`,gate(`(${late} * ${enabled}) or (${enabled} == 0)`,`${fresh('expectations')} and on() ${validity}`));
  }
  add('budget','UTC 비용 한도 80% 이상',gate(`${sum0('hlog_usage_budget_ratio >= 0.8')} > bool 0`,fresh('db')),'1m');
  add('unknown-cost','UTC 비용 미확인 기록',gate('sum(hlog_usage_unknown_events) > bool 0',fresh('db')));
  add('invalid-budget','비용 한도 설정 오류',gate(`${sum0('hlog_usage_budget_state{state="invalid"}')} > bool 0`,fresh('db')));
  return {apiVersion:1,groups:[{orgId:1,name:'hlog-operations',folder:'H-Log 운영',interval:'60s',rules}],
    contactPoints:[{orgId:1,name:'hlog-private',receivers:[{uid:'hlog-private-webhook',type:'webhook',disableResolveMessage:false,settings:{url:'http://127.0.0.1:9/hlog-disabled',httpMethod:'POST',payload:{template:'{{ template "hlog.safe" . }}'}}}]}],
    muteTimes:[{orgId:1,name:'hlog-delivery-disabled',time_intervals:[{times:[{start_time:'00:00',end_time:'24:00'}]}]}],
    policies:[{orgId:1,receiver:'hlog-private',group_by:['service','rule','severity'],group_wait:'30s',group_interval:'5m',repeat_interval:'24h',routes:[
      {receiver:'hlog-private',mute_time_intervals:['hlog-delivery-disabled'],routes:[{receiver:'hlog-private',object_matchers:[['alertname','=~','DatasourceNoData|DatasourceError']],group_by:['alertname'],group_wait:'30s',group_interval:'5m',repeat_interval:'24h',mute_time_intervals:['hlog-delivery-disabled']}]}]}],
    templates:[{orgId:1,name:'hlog-safe',template:`{{ define "hlog.safe" }}{"service":"hlog","severity":{{ printf "%q" (or .CommonLabels.severity "warning") }},"signal":{{ if or (eq .CommonLabels.alertname "DatasourceNoData") (eq .CommonLabels.alertname "DatasourceError") }}{{ printf "%q" .CommonLabels.alertname }}{{ else }}{{ printf "%q" .CommonLabels.rule }}{{ end }},"status":{{ printf "%q" .Status }},"observed_at":"{{ if eq .Status "resolved" }}{{ (index .Alerts 0).EndsAt.Format "2006-01-02T15:04:05Z07:00" }}{{ else }}{{ (index .Alerts 0).StartsAt.Format "2006-01-02T15:04:05Z07:00" }}{{ end }}","runbook":"${runbook}"}{{ end }}`}]};
}

export function buildDashboard() {
  const panels=[];let y=0,id=0;
  const row=title=>{panels.push({id:++id,type:'row',title,collapsed:false,gridPos:{x:0,y:y++,w:24,h:1}});};
  const panel=(title,expressions,unit='short',note='',mappings=[])=>{
    const x=panels.at(-1)?.type==='row'||panels.at(-1)?.gridPos.x===12?0:12;
    if(x===0 && panels.at(-1)?.type!=='row') y+=6;
    panels.push({id:++id,type:'stat',title,description:`60초 수집 · 현재 snapshot · Asia/Seoul 표시. ${note} 미수집/오류는 No data, 180초 초과는 stale이며 정상값으로 대체하지 않습니다.`,gridPos:{x,y,w:12,h:6},datasource,
      targets:expressions.map(([expr,legendFormat],i)=>({refId:String.fromCharCode(65+i),expr,legendFormat,datasource,instant:true,range:false})),
      fieldConfig:{defaults:{unit,noValue:'미수집 / 오류',mappings,thresholds:{mode:'absolute',steps:[{color:'blue',value:null}]}},overrides:[]},
      options:{colorMode:'none',graphMode:'none',textMode:'value_and_name',orientation:'auto',reduceOptions:{calcs:['lastNotNull'],fields:'',values:false}}});
  };
  const states=values=>[{type:'value',options:Object.fromEntries(values.map((s,i)=>[i,{text:s}]))}];
  row('01 · 서비스와 수집 상태');
  panel('접속 · DB',[[gate('probe_success',up('http')),'{{target}}'],[gate('pg_up',up('database')),'DB']],'none','현재 probe 상태.',states(['실패','정상']));
  panel('수집 상태', [['hlog_metrics_collection_success','{{source}}']],'none','0은 수집 실패, 1은 읽기 성공. 최근 업무 성공과 다릅니다.',states(['수집 실패','수집 정상']));
  panel('수집 경과', [['time() - hlog_metrics_collected_timestamp_seconds','{{source}}']],'s','180초 넘으면 stale. 업무 상태와 함께 확인합니다.');
  panel('HTTP 응답 · TLS 남은 기간',[['probe_duration_seconds','{{target}} 응답'],['probe_ssl_earliest_cert_expiry - time()','{{target}} 인증서']],'s','HTTP 방식의 TLS 부재는 해당 없음. 응답 시간은 synthetic probe입니다.');
  y+=6;row('02 · 서버와 DB');
  panel('CPU · 가용 메모리',[[gate(cpu,up('host')),'CPU 사용률 · 5분 rate'],[gate(memory,up('host')),'가용 메모리']],'percentunit');
  panel('저장 공간 · inode',[[gate('node_filesystem_avail_bytes / node_filesystem_size_bytes',up('host')),'{{mountpoint}} 공간'],[gate('node_filesystem_files_free / node_filesystem_files',up('host')),'{{mountpoint}} inode']],'percentunit','Docker data filesystem만 측정합니다.');
  panel('DB 연결',[[gate('hlog_db_connections',fresh('db')),'전체 연결'],[gate('hlog_db_max_connections',fresh('db')),'연결 상한']],'short');
  panel('DB 잠금 대기',[[gate('hlog_db_waiting_locks',fresh('db')),'대기 lock']],'short');
  y+=6;row('03 · 발행과 비용');
  panel('현재 버전 작업',[[gate('sum by (state) (hlog_publish_jobs)',fresh('db')),'{{state}}']],'short','과거 버전 실패 합계가 아닙니다.');
  panel('필수 작업 대기',[[gate('hlog_publish_oldest_pending_age_seconds{importance="required"}',fresh('db')),'최초 대기 후']],'s','시각 미상은 0초가 아닙니다.');
  panel('알려진 비용 하한',[[gate('hlog_usage_known_cost_usd',fresh('db')),'UTC {{window}}']],'currencyUSD','UTC day/month 집계. 구독료 총액이 아닙니다.');
  panel('비용 미확인 · 구독 포함',[[gate('hlog_usage_unknown_events',fresh('db')),'미확인 {{window}}'],[gate('hlog_usage_included_events',fresh('db')),'included {{window}}']],'short','UTC day/month. Unknown과 known 금액은 겹칠 수 있습니다.');
  panel('비용 한도 비율',[[gate('hlog_usage_budget_ratio',fresh('db')),'UTC {{window}}']],'percentunit','양수 유한 한도만 표시. zero/unlimited에서는 해당 없음.');
  panel('비용 정책',[[gate('hlog_usage_budget_state == 1',fresh('db')),'{{window}} · {{state}}']],'none','zero=명시적 차단, unlimited=미설정, invalid=설정 오류.');
  panels.at(-1).options.textMode='name';
  panels.at(-1).options.text={titleSize:16,valueSize:18};
  panels.at(-1).options.orientation='horizontal';
  panel('일정 허용',[[gate('hlog_schedule_expected_enabled',fresh('expectations')),'{{task}}']],'none','실제 timer 프로세스 상태가 아닌 승인된 기대 상태.',states(['비활성','활성']));
  panel('최근 실행 결과',['autopublish','backup','restore'].map(task=>[gate(`hlog_batch_result{task="${task}"} == 1`,fresh(task)),'{{task}} · {{result}}']),'none','summary가 없으면 아직 미실행/N/A. 각 source 수집 경과를 함께 확인합니다.');
  panels.at(-1).options.textMode='name';
  panels.at(-1).options.text={titleSize:16,valueSize:18};
  panels.at(-1).options.orientation='horizontal';
  panel('성공 기한',[[gate('(hlog_schedule_deadline_timestamp_seconds * 1000) or (hlog_schedule_expected_enabled == 0)',fresh('expectations')),'{{task}}']],'dateTimeAsIso','발행 09:30 KST. 비활성 일정은 기한 없음. 정비 후 기한 반영.',[{type:'value',options:{0:{text:'비활성'}}}]);
  panel('정비 종료',[[gate('hlog_schedule_maintenance_until_timestamp_seconds * 1000 * (hlog_schedule_maintenance_until_timestamp_seconds > bool time())',fresh('expectations')),'{{task}}']],'dateTimeAsIso','최대 24시간. 정비가 과거 실패를 지우지 않습니다.',[{type:'value',options:{0:{text:'정비 없음'}}}]);
  y+=6;row('04 · 백업과 복구');
  for(const task of ['backup','restore']) panel(task==='backup'?'최근 백업 성공':'최근 복구 검증 성공',[[gate(`hlog_batch_last_success_timestamp_seconds{task="${task}"} * 1000`,fresh(task)),task]],'dateTimeAsIso','0=성공 이력 없음. 백업 파일 생성과 복구 검증은 별개.',[{type:'value',options:{0:{text:'성공 이력 없음'}}}]);
  return {uid:'hlog-operations',title:'H-Log 운영',schemaVersion:41,version:1,editable:false,timezone:'Asia/Seoul',refresh:'1m',time:{from:'now-6h',to:'now'},tags:['hlog','private'],panels};
}

if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const files={
    'grafana/provisioning/alerting/hlog.json':buildProvisioning(),
    'grafana/dashboards/hlog.json':buildDashboard(),
    'grafana/provisioning/dashboards/hlog.yml':{apiVersion:1,providers:[{name:'hlog',orgId:1,folder:'H-Log 운영',type:'file',disableDeletion:false,editable:false,updateIntervalSeconds:60,options:{path:'/var/lib/grafana/dashboards'}}]},
  };
  for(const [name,value] of Object.entries(files)){const file=resolve(import.meta.dirname,'../deploy/observability',name);await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');}
}
