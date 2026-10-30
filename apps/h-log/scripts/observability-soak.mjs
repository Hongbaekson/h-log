// Local, bounded observation only. Never accepts an arbitrary Docker project or production URL.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile, appendFile, open, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const day = 86400_000, interval = 60_000;
const limits = { memoryBytes: 1024 ** 3, cpuCores: 1, storageBytes: 3 * 1024 ** 3,
  series: 5000, businessSeries: 500, maxSourceAgeSeconds: 180, maxScrapeSeconds: 10,
  failedTargets: 0, firing: 0, notifications: 0, restarts: 0 };
export function parseBytes(value) {
  const match = /^(\d+(?:\.\d+)?)(B|kB|MB|GB|KiB|MiB|GiB)$/.exec(value.trim());
  assert(match, 'unrecognized Docker size');
  return Number(match[1]) * ({ B: 1, kB: 1000, MB: 1e6, GB: 1e9, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 })[match[2]];
}
export function assessSoak(samples) {
  const failures = new Set(), peaks = {};
  for (const [index, row] of samples.entries()) {
    if (row.error) failures.add('sample_failed');
    if (row.sequence !== index || !Number.isFinite(row.at) || !Number.isFinite(row.elapsedMs)) failures.add('sequence');
    if (row.oom || row.identityChanged) failures.add('container_continuity');
    const previous = samples[index - 1];
    if (previous) {
      const elapsed = row.elapsedMs - previous.elapsedMs, wall = row.at - previous.at;
      if (elapsed < 0 || elapsed > 90_000 || Math.abs(wall - elapsed) > 5000) failures.add('observation_gap');
    }
    for (const [key, limit] of Object.entries(limits)) {
      if (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > limit) failures.add(key);
      peaks[key] = Math.max(peaks[key] ?? 0, row[key]);
    }
    if (!Number.isFinite(row.logBytes) || row.logBytes < 0 || (previous && row.logBytes < previous.logBytes)) failures.add('logBytes');
  }
  const elapsedMs = samples.length ? samples.at(-1).elapsedMs - samples[0].elapsedMs : 0;
  return { status: failures.size ? 'failed' : elapsedMs >= day ? 'passed' : 'pending',
    samples: samples.length, elapsedMs, failures: [...failures], peaks,
    logGrowthBytes: samples.length ? samples.at(-1).logBytes - samples[0].logBytes : 0 };
}

const app = resolve(import.meta.dirname, '..');
const directory = resolve(app, 'private/observe-step6');
const execute = promisify(execFile);
const docker = async args => (await execute('docker', args, { cwd: app, windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 ** 2 })).stdout.trim();
const monitors = ['prometheus', 'grafana', 'monitoring-gateway', 'node-exporter', 'postgres-exporter', 'blackbox-exporter', 'hlog-metrics'];
const project = 'hlog-observe-probes-local';
const descriptorPath = resolve(directory, 'stack.json');
const rowsPath = resolve(directory, 'samples.jsonl');
async function readRows() { return (await readFile(rowsPath, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
async function saveResult(value) {
  const target = resolve(directory, 'result.json');
  await writeFile(target + '.tmp', JSON.stringify(value, null, 2)); await rename(target + '.tmp', target);
}
async function ownedContainers() {
  const ids = (await docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`])).split(/\s+/).filter(Boolean);
  assert(ids.length > 0, 'isolated stack is absent');
  return JSON.parse(await docker(['inspect', ...ids]));
}
async function run(minutes) {
  assert(Number.isInteger(minutes) && minutes >= 1 && minutes <= 1441, 'duration must be 1..1441 minutes');
  const descriptor = JSON.parse(await readFile(descriptorPath, 'utf8'));
  assert.equal(descriptor.project, project);
  const url = new URL(descriptor.origin); assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.protocol, 'http:');
  // A run cannot be resumed by appending fresh timestamps to an old observation.
  const lock = await open(resolve(directory, 'run.lock'), 'wx'); await lock.close();
  await writeFile(rowsPath, '', { flag: 'wx' });
  const baseline = await ownedContainers();
  // Docker ps emits short IDs; inspect resolves both short and full descriptors.
  const expected = JSON.parse(await docker(['inspect', ...descriptor.ids]));
  assert.deepEqual(baseline.map(x => x.Id).sort(), expected.map(x => x.Id).sort(), 'stack was replaced after the rehearsal');
  const byService = name => baseline.find(x => x.Config.Labels['com.docker.compose.service'] === name);
  for (const name of monitors) assert(byService(name), `missing ${name}`);
  const password = (await readFile(descriptor.passwordFile, 'utf8')).trim();
  const authorization = `Basic ${Buffer.from('owner:' + password).toString('base64')}`;
  const api = async path => {
    const response = await fetch(descriptor.origin + path, { headers: { authorization }, signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200); return response.json();
  };
  const metric = async expr => {
    const data = await api('/api/datasources/proxy/uid/hlog-prometheus/api/v1/query?' + new URLSearchParams({ query: expr }));
    assert.equal(data.data.result.length, 1, 'required measurement is missing');
    const n = Number(data.data.result[0].value[1]); assert(Number.isFinite(n)); return n;
  };
  const start = performance.now(), startedAt = Date.now(), samples = [];
  let logBytes = 0, previousWall = startedAt;
  try {
    for (let sequence = 0; ; sequence++) {
      const row = { sequence, at: Date.now(), elapsedMs: performance.now() - start };
      try {
        const current = await ownedContainers();
        row.identityChanged = current.length !== baseline.length || current.some(x => !baseline.some(b => b.Id === x.Id));
        row.oom = current.some(x => x.State.OOMKilled);
        row.restarts = current.reduce((sum, x) => sum + x.RestartCount, 0);
        assert(current.every(x => x.State.Running), 'a fixture or monitored service stopped');
        const stats = (await docker(['stats', '--no-stream', '--format', '{{json .}}', ...monitors.map(name => byService(name).Id)])).split('\n').map(line => JSON.parse(line));
        assert.equal(stats.length, monitors.length);
        row.memoryBytes = stats.reduce((sum, x) => sum + parseBytes(x.MemUsage.split('/')[0]), 0);
        row.cpuCores = stats.reduce((sum, x) => sum + Number(x.CPUPerc.replace('%', '')) / 100, 0);
        const sizes = await Promise.all([['prometheus', '/prometheus'], ['grafana', '/var/lib/grafana']].map(async ([name, path]) => Number((await docker(['exec', byService(name).Id, 'du', '-sk', path])).split(/\s/)[0]) * 1024));
        // Do not save raw logs. stdout and stderr bytes are counted, bounded and discarded.
        for (const name of monitors) if (byService(name).HostConfig.LogConfig.Type !== 'none') {
          const output = await execute('docker', ['logs', '--since', new Date(previousWall).toISOString(), '--until', new Date(row.at).toISOString(), byService(name).Id], { windowsHide: true, timeout: 5000, maxBuffer: 1024 ** 2 });
          logBytes += Buffer.byteLength(output.stdout) + Buffer.byteLength(output.stderr);
        }
        row.logBytes = logBytes;
        // Include the full bounded log allocation and state/tmp allowance; du includes WAL/head.
        row.storageBytes = sizes.reduce((a, b) => a + b, 0) + 242 * 1024 ** 2;
        const values = await Promise.all([
          'max(prometheus_tsdb_head_series)', 'count({__name__=~"hlog_.+"})',
          'max(time() - hlog_metrics_collected_timestamp_seconds)', 'max(scrape_duration_seconds)',
          '(7 - count(up == 1)) + (2 - sum(probe_success))',
        ].map(metric));
        [row.series, row.businessSeries, row.maxSourceAgeSeconds, row.maxScrapeSeconds, row.failedTargets] = values;
        const rules = (await api('/api/prometheus/grafana/api/v1/rules')).data.groups.flatMap(group => group.rules);
        assert.equal(rules.length, 43);
        row.firing = rules.filter(rule => rule.state !== 'inactive' || rule.health !== 'ok').length;
        const events = (await readFile(resolve(descriptor.scratch, 'events.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        // A delayed resolution from the rehearsal is not a new normal-state alarm.
        row.notifications = events.filter(event => !Number.isFinite(Date.parse(event.observed_at)) || Date.parse(event.observed_at) >= startedAt).length;
      } catch { row.error = 'sample_failed'; }
      samples.push(row); previousWall = row.at;
      await appendFile(rowsPath, JSON.stringify(row) + '\n', { flush: true });
      const result = { ...assessSoak(samples), startedAt: new Date(startedAt).toISOString(), lastSampleAt: new Date(row.at).toISOString(),
        plannedMinutes: minutes, scope: 'local fixture; sampled peaks, not production or seven-day retention proof' };
      await saveResult(result);
      if (result.status === 'failed' || row.elapsedMs >= minutes * interval) break;
      await delay(Math.max(0, (sequence + 1) * interval - (performance.now() - start)));
    }
  } finally {
    // Bound resource use even after an assertion. Stop only the IDs pinned before this run.
    await docker(['stop', '--time', '10', ...baseline.map(x => x.Id)]);
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv[2] === 'status') {
      const samples = await readRows(), result = assessSoak(samples);
      const lastAt = samples.at(-1)?.at ?? (await stat(resolve(directory, 'run.lock'))).mtimeMs;
      if (result.status === 'pending' && Date.now() - lastAt > 90_000) {
        result.status = 'failed'; result.failures.push('sampling_stopped');
      }
      console.log(JSON.stringify(result, null, 2));
    }
    else if (process.argv[2] === 'run') await run(Number(process.argv[3] ?? 1441));
    else throw Error('usage: observability-soak.mjs run [1..1441 minutes] | status');
  } catch { console.error('Local soak failed; inspect the private result and stack descriptor.'); process.exitCode = 1; }
}
