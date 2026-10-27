import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { createPostVersionContentFromMarkdown } from "../lib/blog-content-model.ts";
import { runPersistentWorkerOnce } from "../lib/blog-persistent-worker.ts";
import { createPostgresRequiredPublishJobAdapter } from "../lib/blog-required-publish-job-adapter.ts";

test("owner editorial commands preserve versions and public HTTP boundaries", {
  skip: process.env.HLOG_EDITORIAL_HTTP_TEST !== "1" && "requires migrated isolated database and loopback ingresses",
}, async () => {
  const admin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  const publicOrigin = new URL(process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN);
  const database = new URL(process.env.DATABASE_URL);
  for (const url of [admin, publicOrigin, database]) assert.equal(url.hostname, "127.0.0.1");
  const pool = new pg.Pool({ connectionString: database.href });
  const id = `editorial-http-${randomUUID()}`, versionId = `${id}-v1`;
  const authorization = `Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`;
  const headers = { authorization, origin: admin.origin, "content-type": "application/json" };
  const endpoint = new URL("/admin/posts/commands", admin);
  const request = (command, overrides = {}) => fetch(endpoint, {
    method: "POST", headers, body: JSON.stringify(command), signal: AbortSignal.timeout(30000), ...overrides,
  });
  const original = createPostVersionContentFromMarkdown("## 원본\n\n수정본을 저장해도 이 공개본은 유지됩니다.\n");
  const publicGet = async path => {
    const response = await fetch(new URL(path, publicOrigin), { signal: AbortSignal.timeout(30000) });
    return { status: response.status, body: await response.text() };
  };
  try {
    await pool.query("insert into posts (id,slug,title,description,article_mode,status,published_at,created_at,updated_at) values ($1,$1,'합성 원본','HTTP 검증 자료','document_analysis','published',now(),now(),now())", [id]);
    await pool.query("insert into post_versions (id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values ($1,$2,1,'합성 원본','HTTP 검증 자료',$3,$4,$5,'system',now())", [versionId,id,original.contentMarkdown,original.contentHtml,original.contentHash]);
    await pool.query("update posts set current_version_id=$2 where id=$1", [id,versionId]);
    const draft = { title:"검토한 합성 수정본", description:"HTTP 검증 자료", contentMarkdown:"## 확인한 내용\n\n변경 전에 기록을 남기는 편을 선호합니다.\n", claims:[{text:"변경 전에 기록을 남기는 편을 선호합니다.",type:"opinion",sourceId:"",evidencePath:"",evidenceQuote:""}],evidencePaths:[] };
    const save = {action:"save",commandId:randomUUID(),postId:id,expectedRevision:0,expectedStatus:"published",expectedCurrentVersionId:versionId,versionId,reason:"로컬 합성 원고 검토",draft};
    assert.equal((await request(save,{headers:{"content-type":"application/json"}})).status,401);
    assert.equal((await fetch(new URL(endpoint.pathname,publicOrigin),{method:"POST",headers,body:JSON.stringify(save)})).status,404);
    assert.equal((await request(save,{headers:{...headers,origin:publicOrigin.origin}})).status,403);
    assert.equal((await request({...save,actorId:"another-owner"})).status,400);
    assert.equal((await request(save,{body:'"'+"x".repeat(262145)+'"'})).status,413);
    const savedResponse = await request(save);
    assert.equal(savedResponse.status,200);
    assert.match(savedResponse.headers.get("cache-control"),/no-store/);
    assert.match(savedResponse.headers.get("x-robots-tag"),/noindex/);
    const saved = await savedResponse.json();
    assert.equal(saved.versionNo,2);
    assert.deepEqual(await (await request(save)).json(),saved);
    assert.equal((await request({...save,commandId:randomUUID()})).status,409);
    assert.equal((await publicGet(`/blog/${id}.md`)).body.trim(),original.contentMarkdown.trim());
    const selected=(await pool.query("select content_hash from post_versions where id=$1",[saved.versionId])).rows[0];
    const publish={action:"publish",commandId:randomUUID(),postId:id,expectedRevision:1,expectedStatus:"published",expectedCurrentVersionId:versionId,versionId:saved.versionId,contentHash:selected.content_hash,confirmed:true,reason:"저장된 수정본 검토 완료"};
    assert.equal((await request({...publish,confirmed:false})).status,422);
    assert.equal((await request({...publish,contentHash:"0".repeat(64)})).status,409);
    const acceptedResponse=await request(publish);
    assert.equal(acceptedResponse.status,200);
    const accepted=await acceptedResponse.json();
    assert.equal(accepted.status,"publishing");
    assert.equal((await publicGet(`/blog/${id}`)).status,404);
    const adapter=createPostgresRequiredPublishJobAdapter({pool,publicBaseUrl:publicOrigin.origin,canonicalPublicBaseUrl:process.env.HLOG_PUBLIC_BASE_URL ?? publicOrigin.origin,fetch:async input=>{
      const url=new URL(String(input)); assert.equal(url.origin,publicOrigin.origin);
      return fetch(url,{signal:AbortSignal.timeout(30000)});
    }});
    for(let i=0;i<6;i++) assert.equal((await runPersistentWorkerOnce({pool,adapter,postId:id,runAt:new Date().toISOString(),workerId:id})).status,"succeeded");
    assert.equal((await publicGet(`/blog/${id}`)).status,200);
    assert.equal((await publicGet(`/blog/${id}.md`)).body.trim(),draft.contentMarkdown.trim());
    const retract={action:"retract",commandId:randomUUID(),postId:id,expectedRevision:2,expectedStatus:"published",expectedCurrentVersionId:saved.versionId,versionId:saved.versionId,reason:"로컬 검증을 마쳐 철회"};
    assert.equal((await request(retract)).status,200);
    assert.deepEqual(await (await request(publish)).json(),accepted);
    for(const path of [`/blog/${id}`,`/blog/${id}.md`]) assert.equal((await publicGet(path)).status,404);
    for(const path of ["/","/blog",`/api/search?q=${encodeURIComponent(draft.title)}`,"/sitemap.xml","/feed.xml","/llms.txt","/llms-full.txt"]){
      const page=await publicGet(path); assert.equal(page.status,200,path); assert(!page.body.includes(id),path);
    }
    assert.equal((await pool.query("select content_markdown from post_versions where id=$1",[versionId])).rows[0].content_markdown,original.contentMarkdown);
    assert.equal((await pool.query("select count(*)::int as n from admin_actions where target_id=$1",[id])).rows[0].n,3);
  } finally {
    // Remove only this test's random fixture; never alter existing posts or audit rows.
    await pool.query("delete from admin_actions where target_type='post' and target_id=$1",[id]);
    await pool.query("update posts set current_version_id=null where id=$1",[id]);
    await pool.query("delete from posts where id=$1",[id]);
    await pool.end();
  }
});
