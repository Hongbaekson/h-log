import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { parseEditorialCommand, parseEditorialDraft, type EditorialReceipt } from "./blog-editorial-command.ts";
import { assertBlogPostStatusTransition, createPostVersionContentFromMarkdown, createPostVersionContentHash, createPublishJobIdempotencyKey, requiredPublishJobTypes, type BlogPostStatus, type PostRecord, type PostSourceRole } from "./blog-content-model.ts";
import { validateArticleWriterOutput } from "./blog-article-generation.ts";
import { verifyArticleClaims } from "./blog-topic-research.ts";
import { createBlogPrivacyScanPolicyFromEnvironment, scanBlogPrivacyText } from "./blog-privacy-scanner.ts";
import { retractAdminPost } from "./blog-admin.ts";

export function createBlogEditorialRepository(pool: Pool, { publishEnabled = false } = {}) {
  return { async execute(input: unknown): Promise<EditorialReceipt> {
    const c = parseEditorialCommand(input);
    const privacy = createBlogPrivacyScanPolicyFromEnvironment(process.env);
    if (scanBlogPrivacyText(c.reason, privacy).status === "blocked" || /https?:\/\//i.test(c.reason)) throw new Error("unsafe_reason");
    const fingerprint = createHash("sha256").update(JSON.stringify(["blog_editorial", c])).digest("hex");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout = '5s'");
      const reserved = await client.query(`insert into admin_actions
        (id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_id,request_fingerprint,command_receipt)
        values ($1,$2,'admin','owner','post',$3,$4,now(),$5,$6,'{}')
        on conflict (actor_type,actor_id,command_id) where command_id is not null do nothing returning id`,
      [randomUUID(), c.action, c.postId, c.reason, c.commandId, fingerprint]);
      if (!reserved.rowCount) {
        const previous = (await client.query("select request_fingerprint,command_receipt from admin_actions where actor_type='admin' and actor_id='owner' and command_id=$1", [c.commandId])).rows[0];
        if (previous.request_fingerprint !== fingerprint) throw new Error("command_conflict");
        await client.query("commit"); return previous.command_receipt;
      }
      const post = (await client.query("select * from posts where id=$1 for update", [c.postId])).rows[0];
      if (!post) throw new Error("post_not_found");
      if (post.command_revision !== c.expectedRevision) throw new Error("revision_conflict");
      if (post.status !== c.expectedStatus || post.current_version_id !== c.expectedCurrentVersionId) throw new Error("state_conflict");
      if (["retracted", "unpublished", "queued", "researching", "publishing", "verifying"].includes(post.status) && c.action !== "retract") throw new Error("state_conflict");
      const version = (await client.query("select * from post_versions where id=$1 and post_id=$2", [c.versionId, c.postId])).rows[0];
      if (!version) throw new Error("version_conflict");
      let versionId = version.id, versionNo = version.version_no, status = post.status as BlogPostStatus;
      const now = new Date().toISOString();
      if (c.action === "retract") {
        if (c.versionId !== post.current_version_id || !["published", "correction_pending"].includes(post.status)) throw new Error("state_conflict");
        const record: PostRecord = { id: post.id, slug: post.slug, title: post.title, description: post.description, articleMode: post.article_mode, status,
          currentVersionId: post.current_version_id, publishedAt: post.published_at?.toISOString() ?? null, unpublishedAt: post.unpublished_at?.toISOString() ?? null,
          retractedAt: null, createdAt: post.created_at.toISOString(), updatedAt: post.updated_at.toISOString() };
        retractAdminPost({ posts: [record], adminActions: [] }, { postId: post.id, reason: c.reason, createdAt: now, actorId: "owner" });
        status = "retracted";
        await client.query("update posts set status='retracted',retracted_at=$2 where id=$1", [post.id, now]);
      } else {
        const latest = (await client.query("select max(version_no) as n from post_versions where post_id=$1", [post.id])).rows[0].n;
        if (version.version_no !== latest) throw new Error("version_conflict");
        if (c.action === "save") {
          const draft = c.draft!, content = createPostVersionContentFromMarkdown(draft.contentMarkdown);
          if (Buffer.byteLength(content.contentHtml) > 262144) throw new Error("request_too_large");
          versionId = randomUUID(); versionNo = latest + 1;
          await client.query(`insert into post_versions (id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at,editorial_review)
            values ($1,$2,$3,$4,$5,$6,$7,$8,'admin',$9,$10)`, [versionId,post.id,versionNo,draft.title,draft.description,content.contentMarkdown,content.contentHtml,content.contentHash,now,JSON.stringify({ claims: draft.claims, evidencePaths: draft.evidencePaths })]);
        } else {
          if (!publishEnabled) throw new Error("publication_disabled");
          if ((await client.query("select 1 from publish_jobs where post_id=$1 and post_version_id=$2 limit 1", [post.id, version.id])).rowCount) throw new Error("version_conflict");
          if (!version.editorial_review || version.created_by !== "admin" || version.content_hash !== c.contentHash
            || createPostVersionContentHash({ contentMarkdown: version.content_markdown, contentHtml: version.content_html }) !== c.contentHash
            || (post.status === "published" && version.id === post.current_version_id)) throw new Error("version_conflict");
          const draft = parseEditorialDraft({ title: version.title, description: version.description, contentMarkdown: version.content_markdown, ...version.editorial_review });
          const sources = (await client.query("select * from post_sources where post_id=$1 order by id", [post.id])).rows;
          const tags = (await client.query("select tag from post_tags where post_id=$1 order by tag", [post.id])).rows.map(r=>r.tag);
          const claims = draft.claims.map((claim,i)=>({ ...claim, id: `claim-${i+1}` }));
          if (!claims.length || claims.some(claim=>!draft.contentMarkdown.includes(claim.text))) throw new Error("quality_blocked");
          const validation = validateArticleWriterOutput({ generatedAt: now, postId: post.id, postVersionId: version.id, privacyScanPolicy: privacy,
            output: { ...draft, articleMode: post.article_mode, slug: post.slug, claims, sources: sources.map(s=>s.url), tags, personalContextIds: [], publishDecision: "publish", blockReason: null } });
          const verified = verifyArticleClaims({ checkedAt: now, postId: post.id, postVersionId: version.id,
            claims: claims.map(claim=>({ ...claim, claimText: claim.text, claimType: claim.type, sourceId: claim.sourceId || undefined, evidencePath: claim.evidencePath || undefined })),
            postSources: sources.map(s=>({ id: s.id, sourceRole: s.source_role as PostSourceRole })) });
          if (validation.status !== "passed" || verified.status !== "passed" || scanBlogPrivacyText(JSON.stringify({ sources, tags, post: { slug: post.slug, title: version.title, description: version.description } }), privacy).status === "blocked") throw new Error("quality_blocked");
          if ((await client.query("select 1 from publish_jobs where post_id=$1 and status='running' and lease_expires_at>now() limit 1", [post.id])).rowCount) throw new Error("state_conflict");
          const move = (next: BlogPostStatus) => { assertBlogPostStatusTransition(status, next); status = next; };
          if (status === "published") move("correction_pending");
          if (status === "correction_pending") move("corrected");
          if (status !== "ready_to_publish") move("ready_to_publish");
          move("publishing");
          await client.query("update posts set current_version_id=$2,title=$3,description=$4,status=$5 where id=$1", [post.id,version.id,version.title,version.description,status]);
          for (const type of requiredPublishJobTypes) {
            await client.query(`insert into publish_jobs (id,post_id,post_version_id,type,importance,idempotency_key,status,retry_count)
              values ($1,$2,$3,$4,'required',$5,'queued',0)`, [randomUUID(),post.id,version.id,type,createPublishJobIdempotencyKey(type,{ id: version.id, contentHash: version.content_hash })]);
          }
        }
      }
      await client.query("update posts set command_revision=command_revision+1,updated_at=$2 where id=$1", [post.id, now]);
      const receipt: EditorialReceipt = { postId: post.id, versionId, versionNo, commandRevision: post.command_revision + 1, status };
      await client.query("update admin_actions set command_receipt=$1 where actor_type='admin' and actor_id='owner' and command_id=$2", [JSON.stringify(receipt),c.commandId]);
      await client.query("commit"); return receipt;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  } };
}
