// Opt in only against a migrated, empty, disposable loopback database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';
import ts from 'typescript';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { fingerprint, makeBlogFixture } from './performance-fixtures.mjs';

test('Markdown reads only the selected post at 10 and 1000 posts, preserving response bytes', {
  skip: process.env.HLOG_MARKDOWN_READ_TEST !== '1',
}, async t => {
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(database.hostname, '127.0.0.1');
  assert.match(database.pathname, /^\/hlog_markdown_[a-z0-9_]+$/);
  assert(!database.search);
  const pool = new pg.Pool({ connectionString: database.href });
  const previousPool = globalThis.hlogBlogPublicPool;
  const queries = [];
  // Observe the real repository's returned rows; do not replace its SQL or results.
  globalThis.hlogBlogPublicPool = { connect: async () => {
    const client = await pool.connect();
    return { release: () => client.release(), query: async (...args) => {
      const result = await client.query(...args);
      if (result.command === 'SELECT') queries.push(result.rows);
      return result;
    } };
  } };
  const repository = createPostgresBlogRepository(pool);
  try {
    assert.equal((await pool.query('select count(*)::int n from posts')).rows[0].n, 0);
    // Resolve Next aliases for Node, retaining the actual route and production loaders.
    const path = new URL('../app/blog-markdown/[slug]/route.ts', import.meta.url);
    const source = (await readFile(path, 'utf8')).replace(/"@\/([^"\n]+)"/g,
      (_, relative) => JSON.stringify(new URL('../' + relative + '.ts', import.meta.url).href));
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
    const { GET } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
    for (const count of [10, 1000]) await t.test(`${count} posts`, async () => {
      await pool.query('truncate posts cascade');
      const fixture = makeBlogFixture(count);
      for (const post of fixture.posts) for (const version of fixture.versions.filter(v => v.postId === post.id)) {
        await repository.savePost({ post: { ...post, currentVersionId: version.id }, version, tags: fixture.tags.filter(v => v.postId === post.id),
          sources: fixture.sources.filter(v => v.postId === post.id), assets: [], publishJobs: [] });
      }
      await pool.query("update posts set current_version_id=id||'-v1'");
      const before = fingerprint((await pool.query('select * from post_versions order by id')).rows);
      queries.length = 0;
      const response = await GET(new Request('http://127.0.0.1/blog/perf-0000.md'), {
        params: Promise.resolve({ slug: 'perf-0000' }),
      });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), fixture.versions[0].contentMarkdown);
      assert.equal(queries.flat().filter(row => 'content_markdown' in row).length, 1,
        'One Markdown request must fetch exactly one current body regardless of catalogue size');
      assert.equal(queries.length, 5);
      assert.equal(queries.flat().length, 6, 'One post, one version, three tags and one source');
      assert(queries.flat().every(row => (row.post_id ?? row.id) === 'perf-0000'));
      assert.equal(fingerprint((await pool.query('select * from post_versions order by id')).rows), before);
    });
  } finally {
    if (previousPool === undefined) delete globalThis.hlogBlogPublicPool;
    else globalThis.hlogBlogPublicPool = previousPool;
    await pool.end();
  }
});
