import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { monitoringQuery } from '../lib/admin-monitoring.ts';

test('real PromQL preserves metric names and rejects old or explicitly stale series', {
  skip: process.env.HLOG_OBSERVABILITY_RULES_TEST !== '1', timeout: 120000,
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hlog-admin-promql-'));
  const file = join(directory, 'tests.json');
  const sample = (time, expected) => ({ expr: monitoringQuery, eval_time: time, exp_samples: expected });
  const metrics = ['hlog_usage_known_cost_usd{window="day"}', 'hlog_usage_unknown_events{window="day"}'];
  try {
    await writeFile(file, JSON.stringify({ evaluation_interval: '1s', tests: [
      { interval: '1m', input_series: metrics.map(series => ({ series, values: '1 _ _ _' })), promql_expr_test: [sample('179s', metrics.map(labels => ({ labels, value: 1 }))), sample('180s', [])] },
      { interval: '1m', input_series: [{ series: 'up{job="hlog"}', values: '1 stale _ _' }], promql_expr_test: [sample('120s', [])] },
    ] }));
    const compose = await readFile(new URL('../compose.observability.yaml', import.meta.url), 'utf8');
    const image = compose.match(/image: (prom\/prometheus:[^\s]+)/)[1];
    const result = await promisify(execFile)('docker', ['run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/tmp:size=64m,mode=1777', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', `type=bind,source=${directory},target=/fixture,readonly`, '--entrypoint', 'promtool', image, 'test', 'rules', '/fixture/tests.json'], { timeout: 90000, maxBuffer: 100000 });
    assert.match(result.stdout, /SUCCESS/);
  } finally { await unlink(file).catch(() => undefined); await rmdir(directory); }
});
