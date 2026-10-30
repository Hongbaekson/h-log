// Reuse the full maximum-PDF rehearsal while the isolated monitoring stack is observed.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile, chmod, unlink, rmdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { parseBytes } from './observability-soak.mjs';

assert.equal(process.env.HLOG_OBSERVABILITY_PDF_LOAD, '1', 'explicit local opt-in required');
const app = resolve(import.meta.dirname, '..'), output = resolve(app, 'private/observe-step6');
const execute = promisify(execFile);
const docker = async args => (await execute('docker', args, { cwd: app, windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 ** 2 })).stdout.trim();
const descriptor = JSON.parse(await readFile(resolve(output, 'stack.json'), 'utf8'));
assert.equal(descriptor.project, 'hlog-observe-probes-local');
const containers = JSON.parse(await docker(['inspect', ...descriptor.ids]));
assert(containers.every(c => c.State.Running && c.Config.Labels['com.docker.compose.project'] === descriptor.project));
const services = ['prometheus', 'grafana', 'monitoring-gateway', 'node-exporter', 'postgres-exporter', 'blackbox-exporter', 'hlog-metrics'];
const ids = containers.filter(c => services.includes(c.Config.Labels['com.docker.compose.service'])).map(c => c.Id);
assert.equal(ids.length, 7);
const host = containers.find(c => c.Config.Labels['com.docker.compose.service'] === 'node-exporter').Id;
const image = (await docker(['image', 'inspect', 'hlog-web:observe-step6', '--format', '{{.Id}}'])).trim();
const scratch = await mkdtemp(resolve(tmpdir(), 'hlog-observe-pdf-'));
await chmod(scratch, 0o700);
if (process.platform === 'win32') await execute('icacls', [scratch, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:(OI)(CI)F`]);
const password = randomBytes(24).toString('hex'), container = 'hlog-resume-observe-' + randomUUID().slice(0, 8);
const path = name => resolve(scratch, name);
let db, done = false, sampling;
const peaks = { memoryBytes: 0, cpuCores: 0, minHostAvailableBytes: Number.MAX_SAFE_INTEGER, samples: 0 };
try {
  await writeFile(path('password'), password, { mode: 0o444 });
  const openssl = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
  await execute(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-keyout', path('local.key'), '-out', path('local.crt')]);
  db = await docker(['run', '-d', '--name', container, '--tmpfs', '/var/lib/postgresql/data', '-p', '127.0.0.1::5432', '--mount', `type=bind,source=${path('password')},target=/run/secrets/password,readonly`, '-e', 'POSTGRES_DB=hlog', '-e', 'POSTGRES_PASSWORD_FILE=/run/secrets/password', 'pgvector/pgvector:pg16@sha256:a36250871de0833b8757561c72f2477ef1ddd1101afa4e617fb552e0de514c6b']);
  for (let i = 0; ; i++) { try { await docker(['exec', db, 'pg_isready', '-U', 'postgres']); break; } catch { if (i === 40) throw Error('DB readiness'); await delay(250); } }
  const info = JSON.parse(await docker(['inspect', db]))[0];
  const startedAt = Date.now();
  sampling = (async () => {
    while (!done) {
      const rows = (await docker(['stats', '--no-stream', '--format', '{{json .}}', ...ids])).split('\n').map(line => JSON.parse(line));
      assert.equal(rows.length, 7);
      peaks.memoryBytes = Math.max(peaks.memoryBytes, rows.reduce((sum, r) => sum + parseBytes(r.MemUsage.split('/')[0]), 0));
      peaks.cpuCores = Math.max(peaks.cpuCores, rows.reduce((sum, r) => sum + Number(r.CPUPerc.replace('%', '')) / 100, 0));
      const mem = await docker(['exec', host, 'cat', '/proc/meminfo']);
      peaks.minHostAvailableBytes = Math.min(peaks.minHostAvailableBytes, Number(mem.match(/^MemAvailable:\s+(\d+)/m)[1]) * 1024);
      peaks.samples++;
      await delay(1000);
    }
  })();
  // Capture failures immediately while the subprocess is active, without an unhandled rejection.
  let sampleError; sampling = sampling.catch(error => { sampleError = error; });
  const result = await execute(process.execPath, ['--no-warnings', '--experimental-strip-types', 'scripts/resume-pdf.rehearsal.mjs'], { cwd: app, windowsHide: true, timeout: 900000, maxBuffer: 4 * 1024 ** 2, env: { ...process.env,
    HLOG_RESUME_REHEARSAL: '1', DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${info.NetworkSettings.Ports['5432/tcp'][0].HostPort}/hlog`,
    HLOG_RESUME_DB_CONTAINER: container, HLOG_RESUME_REHEARSAL_CERT_DIR: scratch, NODE_EXTRA_CA_CERTS: path('local.crt'), HLOG_RESUME_REHEARSAL_IMAGE: image } });
  done = true; await sampling; if (sampleError) throw sampleError;
  const resultPath = resolve(app, 'private/resume-rehearsal/result.json');
  assert((await stat(resultPath)).mtimeMs >= startedAt, 'must use this run result');
  const pdf = JSON.parse(await readFile(resultPath, 'utf8'));
  assert(peaks.samples > 0 && peaks.memoryBytes <= 1024 ** 3 && peaks.cpuCores <= 1);
  await writeFile(resolve(output, 'pdf-load.json'), JSON.stringify({ startedAt: new Date(startedAt).toISOString(), endedAt: new Date().toISOString(), image, monitorPeaks: peaks, pdf }, null, 2));
  console.log(result.stdout.trim());
  console.log('PASS: maximum synthetic PDF rehearsal with concurrent monitoring samples');
} catch (error) {
  await writeFile(resolve(output, 'pdf-load-error.log'), String(error.stderr ?? error.message).replaceAll(password, '[redacted]'));
  throw Error('PDF load failed; see private evidence');
} finally {
  done = true; if (sampling) await sampling;
  if (db) await docker(['rm', '-f', db]);
  for (const name of ['password', 'local.key', 'local.crt']) await unlink(path(name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await rmdir(scratch);
}
