import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';
import { prepareDraftInput, runDraftRequestOnce } from '../lib/blog-draft-requests.ts';

test('owner draft requests remain private across real HTTP surfaces', {skip: process.env.HLOG_DRAFT_HTTP_TEST !== '1' && 'requires isolated loopback server, input and DB'}, async () => {
  const admin=new URL(process.env.HLOG_ADMIN_ORIGIN), publicOrigin=new URL(process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN), db=new URL(process.env.DATABASE_URL);
  for (const u of [admin,publicOrigin,db]) assert.equal(u.hostname,'127.0.0.1');
  const pool=new pg.Pool({connectionString:db.href});
  const input=prepareDraftInput(JSON.parse(await readFile(process.env.HLOG_AUTO_PUBLISH_INPUT_FILE,'utf8')));
  const headers={authorization:`Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString('base64')}`,origin:admin.origin,'content-type':'application/json'};
  const endpoint='/admin/automation/requests', command={commandId:randomUUID(),inputHash:input.hash,reason:'HTTP 합성 자료 검수'};
  const send=(body,override={})=>fetch(new URL(endpoint,admin),{method:'POST',headers:{...headers,...override},body:JSON.stringify(body)});
  try {
    assert.equal((await send(command,{authorization:'invalid'})).status,401);
    assert.equal((await send(command,{origin:publicOrigin.origin})).status,403);
    assert.equal((await fetch(new URL(endpoint,publicOrigin),{method:'POST',headers,body:JSON.stringify(command)})).status,404);
    assert.equal((await send({...command,path:'unapproved-file'})).status,400);
    assert.equal((await send({body:'a'.repeat(5000)})).status,413);
    const response=await send(command); assert.equal(response.status,202);
    assert.match(response.headers.get('cache-control'),/private.*no-store/);
    const receipt=await response.json(); assert.deepEqual(await (await send(command)).json(),receipt);
    assert.equal((await send({...command,reason:'다른 입력'})).status,409);
    assert.equal((await pool.query("select count(*)::int n from blog_draft_requests where status='queued'")).rows[0].n,1,'Use a dedicated synthetic database with only this queued request');
    let calls=0;
    const result=await runDraftRequestOnce({pool,enabled:true,policy:{dailyEstimatedCostLimit:1,monthlyEstimatedCostLimit:10},generateArticle:async i=>{
      calls++;
      return {output:{title:'초안 전용 검수 '+i.postId,description:'공식 문서를 바탕으로 워커 적용 조건을 확인해요.',slug:i.postId,articleMode:'applied_analysis',contentMarkdown:'## 변경 내용\n\nAPI 동작이 바뀌었습니다.\n',tags:['운영'],claims:[{id:'claim',text:'API 동작이 바뀌었습니다.',type:'api',sourceId:i.sources[0].id}],sources:i.sources.map(s=>s.url),evidencePaths:[],personalContextIds:['context'],publishDecision:'publish',blockReason:null},usage:{estimatedCost:0.01,inputTokens:100,outputTokens:100,model:'fake',provider:'fake'}};
    }});
    assert.equal(result.requestId,receipt.requestId); assert.equal(result.status,'completed'); assert.equal(calls,1);
    const post=(await pool.query('select * from posts where id=$1',['post-draft-'+receipt.requestId])).rows[0];
    assert.equal(post.status,'drafted');
    assert.equal((await pool.query('select count(*)::int n from publish_jobs where post_id=$1',[post.id])).rows[0].n,0);
    const history=await fetch(new URL('/admin/automation',admin),{headers:{authorization:headers.authorization}});
    const html=await history.text(); assert.match(html,/초안 저장 완료/); assert(html.includes(receipt.requestId));
    for (const path of ['/', '/blog', '/api/search?q='+encodeURIComponent('초안 전용 검수'),'/sitemap.xml','/feed.xml','/llms.txt','/llms-full.txt']) {
      const publicResponse=await fetch(new URL(path,publicOrigin)); assert.equal(publicResponse.status,200,path);
      const body=await publicResponse.text(); assert(!body.includes(post.title),path); assert(!body.includes(post.id),path);
    }
    for (const path of ['/blog/'+post.slug,'/blog/'+post.slug+'.md','/blog-markdown/'+post.slug]) assert.equal((await fetch(new URL(path,publicOrigin))).status,404,path);
    assert.equal((await runDraftRequestOnce({pool,enabled:true,policy:{dailyEstimatedCostLimit:1,monthlyEstimatedCostLimit:10},generateArticle:async()=>{assert.fail('must not call twice');}})).status,'idle');
    assert.deepEqual(await (await send(command)).json(),receipt);
  } finally { await pool.end(); }
});
