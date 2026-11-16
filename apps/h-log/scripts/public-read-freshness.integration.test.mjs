import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { makeBlogFixture } from './performance-fixtures.mjs';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { createBrainRepository } from '../lib/brain-postgres-repository.ts';
import { runLocalProjection } from '../lib/public-read-rebuild.ts';
import { projectionContext } from '../lib/public-read-model.ts';

test('transactional markers, catch-up and read snapshots preserve current publication', { skip: process.env.HLOG_PROJECTION_TEST !== '1' }, async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.match(url.pathname, /^\/hlog_projection_[a-z0-9_]+$/); assert(!url.search);
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.href }); await admin.connect();
  const name = `hlog_projection_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create database ${name}`); await admin.query(`comment on database ${name} is 'hlog-public-read-local-v1'`);
  url.pathname = '/' + name;
  const pool = new pg.Pool({ connectionString: url.href, max: 6 });
  try {
    await runBlogMigrations(url.href);
    assert.equal((await pool.query('select writer_protocol from public_read_state')).rows[0].writer_protocol, 1);
    const fixture = makeBlogFixture(10), repo = createPostgresBlogRepository(pool);
    const save = async post => repo.savePost({ post, version: fixture.versions.find(v => v.id === post.currentVersionId), tags: fixture.tags.filter(v => v.postId === post.id), sources: fixture.sources.filter(v => v.postId === post.id), assets: [], publishJobs: [] });
    for (const post of fixture.posts) await save(post);
    const marker = async id => (await pool.query("select * from public_read_sources where kind='blog' and source_id=$1", [id])).rows[0];
    const state = async () => (await pool.query('select * from public_read_state')).rows[0];
    const run = options => runLocalProjection(pool, { confirmOwnedLocal: true, ...options });
    await t.test('relations and deletes have durable markers; rollback and marker failure preserve originals', async () => {
      const before = await marker('perf-0000'); assert(BigInt(before.metadata_revision) > 0n);
      await pool.query("update post_tags set tag='changed' where id='perf-0000-tag-0'");
      assert(BigInt((await marker('perf-0000')).metadata_revision) > BigInt(before.metadata_revision));
      const current = await state(), client = await pool.connect();
      try {
        await client.query('begin'); await client.query('select public_read_lock()');
        await client.query("update posts set status='retracted' where id='perf-0000'");
        await client.query('rollback');
      } finally { client.release(); }
      assert.deepEqual(await state(), current);
      assert.equal((await repo.findPublicBlogContentBySlug('perf-0000')).posts.length, 1);
      await pool.query('alter table public_read_sources rename to public_read_sources_unavailable');
      try { await assert.rejects(repo.retractPost({ postId: 'perf-0000', reason: '검수', createdAt: '2026-11-17T00:00:00.000Z', actorId: 'owner' })); }
      finally { await pool.query('alter table public_read_sources_unavailable rename to public_read_sources'); }
      assert.deepEqual(await state(), current);
      assert.equal((await pool.query('select count(*)::int n from admin_actions')).rows[0].n, 0);
      await pool.query("delete from posts where id='perf-draft'");
      assert.equal((await marker('perf-draft')).deleted, true);
    });
    await t.test('global revision follows commit order and private Brain edits keep the reviewed selection', async () => {
      const a = await pool.connect(), b = await pool.connect();
      try {
        await a.query('begin'); await a.query('select public_read_lock()');
        await a.query("update post_tags set tag='first' where id='perf-0000-tag-0'");
        const revision = (await a.query('select source_revision from public_read_state')).rows[0].source_revision;
        await b.query('begin'); const waiting = b.query('select public_read_lock()');
        assert.equal(await Promise.race([waiting.then(() => true), delay(30).then(() => false)]), false);
        await a.query('commit'); await waiting;
        await b.query("update post_tags set tag='second' where id='perf-0000-tag-0'"); await b.query('commit');
        assert(BigInt((await state()).source_revision) > BigInt(revision));
      } finally { await a.query('rollback'); await b.query('rollback'); a.release(); b.release(); }
      const brain = createBrainRepository(pool), command = n => ({ commandId: randomUUID(), commandRevision: n });
      const draft = { title: 'PRIVATE_TITLE', originalText: 'PRIVATE_ORIGINAL', publicTitle: '공개 메모', publicSummary: '요약', publicBody: '공개 문단', kind: 'learning', topic: 'data', basis: 'implementation', tags: [] };
      const saved = await brain.saveDraft(draft, undefined, 0, command(0));
      const c = command(1); await brain.publish(saved.id, 1, true, c);
      const before = await state(); await brain.publish(saved.id, 1, true, c); assert.deepEqual(await state(), before);
      await brain.saveDraft({ ...draft, publicTitle: 'PRIVATE_NEWER' }, saved.id, 1, command(2));
      assert.deepEqual(await state(), before);
      assert.equal((await brain.findPublicGraph()).nodes[0].title, '공개 메모');
    });
    await t.test('public repository queries keep one snapshot during withdrawal', async () => {
      for (const method of ['findPublicBlogContent', 'findPublicBlogContentBySlug']) {
        let withdrew = false;
        const observe = async (query, args) => {
          const result = await query(...args);
          if (!withdrew && /select \* from posts/.test(args[0])) {
            withdrew = true;
            await pool.query("update posts set status='retracted' where id='perf-0000'");
            await pool.query("update post_tags set tag='snapshot-race' where id='perf-0000-tag-0'");
          }
          return result;
        };
        const observed = createPostgresBlogRepository({ query: (...args) => observe(pool.query.bind(pool), args), connect: async () => {
          const client = await pool.connect();
          return { release: () => client.release(), query: (...args) => observe(client.query.bind(client), args) };
        } });
        const snapshot = await observed[method]('perf-0000');
        assert(withdrew); assert(snapshot.posts.some(p => p.id === 'perf-0000'));
        assert.equal(snapshot.tags.find(tag => tag.id === 'perf-0000-tag-0').tag, 'second');
        assert.equal((await repo.findPublicBlogContentBySlug('perf-0000')).posts.length, 0);
        await pool.query("update posts set status='published' where id='perf-0000'");
        await pool.query("update post_tags set tag='second' where id='perf-0000-tag-0'");
      }
    });
    await t.test('catch-up includes IDs before the cursor and CAS rejects a last-moment withdrawal', async () => {
      let changed = false, withdrew = false;
      const result = await run({ command: 'rebuild', kind: 'all', batchSize: 2, onProgress: async progress => {
        if (progress.status === 'building' && !changed) {
          changed = true;
          const post = { ...fixture.posts[0], id: 'aaa', slug: 'aaa', currentVersionId: 'aaa-v1' };
          await repo.savePost({ post, version: { ...fixture.versions[0], id: 'aaa-v1', postId: 'aaa' }, tags: [], sources: [], assets: [], publishJobs: [] });
          await pool.query("update post_tags set tag='after-scan' where id='perf-0000-tag-0'");
          await pool.query("delete from posts where id='perf-0001'");
        }
        if (progress.status === 'validating' && !withdrew) {
          withdrew = true;
          await pool.query("update posts set status='retracted' where id='perf-0000'");
        }
      } });
      assert(changed && withdrew); assert.equal(result.status, 'active');
      const rows = (await pool.query('select * from public_read_entries where generation_id=$1', [result.generation])).rows;
      assert(rows.some(r => r.source_id === 'aaa')); assert(!rows.some(r => r.source_id === 'perf-0001'));
      assert.equal(rows.find(r => r.source_id === 'perf-0000').payload, null);
      assert.doesNotMatch(JSON.stringify(rows), /PRIVATE_NEWER|PRIVATE_ORIGINAL/);
      assert.equal((await pool.query('select checked_revision from public_read_generations where id=$1', [result.generation])).rows[0].checked_revision, (await state()).source_revision);
    });
    await t.test('snapshots see one public selection and stale entries cannot be reused or repaired late', async () => {
      const { withPublicReadSnapshot, findCurrentProjection } = await import('../lib/public-read-transaction.ts');
      const key = { kind: 'blog', source_id: 'aaa' }, context = projectionContext();
      await withPublicReadSnapshot(pool, async client => {
        const first = await findCurrentProjection(client, key, context); assert(first);
        await pool.query("update posts set status='retracted' where id='aaa'");
        assert.deepEqual(await findCurrentProjection(client, key, context), first);
      });
      assert.equal(await withPublicReadSnapshot(pool, client => findCurrentProjection(client, key, context)), undefined);
      let changed = false;
      await assert.rejects(run({ command: 'repair', kind: 'blog', id: 'aaa', onProgress: async progress => {
        if (progress.status === 'repairing') { changed = true; await pool.query("update posts set status='published' where id='aaa'"); }
      } }), /stale_source/);
      assert(changed);
      assert.equal(await withPublicReadSnapshot(pool, client => findCurrentProjection(client, key, context)), undefined);
      await run({ command: 'rebuild', kind: 'all' });
      assert(await withPublicReadSnapshot(pool, client => findCurrentProjection(client, key, context)));
      const blocked = projectionContext({ restrictedTerms: [{ category: 'organization_name', value: '합성 검수' }] });
      assert.equal(await withPublicReadSnapshot(pool, client => findCurrentProjection(client, key, blocked)), undefined);
    });
    await t.test('all public relations invalidate; scoped rebuild drops previously deleted originals', async () => {
      const revision = async id => BigInt((await marker(id)).metadata_revision);
      let before = await revision('perf-0002');
      await pool.query("update post_sources set title='새 출처 제목' where post_id='perf-0002'");
      assert(await revision('perf-0002') > before); before = await revision('perf-0002');
      await pool.query("update post_versions set title='새 버전 제목' where id='perf-0002-v1'");
      assert(await revision('perf-0002') > before); before = await revision('perf-0002');
      await pool.query(`insert into post_assets(id,post_id,post_version_id,type,path,alt,status,generated_by,created_at)
        values('marker-asset','perf-0002','perf-0002-v1','diagram','/missing.svg','합성 그림','failed','fixture',now())`);
      assert(await revision('perf-0002') > before); before = await revision('perf-0002');
      await pool.query("update post_assets set alt='바뀐 설명' where id='marker-asset'");
      assert(await revision('perf-0002') > before); before = await revision('perf-0002');
      await pool.query("delete from post_assets where id='marker-asset'");
      assert(await revision('perf-0002') > before); before = await revision('perf-0002');
      const other = await revision('perf-0003');
      await pool.query("update post_tags set post_id='perf-0003',tag='moved-tag' where id='perf-0002-tag-0'");
      assert(await revision('perf-0002') > before); assert(await revision('perf-0003') > other);
      await pool.query("delete from posts where id='perf-0002'");
      assert.equal((await marker('perf-0002')).deleted, true);
      const scoped = await run({ command: 'rebuild', kind: 'brain' });
      assert.equal((await pool.query("select 1 from public_read_entries where generation_id=$1 and source_id='perf-0002'", [scoped.generation])).rowCount, 0);
      before = await revision('perf-0003');
      await pool.query('truncate post_tags');
      assert(await revision('perf-0003') > before);
      await run({ command: 'rebuild', kind: 'all' });
      await pool.query('truncate posts cascade');
      assert.equal((await marker('perf-0003')).deleted, true);
      assert.equal((await run({ command: 'rebuild', kind: 'all' })).counts.ready, 1);
    });
  } finally { await pool.end(); await admin.query(`drop database ${name}`); await admin.end(); }
});
