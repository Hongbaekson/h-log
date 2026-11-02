import assert from 'node:assert/strict';
import test from 'node:test';
import https from 'node:https';
import { checkServerIdentity } from 'node:tls';

test('release ingress enforces exact authority, allowlist and every command origin', {
  skip: process.env.HLOG_ADMIN_RELEASE_TEST !== '1' && 'requires isolated TLS release rehearsal',
}, async () => {
  const origin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  assert.equal(origin.protocol, 'https:'); assert.equal(origin.hostname, '127.0.0.1');
  const authorization = `Basic ${Buffer.from('owner:' + process.env.HLOG_ADMIN_OWNER_KEY).toString('base64')}`;
  const get = (path, options = {}) => fetch(new URL(path, origin), { redirect: 'manual', ...options });
  const root = await get('/'); assert.equal(root.status, 302); assert.equal(new URL(root.headers.get('location'), origin).pathname, '/admin');
  for (const path of ['/blog', '/brain', '/api/search', '/api/resume/pdf', '/metrics', '/probe', '/api/internal', '/administrator', '/_next/image?url=x']) {
    assert.equal((await get(path, { headers: { authorization } })).status, 404, path);
  }
  const wrongAuthority = await new Promise((resolve, reject) => {
    const request = https.get(new URL('/admin', origin), { servername: '', checkServerIdentity: (_, cert) => checkServerIdentity(origin.hostname, cert),
      headers: { authorization, host: 'evil.example', 'x-forwarded-host': origin.host, forwarded: `host=${origin.host}` } }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }); request.on('error', reject);
  });
  assert.equal(wrongAuthority, 404);
  const commands = ['/admin/brain/records', '/admin/posts/commands', '/admin/automation/requests', '/admin/automation/policy', '/admin/jobs/retry', '/admin/resume/records', '/admin/resume/files'];
  for (const path of commands) {
    for (const extra of [{}, { origin: 'null' }, { origin: 'https://sibling.example' }, { origin: origin.origin, 'sec-fetch-site': 'same-site' }, { origin: origin.origin, 'sec-fetch-site': 'cross-site' }]) {
      const denied = await get(path, { method: 'POST', headers: { authorization, 'content-type': 'application/json', ...extra }, body: '{}' });
      assert.equal(denied.status, 403, path); assert.match(denied.headers.get('cache-control'), /no-store/);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
    }
  }
  for (const path of ['/admin', '/admin/posts', '/admin/automation', '/admin/jobs', '/admin/audit', '/admin/brain', '/admin/resume', '/admin/monitoring', '/admin/lab/queue']) {
    const response = await get(path, { headers: { authorization } });
    assert.equal(response.status, 200, path); assert.match(response.headers.get('cache-control'), /no-store/);
    const body = await response.text(); assert(!body.includes(process.env.HLOG_ADMIN_OWNER_KEY));
    const denied = await get(path); assert.equal(denied.status, 401); assert(!(await denied.text()).includes('관리자 개요'));
  }
  const page = await get('/admin', { headers: { authorization } });
  const asset = (await page.text()).match(/(?:src|href)="(\/_next\/static\/[^"?]+\.js)/)?.[1];
  assert(asset); const script = await get(asset); assert.equal(script.status, 200);
  assert(!(await script.text()).includes(process.env.HLOG_ADMIN_OWNER_KEY));
});
