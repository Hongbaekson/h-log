// Opt in only against an empty disposable DB and its loopback Next server.
import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { createPostVersionContentFromMarkdown } from '../lib/blog-content-model.ts';
import { fingerprint, makeBlogFixture } from './performance-fixtures.mjs';

test('Markdown rewrite, current publication, privacy and failure contracts', {
  skip: process.env.HLOG_MARKDOWN_HTTP_TEST !== '1',
}, async t => {
  const origin = new URL(process.env.HLOG_MARKDOWN_HTTP_ORIGIN);
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(origin.protocol, 'http:');
  assert.equal(origin.hostname, '127.0.0.1');
  assert.equal(origin.pathname, '/');
  assert(!origin.username && !origin.password && !origin.search && !origin.hash);
  assert.equal(database.hostname, '127.0.0.1');
  assert.match(database.pathname, /^\/hlog_markdown_[a-z0-9_]+$/);
  assert(!database.search);
  const pool = new pg.Pool({ connectionString: database.href });
  const repository = createPostgresBlogRepository(pool);
  const paths = ['/blog/perf-0000.md', '/blog-markdown/perf-0000'];
  const get = async (path, status, expected) => {
    const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    assert.equal(response.status, status, path);
    if (status !== 500) assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
    assert(!body.includes('PERF_PRIVATE'), 'unselected or hidden body leaked');
    if (expected !== undefined) {
      assert.equal(body, expected);
      assert.match(response.headers.get('content-type'), /text\/markdown; charset=utf-8/);
    }
  };
  try {
    assert.equal((await pool.query('select count(*)::int n from posts')).rows[0].n, 0);
    const fixture = makeBlogFixture(10);
    for (const post of fixture.posts) for (const version of fixture.versions.filter(v => v.postId === post.id)) {
      await repository.savePost({ post: { ...post, currentVersionId: version.id }, version,
        tags: fixture.tags.filter(v => v.postId === post.id), sources: fixture.sources.filter(v => v.postId === post.id), assets: [], publishJobs: [] });
    }
    await pool.query("update posts set current_version_id=id||'-v1'");
    const original = fixture.versions[0].contentMarkdown;
    const snapshot = async () => fingerprint((await pool.query('select * from post_versions order by id')).rows);
    const before = await snapshot();
    await t.test('rewrite and direct endpoint preserve exact current bytes and hide unavailable slugs', async () => {
      for (const path of paths) await get(path, 200, original);
      for (const slug of ['perf-draft', 'perf-retracted', 'missing', "x' OR '1'='1", '%2F', '한글 없는 글']) {
        for (const path of ['/blog/' + encodeURIComponent(slug) + '.md', '/blog-markdown/' + encodeURIComponent(slug)]) await get(path, 404);
      }
    });
    await t.test('new requests follow version selection and retraction without rewriting history', async () => {
      const next = createPostVersionContentFromMarkdown('## 새 공개 버전\n\n선택된 본문만 반환합니다.\n');
      const version = { ...fixture.versions[0], ...next, id: 'perf-0000-v3', versionNo: 3 };
      await repository.savePost({ post: { ...fixture.posts[0], currentVersionId: version.id }, version, tags: [], sources: [], assets: [], publishJobs: [] });
      try {
        for (const path of paths) await get(path, 200, next.contentMarkdown);
        for (const status of ['unpublished', 'retracted']) {
          await pool.query('update posts set status=$1 where id=$2', [status, 'perf-0000']);
          for (const path of paths) await get(path, 404);
        }
      } finally {
        await pool.query("update posts set status='published',current_version_id='perf-0000-v1' where id='perf-0000'");
        await pool.query("delete from post_versions where id='perf-0000-v3'");
      }
      for (const path of paths) await get(path, 200, original);
      assert.equal(await snapshot(), before);
    });
    await t.test('environment privacy policy still checks tags, sources and current assets', async () => {
      for (const [table, column, id] of [['post_tags', 'tag', 'perf-0000-tag-0'], ['post_sources', 'title', 'perf-0000-source']]) {
        const previous = (await pool.query(`select ${column} as value from ${table} where id=$1`, [id])).rows[0].value;
        try {
          await pool.query(`update ${table} set ${column}=$1 where id=$2`, ['Restricted Fixture Org', id]);
          for (const path of paths) await get(path, 404);
        } finally { await pool.query(`update ${table} set ${column}=$1 where id=$2`, [previous, id]); }
      }
      try {
        await pool.query("insert into post_assets(id,post_id,post_version_id,type,path,alt,generated_by,status,created_at) values('markdown-private-asset','perf-0000','perf-0000-v1','diagram','/blog-assets/test.svg','Restricted Fixture Org','test','ready',now())");
        for (const path of paths) await get(path, 404);
      } finally { await pool.query("delete from post_assets where id='markdown-private-asset'"); }
      for (const path of paths) await get(path, 200, original);
    });
    await t.test('hash mismatch and DB failure keep errors distinct from 404 and recover', async () => {
      try {
        await pool.query("update post_versions set content_markdown='tampered' where id='perf-0000-v1'");
        for (const path of paths) await get(path, 500);
      } finally { await pool.query("update post_versions set content_markdown=$1 where id='perf-0000-v1'", [original]); }
      await pool.query('alter table posts rename to markdown_unavailable_posts');
      try { for (const path of paths) await get(path, 500); }
      finally { await pool.query('alter table markdown_unavailable_posts rename to posts'); }
      for (const path of paths) await get(path, 200, original);
      assert.equal(await snapshot(), before);
    });
  } finally { await pool.end(); }
});
