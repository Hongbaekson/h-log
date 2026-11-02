import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import https from 'node:https';
import { checkServerIdentity } from 'node:tls';

test('monitoring HTML and RSC are owner-only, uncached and contain no raw metrics or credentials', {
  skip: process.env.HLOG_ADMIN_HTTP_TEST !== '1' && 'requires isolated loopback Next server',
}, async () => {
  const origin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname));
  const key = process.env.HLOG_ADMIN_OWNER_KEY;
  assert.match(key, /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from('owner:' + key).toString('base64')}`;
  const path = '/admin/monitoring';
  for (const headers of [{}, { RSC: '1' }, { authorization: 'Basic invalid' }]) {
    const denied = await fetch(new URL(path, origin), { headers });
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await denied.text(), /운영 모니터링|hlog_metrics_/);
  }
  for (const headers of [{ authorization }, { authorization, RSC: '1' }]) {
    const response = await fetch(new URL(path, origin), { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    const body = await response.text();
    assert(body.includes('운영 모니터링'));
    assert(body.includes(process.env.HLOG_MONITORING_EXPECT_TEXT || '모니터링 연결이 설정되지 않았습니다'));
    assert(!body.includes(key));
    assert.doesNotMatch(body, /SECRET-|hlog_metrics_|hlog_usage_|prometheus:9090|iframe|method="post"/i);
    assert(body.includes('127.0.0.1:3030/d/hlog-operations'));
  }
  // Node fetch replaces Host; use the HTTP client to send the actual wrong authority.
  const wrongHost = await new Promise((resolve, reject) => {
    // Validate TLS against the connection target while deliberately spoofing HTTP Host.
    const request = (origin.protocol === 'https:' ? https : http).get(new URL(path, origin), { servername: '', checkServerIdentity: (_, cert) => checkServerIdentity(origin.hostname, cert), headers: { authorization, host: 'public.invalid', 'x-forwarded-host': origin.host } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject);
  });
  assert.equal(wrongHost, 403);
  for (const endpoint of ['/admin/monitoring/api', '/api/monitoring', '/metrics']) {
    assert.equal((await fetch(new URL(endpoint, origin), { headers: { authorization } })).status, 404);
  }
  const publicResponse = await fetch(origin);
  assert.equal(publicResponse.status, 200);
  const home = await publicResponse.text();
  assert.doesNotMatch(home, /href="\/admin\/monitoring|hlog_metrics_|SECRET-/);
});
