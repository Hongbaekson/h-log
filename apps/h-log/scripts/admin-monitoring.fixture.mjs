// Opt-in bridge for the existing isolated probe rehearsal; never used by the app.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { monitoringQuery, readAdminMonitoring } from '../lib/admin-monitoring.ts';

export async function startAdminMonitoringFixture({ origin, authorization }) {
  const adminOrigin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  assert.equal(adminOrigin.protocol, 'http:');
  assert.equal(adminOrigin.hostname, '127.0.0.1');
  const key = process.env.HLOG_ADMIN_OWNER_KEY;
  assert.match(key, /^[a-f0-9]{64}$/);
  const adminAuthorization = `Basic ${Buffer.from('owner:' + key).toString('base64')}`;
  const directory = new URL('../private/admin-monitoring/', import.meta.url);
  await mkdir(directory, { recursive: true });
  let mode = 'normal', lastPayload;
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      assert.equal(request.method, 'GET'); assert.equal(url.pathname, '/api/v1/query');
      assert.equal(url.searchParams.get('query'), monitoringQuery);
      const upstream = await fetch(origin + '/api/datasources/proxy/uid/hlog-prometheus/api/v1/query?' + url.searchParams, { headers: { authorization }, signal: AbortSignal.timeout(2500) });
      lastPayload = await upstream.json();
      await writeFile(new URL('last-upstream.json', directory), JSON.stringify(lastPayload));
      assert.equal(upstream.status, 200);
      if (mode === 'stale') {
        // Explicit timestamp fixture, not a real clock change or new collection.
        for (const row of lastPayload.data.result) if (row.metric.__name__ === 'hlog_metrics_collected_timestamp_seconds' && row.metric.source === 'db') row.value[1] = String(Date.now() / 1000 - 181);
      }
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(lastPayload));
    } catch { response.writeHead(503).end(); }
  });
  server.listen(19427, '127.0.0.1'); await once(server, 'listening');
  return {
    async check(name, verify, expectedText, synthetic = false) {
      mode = synthetic ? 'stale' : 'normal';
      const snapshot = await readAdminMonitoring('http://127.0.0.1:19427');
      assert.equal(snapshot.connection, 'ready'); verify(snapshot.data);
      await writeFile(new URL(`snapshot-${name}.json`, directory), JSON.stringify(lastPayload));
      for (const headers of [{ authorization: adminAuthorization }, { authorization: adminAuthorization, RSC: '1' }]) {
        const result = await fetch(new URL('/admin/monitoring', adminOrigin), { headers });
        assert.equal(result.status, 200); assert.match(result.headers.get('cache-control'), /no-store/);
        const body = await result.text();
        assert(body.includes(expectedText), name + ': expected monitoring state');
        assert(!body.includes(key)); assert.doesNotMatch(body, /hlog_metrics_|PRIVATE_CANARY|SECRET-|postgresql:\/\//);
      }
      mode = 'normal';
      console.log('PASS: admin monitoring ' + name + (synthetic ? ' (timestamp fixture)' : ' (real collector/Prometheus)'));
    },
    async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
