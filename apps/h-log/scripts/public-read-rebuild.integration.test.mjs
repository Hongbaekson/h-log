// Only this suite's newly created loopback database is mutated or removed.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import test from 'node:test';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { makeBlogFixture, fingerprint as originalHash } from './performance-fixtures.mjs';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { getPublicBlogIndex } from '../lib/blog-public.ts';
import { toPublicBrainNode } from '../lib/brain-capture.ts';
import { projectionContext, canonicalJson } from '../lib/public-read-model.ts';

test('isolated rebuild preserves originals, resumes, verifies and recovers derived data', { skip: process.env.HLOG_PROJECTION_TEST !== '1' }, async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert(!url.search);
  assert.match(url.pathname, /^\/hlog_projection_[a-z0-9_]+$/);
  const name = `hlog_projection_${randomUUID().replaceAll('-', '')}`;
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.href }); await admin.connect();
  await admin.query(`create database ${name}`);
  url.pathname = '/' + name;
  const pool = new pg.Pool({ connectionString: url.href, max: 4 });
  try {
    await admin.query(`comment on database ${name} is 'hlog-public-read-local-v1'`);
    const { runLocalProjection } = await import('../lib/public-read-rebuild.ts');
    const run = (options, context = projectionContext()) => runLocalProjection(pool, { confirmOwnedLocal: true, ...options }, context);
    await assert.rejects(run({ command: 'rebuild', kind: 'all' }), /schema_not_applied/);
    await runBlogMigrations(url.href);
    assert.equal((await pool.query('select writer_protocol from public_read_state')).rows[0].writer_protocol, 0);
    await assert.rejects(runLocalProjection(pool, { command: 'rebuild', kind: 'all' }), /owned_local_required/);
    await assert.rejects(run({ command: 'rebuild', kind: 'all', batchSize: 101 }), /invalid_options/);
    const repository = createPostgresBlogRepository(pool);
    async function seed(count) {
      const fixture = makeBlogFixture(count);
      const existing = new Set((await pool.query('select id from posts')).rows.map(row => row.id));
      for (const post of fixture.posts.filter(post => !existing.has(post.id))) for (const version of fixture.versions.filter(v => v.postId === post.id)) {
        await repository.savePost({ post: { ...post, currentVersionId: version.id }, version, tags: fixture.tags.filter(v => v.postId === post.id), sources: fixture.sources.filter(v => v.postId === post.id), assets: [], publishJobs: [] });
      }
      await pool.query("update posts set current_version_id=id||'-v1'");
    }
    async function originals() {
      const result = {};
      for (const table of ['posts', 'post_versions', 'post_tags', 'post_sources', 'post_assets', 'brain_notes', 'brain_note_versions', 'brain_note_reviews', 'resume_pdf_versions', 'resume_pdf_state', 'admin_actions']) {
        result[table] = (await pool.query(`select to_jsonb(t) data from ${table} t order by to_jsonb(t)::text`)).rows;
      }
      return originalHash(result);
    }
    await seed(10);
    const id = `note-${randomUUID()}`;
    const node = toPublicBrainNode({ title: 'PRIVATE_BRAIN_TITLE', originalText: 'PRIVATE_BRAIN_BODY', publicTitle: '검수 사본', publicSummary: '공개 요약', publicBody: '공개 본문', kind: 'learning', topic: 'data', basis: 'implementation', tags: [] }, id, '2026-11-16');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('insert into brain_notes(id) values ($1)', [id]);
      await client.query('insert into brain_note_versions(note_id,revision,draft) values($1,1,$2)', [id, { originalText: 'PRIVATE_BRAIN_BODY' }]);
      await client.query('update brain_notes set current_revision=1,published_revision=1,public_node=$2 where id=$1', [id, node]);
      await client.query('commit');
    } finally { client.release(); }
    await pool.query("insert into brain_note_reviews(note_id,revision,command_revision,command_id,result,memo) values($1,1,1,$2,'confirmed','PRIVATE_REVIEW_MEMO')", [id, randomUUID()]);
    await pool.query("insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at) values('projection-fixture-audit','publish','admin','owner','brain_note',$1,'PRIVATE_AUDIT_REASON',now())", [id]);
    const pdfId = randomUUID(), pdfBytes = Buffer.from('%PDF-1.4\nSynthetic preservation fixture'), pdfHash = createHash('sha256').update(pdfBytes).digest('hex');
    await pool.query(`insert into resume_pdf_versions(id,bytes,sha256,byte_size,page_count,inspection,validation_policy,tool_versions)
      values($1,$2,$3,$4,1,'{"policy":"fixture-v1","pages":1,"tools":{}}','fixture-v1','{}')`, [pdfId, pdfBytes, pdfHash, pdfBytes.length]);
    await pool.query(`update resume_pdf_state set revision=3,public_version_id=$1,public_sha256=$2,publication_epoch=$3,reviewed_at=now(),reviewed_by='synthetic-owner',
      review_checklist='{"allPages":true,"metadataAndLinks":true,"privacyAndOrganizations":true,"hiddenContentAndSource":true}' where id=1`, [pdfId, pdfHash, randomUUID()]);
    const before = await originals();
    let active;
    await t.test('batch checkpoint resumes; duplicate execution and premature activation fail', async () => {
      const controller = new AbortController();
      const paused = await run({ command: 'rebuild', kind: 'all', batchSize: 3, signal: controller.signal, onProgress: () => controller.abort() });
      assert.equal(paused.status, 'paused'); assert.equal(paused.processed, 3);
      assert.equal((await pool.query('select active_generation from public_read_state')).rows[0].active_generation, null);
      await assert.rejects(run({ command: 'activate', generation: paused.generation }), /incomplete/);
      const lock = await pool.connect();
      try {
        await lock.query('select pg_advisory_lock(710493708)');
        await assert.rejects(run({ command: 'resume', generation: paused.generation }), /busy/);
      } finally { await lock.query('select pg_advisory_unlock(710493708)'); lock.release(); }
      active = await run({ command: 'resume', generation: paused.generation });
      assert.equal(active.status, 'active'); assert.equal(active.processed, 13);
      assert.equal(active.counts.ready, 11); assert.equal(active.counts.excluded, 2);
      const entries = (await pool.query('select * from public_read_entries where generation_id=$1', [active.generation])).rows;
      assert.doesNotMatch(JSON.stringify(entries), /PERF_PRIVATE|PRIVATE_BRAIN|PRIVATE_REVIEW|PRIVATE_AUDIT|Synthetic preservation/);
      const sourceList = getPublicBlogIndex(await repository.findPublicBlogContent(), { pageSize: 100 }).posts;
      for (const item of sourceList) assert.equal(canonicalJson(entries.find(e => e.source_id === item.slug).payload.list), canonicalJson(item));
      assert.equal(await originals(), before);
    });
    await t.test('same input converges; partial kind retains Brain and detects corruption', async () => {
      const hashes = (await pool.query('select kind,source_id,input_fingerprint,payload_hash from public_read_entries where generation_id=$1 order by kind,source_id', [active.generation])).rows;
      const next = await run({ command: 'rebuild', kind: 'blog' });
      assert.deepEqual((await pool.query('select kind,source_id,input_fingerprint,payload_hash from public_read_entries where generation_id=$1 order by kind,source_id', [next.generation])).rows, hashes);
      await pool.query("update public_read_entries set payload=jsonb_set(payload,'{list,title}','\"corrupt\"') where generation_id=$1 and source_id='perf-0000'", [next.generation]);
      await assert.rejects(run({ command: 'verify', generation: next.generation }), /verification_failed/);
      await run({ command: 'repair', kind: 'blog', id: 'perf-0000' });
      assert.equal((await run({ command: 'verify', generation: next.generation })).status, 'active');
      assert.equal(await originals(), before);
    });
    await t.test('metadata, policy and epoch changes invalidate candidates without old activation', async () => {
      const controller = new AbortController();
      const paused = await run({ command: 'rebuild', kind: 'all', batchSize: 1, signal: controller.signal, onProgress: () => controller.abort() });
      const oldHash = (await pool.query("select input_fingerprint from public_read_entries where generation_id=$1 and source_id='perf-0000'", [paused.generation])).rows[0].input_fingerprint;
      await pool.query("update post_tags set tag='changed' where id='perf-0000-tag-0'");
      await assert.rejects(run({ command: 'resume', generation: paused.generation }, projectionContext({}, { renderer: 2 })), /context_mismatch/);
      await assert.rejects(run({ command: 'resume', generation: paused.generation }), /verification_failed/);
      const rebuilt = await run({ command: 'resume', generation: paused.generation });
      assert.notEqual((await pool.query("select input_fingerprint from public_read_entries where generation_id=$1 and source_id='perf-0000'", [rebuilt.generation])).rows[0].input_fingerprint, oldHash);
      await run({ command: 'reset-derived' });
      await assert.rejects(run({ command: 'resume', generation: paused.generation }), /generation_missing/);
      await assert.rejects(run({ command: 'rebuild', kind: 'blog' }), /full_rebuild_required/);
      const blocked = await run({ command: 'rebuild', kind: 'all' }, projectionContext({ restrictedTerms: [{ category: 'organization_name', value: '합성 검수' }] }));
      assert.equal(blocked.counts.ready, 1);
      await assert.rejects(run({ command: 'verify', generation: blocked.generation }), /context_mismatch/);
    });
    await t.test('derived table loss requires explicit recovery; sources and approvals survive', async () => {
      const unchanged = await originals();
      await pool.query('drop table public_read_entries');
      await assert.rejects(run({ command: 'rebuild', kind: 'all' }), /derived_schema_missing/);
      await run({ command: 'reset-derived' });
      assert.equal((await run({ command: 'rebuild', kind: 'all' })).counts.ready, 11);
      assert.equal(await originals(), unchanged);
    });
    await t.test('late run tokens, missing rows and oversized input never activate a partial candidate', async () => {
      const activeId = (await pool.query('select active_generation from public_read_state')).rows[0].active_generation;
      let replaced = false;
      await assert.rejects(run({ command: 'rebuild', kind: 'all', batchSize: 1, onProgress: async progress => {
        if (!replaced) { replaced = true; await pool.query('update public_read_generations set run_token=$2 where id=$1', [progress.generation, randomUUID()]); }
      } }), /stale_run/);
      assert.equal((await pool.query('select active_generation from public_read_state')).rows[0].active_generation, activeId);
      await pool.query("delete from public_read_entries where generation_id=$1 and source_id='perf-0000'", [activeId]);
      await assert.rejects(run({ command: 'verify', generation: activeId }), /verification_failed/);
      await run({ command: 'repair', kind: 'blog', id: 'perf-0000' });
      const saved = (await pool.query("select content_markdown from post_versions where id='perf-0000-v1'")).rows[0].content_markdown;
      await pool.query("update post_versions set content_markdown=repeat('x',1048576) where id='perf-0000-v1'");
      await assert.rejects(run({ command: 'rebuild', kind: 'all' }), /input_limit/);
      await pool.query("update post_versions set content_markdown=$1 where id='perf-0000-v1'", [saved]);
      const unchanged = await originals();
      await pool.query('delete from public_read_state');
      await pool.query('drop table public_read_sources');
      await run({ command: 'reset-derived' });
      assert.equal((await run({ command: 'rebuild', kind: 'all' })).counts.ready, 11);
      assert.equal(await originals(), unchanged);
    });
    await t.test('a killed CLI resumes its durable checkpoint without touching source data', async () => {
      const unchanged = await originals();
      const child = spawn(process.execPath, ['--no-warnings', '--experimental-strip-types', 'scripts/public-read-rebuild.mjs', 'rebuild', '--kind', 'all', '--batch-size', '1', '--progress', '--confirm-owned-local'], {
        env: { ...process.env, DATABASE_URL: url.href, HLOG_PRIVACY_ORGANIZATION_NAMES: '[]', HLOG_PRIVACY_PRIVATE_REPOSITORIES: '[]' }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let checkpoint, buffer = '', stderr = '';
      child.stderr.on('data', data => { stderr += data; });
      child.stdout.on('data', data => {
        buffer += data;
        if (!checkpoint && buffer.includes('\n')) { checkpoint = JSON.parse(buffer.split('\n')[0]); child.kill('SIGKILL'); }
      });
      await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
      assert(checkpoint, stderr); assert(checkpoint.processed >= 1);
      const resumed = await run({ command: 'resume', generation: checkpoint.generation });
      assert.equal(resumed.counts.ready, 11); assert.equal(await originals(), unchanged);
    });
    await t.test('1000 posts fit the F1 60 second rebuild target with bounded batches', async () => {
      await seed(1000);
      const unchanged = await originals();
      const result = await run({ command: 'rebuild', kind: 'all' });
      assert.equal(result.status, 'active'); assert.equal(result.counts.ready, 1001);
      assert(result.elapsedMs < 60000); assert(result.maxBatchBytes <= 8 * 1024 * 1024);
      assert.equal(await originals(), unchanged);
      console.log('projection benchmark ' + JSON.stringify(result));
      const bytes = (await pool.query('select pg_total_relation_size(\'public_read_entries\')::text bytes')).rows[0].bytes;
      console.log('projection retained bytes across generations ' + bytes);
    });
  } finally {
    await pool.end();
    await admin.query(`drop database ${name}`);
    await admin.end();
  }
});
