// Run with --conditions=react-server to exercise React's real render-scoped cache.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToReadableStream } from 'next/dist/compiled/react-server-dom-webpack/server.node.js';
import * as source from '../lib/blog-public-source.ts';

test('list results are shared within a render, isolated by parameters and fresh in the next render', async () => {
  assert.equal(typeof source.loadPublicBlogIndex, 'function', 'Metadata and page need a shared list loader');
  let queries=0, unavailable=false;
  const originalPool=globalThis.hlogBlogPublicPool, originalUrl=process.env.DATABASE_URL;
  process.env.DATABASE_URL='postgresql://unused.invalid/test';
  globalThis.hlogBlogPublicPool={query:async()=>{queries++;if(unavailable)throw Error('synthetic unavailable');return {rows:[]};}};
  const render=async fn=>{
    const stream=await renderToReadableStream(createElement(async()=>{await fn();return 'checked';}),{});
    assert.match(await new Response(stream).text(),/checked/);
  };
  try {
    let previous;
    for(let request=0;request<2;request++)await render(async()=>{
      const [metadata,page]=await Promise.all([source.loadPublicBlogIndex(1,undefined),source.loadPublicBlogIndex(1,undefined)]);
      assert.strictEqual(metadata,page);
      assert.notStrictEqual(page,previous);
      const tagged=await source.loadPublicBlogIndex(1,'DB');
      const home=await source.loadPublicBlogIndex(1,undefined,3);
      assert.notStrictEqual(tagged,page);assert.equal(tagged.selectedTag,'DB');
      assert.notStrictEqual(home,page);assert.equal(home.pagination.pageSize,3);
      previous=page;
    });
    assert.equal(queries,4,'One two-query empty snapshot per render, shared across list parameters');
    unavailable=true;
    await render(async()=>{
      const errors=await Promise.allSettled([source.loadPublicBlogIndex(1,undefined),source.loadPublicBlogIndex(1,undefined)]);
      assert(errors.every(item=>item.status==='rejected'));
      assert.strictEqual(errors[0].reason,errors[1].reason);
    });
    unavailable=false;
    await render(async()=>assert.equal((await source.loadPublicBlogIndex(1,undefined)).pagination.totalItems,0));
  } finally {
    if(originalPool===undefined)delete globalThis.hlogBlogPublicPool;else globalThis.hlogBlogPublicPool=originalPool;
    if(originalUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=originalUrl;
  }
});
