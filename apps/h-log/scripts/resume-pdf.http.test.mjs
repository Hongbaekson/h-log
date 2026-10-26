import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { syntheticPdf } from './resume-pdf-fixtures.mjs';

test('owner can register, review every page and annotate a private PDF without exposing its bytes', { skip: process.env.HLOG_RESUME_HTTP_TEST !== '1' && 'requires isolated local server and test database' }, async () => {
  const origin = process.env.HLOG_ADMIN_ORIGIN;
  assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const headers = { authorization: `Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString('base64')}`, origin };
  const page = await fetch(origin + '/admin/resume', { headers });
  assert.equal(page.status, 200); assert.match(await page.text(), /이력서 PDF/);
  const get = (path, extra = {}) => fetch(origin + path, { headers: { ...headers, ...extra } });
  for (const path of ['/admin/resume', '/admin/resume/records', '/admin/resume/files', '/admin/resume/preview/11111111-1111-4111-8111-111111111111/1']) {
    assert.equal((await fetch(origin + path)).status, 401);
  }
  const before = await (await get('/admin/resume/records')).json();
  const bytes = syntheticPdf({ text: 'Synthetic HTTP ' + randomUUID() });
  const commandId = randomUUID();
  const upload = () => fetch(origin + '/admin/resume/files', { method: 'POST', headers: { ...headers, 'content-type': 'application/pdf', 'x-hlog-command-id': commandId, 'x-hlog-expected-revision': String(before.revision) }, body: bytes });
  const created = await upload(); assert.equal(created.status, 200, await created.clone().text());
  const receipt = await created.json();
  assert.deepEqual(await (await upload()).json(), receipt);
  const detail = await (await get('/admin/resume/records?id=' + receipt.targetId)).json();
  assert.equal(detail.pageCount, 2); assert.ok(!('bytes' in detail));
  assert.match(detail.inspection.text, /Synthetic HTTP/);
  for (const number of [1, 2]) {
    const image = await get(`/admin/resume/preview/${receipt.targetId}/${number}`);
    assert.equal(image.status, 200); assert.match(image.headers.get('cache-control'), /private.*no-store/);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(Buffer.from(await image.arrayBuffer()).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  const note = { action: 'save_note', id: receipt.targetId, commandId: randomUUID(), expectedRevision: receipt.revision, note: 'Synthetic owner-only note' };
  const updated = await fetch(origin + '/admin/resume/records', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(note) });
  assert.equal(updated.status, 200);
  const after = await (await get('/admin/resume/records')).json();
  assert.equal(after.versions.length, before.versions.length + 1);
  assert.equal(after.publicVersionId, before.publicVersionId);
  assert.equal(after.versions.find(item => item.id === receipt.targetId).note, note.note);
  assert.equal((await get(`/admin/resume/preview/${receipt.targetId}/3`)).status, 400);
  const postFile = (body, extra = {}) => fetch(origin + '/admin/resume/files', { method: 'POST', headers: { ...headers, 'content-type': 'application/pdf', 'x-hlog-command-id': randomUUID(), 'x-hlog-expected-revision': String(after.revision), ...extra }, body });
  assert.equal((await postFile(bytes)).status, 409);
  assert.equal((await postFile(Buffer.from('fake PDF'))).status, 422);
  assert.equal((await postFile(bytes, { 'content-encoding': 'gzip' })).status, 415);
  assert.equal((await postFile(Buffer.alloc(5242881))).status, 413);
  const chunked = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5242881)); controller.close(); } });
  const chunkedResult = await fetch(origin + '/admin/resume/files', { method: 'POST', duplex: 'half', headers: { ...headers, 'content-type': 'application/pdf', 'x-hlog-command-id': randomUUID(), 'x-hlog-expected-revision': String(after.revision) }, body: chunked });
  assert.equal(chunkedResult.status, 413);
  assert.deepEqual(await (await get('/admin/resume/records')).json(), after);
  assert.equal((await get('/api/resume/pdf')).status, 404);
  assert.equal((await fetch(origin + '/admin/resume/files', { method: 'POST', headers: { ...headers, origin: 'http://other.example' }, body: bytes })).status, 403);
  assert.equal((await postFile(bytes, { 'sec-fetch-site': 'same-site' })).status, 403);
  const publicOrigin = process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN;
  if (publicOrigin) {
    assert(['localhost', '127.0.0.1'].includes(new URL(publicOrigin).hostname));
    for (const path of ['/admin/resume', '/admin/resume?_rsc=private', '/admin/resume/records', '/admin/resume/files', `/admin/resume/preview/${receipt.targetId}/1`, '/api/resume/pdf']) {
      const denied = await fetch(publicOrigin + path, { headers }); assert.equal(denied.status, 404, path);
      assert.doesNotMatch(await denied.text(), /Synthetic HTTP|Synthetic owner-only note/);
    }
  }
});
