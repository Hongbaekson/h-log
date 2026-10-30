import assert from 'node:assert/strict';
import test from 'node:test';
import { assessSoak, parseBytes } from './observability-soak.mjs';

const hour = 3600_000;
const healthy = (elapsedMs, sequence) => ({ sequence, at: 1_800_000_000_000 + elapsedMs, elapsedMs,
  memoryBytes: 400 * 1024 ** 2, cpuCores: 0.2, storageBytes: 60 * 1024 ** 2, logBytes: 100,
  series: 800, businessSeries: 120, maxSourceAgeSeconds: 62, maxScrapeSeconds: 1,
  failedTargets: 0, firing: 0, notifications: 0, restarts: 0, oom: false, identityChanged: false });
const day = () => Array.from({ length: 1441 }, (_, i) => healthy(i * 60_000, i));

test('only a continuous full day within the budgets is eligible; short runs remain pending', () => {
  assert.equal(assessSoak(day()).status, 'passed');
  assert.equal(assessSoak(day().slice(0, 30)).status, 'pending');
  assert.equal(assessSoak([]).status, 'pending');
  assert.equal(assessSoak([healthy(0, 0), healthy(24 * hour, 1)]).status, 'failed');
});

test('missing or malformed container evidence cannot certify a full day', () => {
  for (const key of ['oom', 'identityChanged']) {
    for (const value of [undefined, null, 0, '']) {
      const samples = day();
      if (value === undefined) delete samples[100][key]; else samples[100][key] = value;
      const result = assessSoak(samples);
      assert.equal(result.status, 'failed', `${key}: ${String(value)}`);
      assert(result.failures.includes('container_continuity'));
    }
  }
});

test('reports the remaining observation time without counting missing wall-clock time', () => {
  const pending = assessSoak(day().slice(0, 121));
  assert.equal(pending.minimumDurationMs, 24 * hour);
  assert.equal(pending.remainingMs, 22 * hour);
  assert.equal(assessSoak(day()).remainingMs, 0);
  assert.equal(assessSoak([]).remainingMs, 24 * hour);
  const broken = day(); delete broken[100].oom;
  assert.equal(assessSoak(broken).remainingMs, null, 'failed observation needs a new run, not a countdown');
});

test('wall-clock jumps, missing samples, restarted containers and failed collection cannot pass', () => {
  for (const change of [
    row => { row.at += 600_000; }, row => { row.sequence++; }, row => { row.elapsedMs -= 600_000; },
    row => { row.error = 'sample_failed'; }, row => { row.restarts = 1; }, row => { row.oom = true; },
    row => { row.identityChanged = true; }, row => { delete row.storageBytes; }, row => { row.cpuCores = NaN; }, row => { row.logBytes = 0; },
  ]) {
    const samples = day(); change(samples[100]); assert.equal(assessSoak(samples).status, 'failed');
  }
});

test('resource, series, stale collection, missing probes and unexpected notification failures stay visible', () => {
  for (const [key, value] of Object.entries({ memoryBytes: 1024 ** 3 + 1, cpuCores: 1.01,
    storageBytes: 3 * 1024 ** 3 + 1, series: 5001, businessSeries: 501,
    maxSourceAgeSeconds: 181, maxScrapeSeconds: 11, failedTargets: 1, firing: 1, notifications: 1 })) {
    const samples = day(); samples[100][key] = value;
    const result = assessSoak(samples); assert.equal(result.status, 'failed', key); assert(result.failures.includes(key));
  }
  const samples = day(); samples.at(-1).logBytes = 200;
  assert.equal(assessSoak(samples).logGrowthBytes, 100);
});

test('Docker human-readable sizes are converted without silently treating unknown units as zero', () => {
  assert.equal(parseBytes('1.5MiB'), 1.5 * 1024 ** 2);
  assert.equal(parseBytes('20kB'), 20_000); assert.equal(parseBytes('0B'), 0);
  assert.throws(() => parseBytes('unknown'));
});
