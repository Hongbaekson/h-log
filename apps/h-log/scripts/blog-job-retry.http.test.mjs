import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import pg from 'pg';
test('owner retry endpoint converges duplicate requests and protects origin, stale state and pause',{skip:process.env.HLOG_RETRY_HTTP_TEST!=='1'&&'requires isolated retry fixture'},async()=>{
 const origin=new URL(process.env.HLOG_ADMIN_ORIGIN), dbUrl=new URL(process.env.DATABASE_URL);
 assert(['127.0.0.1','localhost','[::1]'].includes(origin.hostname)); assert(['127.0.0.1','localhost','[::1]'].includes(dbUrl.hostname));
 assert.equal(dbUrl.pathname,'/hlog_retry_ui_20261028');
 const db=new pg.Pool({connectionString:dbUrl.href});
 const authorization=`Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString('base64')}`;
 const send=(body,extra={})=>fetch(new URL('/admin/jobs/retry',origin),{method:'POST',headers:{authorization,origin:origin.origin,'content-type':'application/json',...extra},body:JSON.stringify(body)});
 try {
  const row=(await db.query("select j.admin_id,j.retry_count,p.command_revision,v.version_no,v.content_hash from publish_jobs j join posts p on p.id=j.post_id join post_versions v on v.id=j.post_version_id where p.id='http'")).rows[0];
  const c={commandId:randomUUID(),jobId:row.admin_id,expectedRetryCount:row.retry_count,expectedPostRevision:row.command_revision,expectedVersion:row.version_no,expectedHash:row.content_hash,reason:'실패 원인을 확인하고 조치했습니다',confirmed:true};
  assert.equal((await send(c,{authorization:'bad'})).status,401);
  assert.equal((await send(c,{origin:'https://other.example'})).status,403);
  assert.equal((await send({...c,confirmed:false})).status,400);
  const responses=await Promise.all([send(c),send(c)]);for(const r of responses){assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/private.*no-store/);}
  assert.deepEqual(await responses[0].json(),await responses[1].json());
  assert.equal((await send({...c,commandId:randomUUID()})).status,409);
  assert.equal((await db.query("select count(*)::int n from admin_actions where command_id=$1",[c.commandId])).rows[0].n,1);
  const html=await (await fetch(new URL('/admin/jobs',origin),{headers:{authorization}})).text();
  assert.doesNotMatch(html,/SECRET-|internal\/path/);
  const policy=(await db.query('select * from blog_automation_policy')).rows[0];
  const change=async(jobs,revision)=>fetch(new URL('/admin/automation/policy',origin),{method:'POST',headers:{authorization,origin:origin.origin,'content-type':'application/json'},body:JSON.stringify({commandId:randomUUID(),expectedRevision:revision,generation:policy.generation,publication:policy.publication,jobs,reason:'로컬 중지 재개 검증'})});
  assert.equal((await change(false,policy.revision)).status,200);
  const browser=(await db.query("select j.admin_id,p.command_revision from publish_jobs j join posts p on p.id=j.post_id where p.id='browser'")).rows[0];
  const blocked=await send({...c,commandId:randomUUID(),jobId:browser.admin_id,expectedRetryCount:1,expectedPostRevision:browser.command_revision});
  assert.equal(blocked.status,422);assert.equal((await blocked.json()).error,'automation_paused');
  assert.equal((await send(c)).status,200); // Accepted receipts survive a later pause.
  assert.equal((await change(true,policy.revision+1)).status,200);
 }finally{await db.end();}
});
