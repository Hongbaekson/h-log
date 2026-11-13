import assert from 'node:assert/strict';
import test from 'node:test';
import { statistics, makeBlogFixture, makeBrainFixture } from './performance-fixtures.mjs';
import { getPublicBlogIndex, getPublicBlogPostBySlug } from '../lib/blog-public.ts';
import { mergePublishedBrain } from '../lib/brain-curation.ts';
import { selectPublicBrain } from '../lib/brain.ts';
import { brainCatalog } from '../lib/brain-catalog.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('HTTP p95 uses nearest rank and refuses a small or invalid sample', () => {
  assert.deepEqual(statistics(Array.from({length:30},(_,i)=>30-i),true), {count:30,min:1,median:15.5,p95:29,max:30});
  assert.deepEqual(statistics([7,1,5]),{count:3,min:1,median:5,max:7});
  for(const sample of [[],[NaN],[Infinity],[-1]])assert.throws(()=>statistics(sample));
  assert.throws(()=>statistics([1,2,3],true));
});

test('deterministic Blog fixture preserves selected versions and excludes private records', () => {
  const fixture=makeBlogFixture(10);
  assert.deepEqual(fixture,makeBlogFixture(10));
  assert.equal(fixture.posts.length,12);
  assert.equal(fixture.versions.length,24);
  const index=getPublicBlogIndex(fixture);
  assert.equal(index.pagination.totalItems,10);assert.equal(index.posts.length,6);
  assert.equal(fixture.assets.length,0);
  assert(!JSON.stringify(index).includes('PERF_PRIVATE'));
  assert.equal(getPublicBlogPostBySlug('perf-draft',fixture),undefined);
  assert.equal(getPublicBlogPostBySlug('perf-retracted',fixture),undefined);
  assert(fixture.versions.some(v=>v.title.includes('PERF_PRIVATE')));
});

test('CPU and DB graph fixtures have identical visible nodes and edges at every size', () => {
  const base=selectPublicBrain(brainCatalog);
  for(const count of [28,100,300,1000]) {
    const {graph,snapshots}=makeBrainFixture(count);
    assert.deepEqual(makeBrainFixture(count),{graph,snapshots});
    assert.equal(graph.nodes.length,count);assert.equal(graph.edges.length,count*1.5);
    assert.deepEqual(graph,mergePublishedBrain(base,snapshots));
    const ids=new Set(graph.nodes.map(n=>n.id));assert.equal(ids.size,count);
    assert(graph.edges.every(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to));
    assert.equal(new Set(graph.edges.map(e=>e.from+'|'+e.to)).size,graph.edges.length);
  }
});

test('benchmark requires local opt-in and refuses arbitrary connection arguments', () => {
  const script=fileURLToPath(new URL('./performance-baseline.mjs',import.meta.url));
  for(const args of [[],['--local','--database-url=postgresql://example.invalid/live']]) {
    const child=spawnSync(process.execPath,['--no-warnings','--experimental-strip-types',script,...args],{encoding:'utf8',timeout:10000});
    assert.equal(child.status,1);assert.match(child.stderr,/Usage:/);assert.equal(child.stdout,'');
  }
});

test('local opt-in still refuses a remote Docker daemon before creating resources', () => {
  const script=fileURLToPath(new URL('./performance-baseline.mjs',import.meta.url));
  const child=spawnSync(process.execPath,['--no-warnings','--experimental-strip-types',script,'--local'],{
    encoding:'utf8',timeout:10000,env:{...process.env,DOCKER_CONTEXT:'',DOCKER_HOST:'tcp://example.invalid:2375'},
  });
  assert.equal(child.status,1);assert.match(child.stderr,/local Docker socket is required/);
  assert.match(child.stdout,/cleanup=true/);assert(!child.stdout.includes('Building'));
});
