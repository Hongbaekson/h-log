// Synthetic provider and HTTP responses, used only by the explicitly enabled local smoke.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { changeAutomationPolicy } from "../lib/blog-automation-policy.ts";
import { runDailyAutomationOnce } from "../lib/blog-automation-runner.ts";
import { runPersistentWorkerOnce } from "../lib/blog-persistent-worker.ts";
import { createPostgresRequiredPublishJobAdapter } from "../lib/blog-required-publish-job-adapter.ts";
import { runObservedPublishCycle } from "../lib/observability-cycle.ts";
import { verifyPublication } from "../lib/observability-publishing.ts";

export async function publishingFixture(pool, write) {
  const now = new Date().toISOString();
  const environment = { HLOG_BLOG_DRAFT_GENERATION_ENABLED: "1", HLOG_BLOG_AUTO_PUBLISH_ENABLED: "1", HLOG_BLOG_JOBS_ENABLED: "1", HLOG_DAILY_ESTIMATED_COST_LIMIT: "1", HLOG_MONTHLY_ESTIMATED_COST_LIMIT: "10" };
  const source = { id: "source", publisher: "Example", title: "런타임 변경", summary: "공식 변경 사항", url: "https://example.com/releases/runtime" };
  const input = { personalContextItems: [{ id: "context", category: "H-Log", title: "워커 적용 검토", summary: "공개 자료로 워커 적용을 검토합니다.", allowedUsage: "applied_analysis", publicSafe: true, createdAt: now, updatedAt: now, version: 1 }],
    topicSources: [{ ...source, sourceType: "official_release_note", signals: { backendAutomationFit: true, directVerificationAvailable: true, originalSourceAvailable: true }, relevanceReason: "워커 적용 검토" }],
    researchPackSources: [{ ...source, fetchedAt: now, sourceRole: "official", excerpt: "공식 변경", claimMetadata: [{ claimId: "claim", claimText: "API 동작이 바뀌었습니다.", sourceId: "source" }] }] };
  await changeAutomationPolicy(pool, { commandId: randomUUID(), expectedRevision: 0, generation: true, publication: true, jobs: true, reason: "격리 관측 검증" });
  let providerCalls = 0;
  const generate = () => runDailyAutomationOnce({ pool, runAt: now, environment, loadInput: async () => input, generateArticle: async () => {
    providerCalls++;
    return { output: { title: "런타임 변경과 워커", description: "공식 변경 사항의 적용 조건을 살펴봐요.", slug: "runtime-conditions", articleMode: "applied_analysis", contentMarkdown: "## 변경 내용\n\nAPI 동작이 바뀌었습니다.\n", tags: ["운영"], claims: [{ id: "claim", text: "API 동작이 바뀌었습니다.", type: "api", sourceId: "source" }], sources: [source.url], evidencePaths: [], personalContextIds: ["context"], publishDecision: "publish", blockReason: null }, usage: { estimatedCost: 0, inputTokens: 100, outputTokens: 100, provider: "fake", model: "fake", costBasis: "included" } };
  } });
  const adapter = createPostgresRequiredPublishJobAdapter({ pool, publicBaseUrl: "https://example.com", fetch: async address => {
    const row = (await pool.query("SELECT p.slug,v.content_markdown FROM posts p JOIN post_versions v ON v.id=p.current_version_id WHERE p.status IN ('published','verifying')")).rows[0];
    assert.ok(row);
    const url = new URL(String(address));
    return new Response(url.pathname.endsWith('.md') ? row.content_markdown : url.pathname === '/sitemap.xml' ? `<urlset><url><loc>https://example.com/blog/${row.slug}</loc></url></urlset>` : 'synthetic page');
  } });
  const options = { generate, runRequiredWorkerOnce: postId => runPersistentWorkerOnce({ adapter, pool, postId, importance: "required", runAt: new Date().toISOString(), workerId: "synthetic", environment }), verify: candidate => verifyPublication(pool, candidate), write };
  await runObservedPublishCycle(options);
  assert.equal(providerCalls, 1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM publish_jobs WHERE importance='required' AND status='succeeded'")).rows[0].n, 6);
  assert.equal((await pool.query("SELECT status FROM posts")).rows[0].status, 'published');
  return options;
}
