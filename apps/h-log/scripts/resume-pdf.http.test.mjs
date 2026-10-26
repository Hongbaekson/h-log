import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { syntheticPdf } from './resume-pdf-fixtures.mjs';

test('reviewed PDFs publish, replace and withdraw across anonymous HTTP and Resume', { skip: process.env.HLOG_RESUME_PUBLIC_HTTP_TEST !== '1' && 'requires local publication epoch' }, async () => {
  const origin = process.env.HLOG_ADMIN_ORIGIN;
  const publicOrigin = process.env.HLOG_RESUME_PUBLIC_TEST_ORIGIN || origin;
  for (const value of [origin, publicOrigin]) assert(['localhost', '127.0.0.1'].includes(new URL(value).hostname));
  const headers = { authorization: `Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString('base64')}`, origin };
  const state = async () => (await fetch(origin + '/admin/resume/records', { headers })).json();
  const post = async command => fetch(origin + '/admin/resume/records', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(command) });
  const base = async () => ({ commandId: randomUUID(), expectedRevision: (await state()).revision });
  const upload = async text => {
    const bytes = syntheticPdf({ text: text + randomUUID() });
    const command = await base();
    const response = await fetch(origin + '/admin/resume/files', { method: 'POST', headers: { ...headers, 'content-type': 'application/pdf', 'x-hlog-command-id': command.commandId, 'x-hlog-expected-revision': String(command.expectedRevision) }, body: bytes });
    assert.equal(response.status, 200, await response.clone().text());
    const receipt = await response.json();
    return { bytes, detail: await (await fetch(origin + '/admin/resume/records?id=' + receipt.targetId, { headers })).json() };
  };
  const review = async detail => ({ ...await base(), action: 'publish', id: detail.id, sha256: detail.sha256,
    checklist: { allPages: true, metadataAndLinks: true, privacyAndOrganizations: true, hiddenContentAndSource: true } });
  const pdf = (extra = {}, method = 'GET', query = '') => fetch(publicOrigin + '/api/resume/pdf' + query, { method, headers: extra });
  const resume = async () => (await fetch(publicOrigin + '/resume')).text();
  try {
    assert.equal((await post({ ...await base(), action: 'unpublish' })).status, 200);
    assert.equal((await pdf()).status, 404);
    assert.doesNotMatch(await resume(), /href="\/api\/resume\/pdf"/);
    const a = await upload('Synthetic publication A ');
    const publishA = await review(a.detail);
    assert.equal((await post({ ...publishA, sha256: 'f'.repeat(64) })).status, 409);
    assert.equal((await post({ ...publishA, checklist: { ...publishA.checklist, allPages: false } })).status, 400);
    const published = await post(publishA); assert.equal(published.status, 200, await published.clone().text());
    const receiptA = await published.json();
    const first = await pdf(); assert.equal(first.status, 200);
    assert.deepEqual(Buffer.from(await first.arrayBuffer()), a.bytes);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.equal(first.headers.get('content-length'), String(a.bytes.length));
    assert.equal(first.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.match(first.headers.get('content-disposition'), /filename="resume.pdf"; filename\*=UTF-8''%EC%9D%B4%EB%A0%A5%EC%84%9C.pdf/);
    const etag = first.headers.get('etag');
    assert.match(await resume(), /href="\/api\/resume\/pdf"/);
    assert.equal((await pdf({}, 'HEAD')).headers.get('content-length'), String(a.bytes.length));
    assert.equal((await pdf({ 'if-none-match': `W/${etag}` })).status, 304);
    assert.equal((await pdf({ 'if-match': '"old"', 'if-none-match': etag })).status, 412);
    const range = await pdf({ range: 'bytes=0-1', 'if-range': etag });
    assert.equal(range.status, 200); assert.equal(range.headers.get('accept-ranges'), 'none'); assert.deepEqual(Buffer.from(await range.arrayBuffer()), a.bytes);
    assert.equal((await pdf({}, 'GET', '?id=' + a.detail.id)).status, 404);
    const b = await upload('Synthetic publication B ');
    assert.equal((await pdf({ 'if-none-match': etag })).status, 304, 'private upload cannot replace A');
    const publishB = await review(b.detail);
    assert.equal((await post(publishB)).status, 200);
    const changed = await pdf({ 'if-none-match': etag }); assert.equal(changed.status, 200); assert.deepEqual(Buffer.from(await changed.arrayBuffer()), b.bytes);
    assert.deepEqual(await (await post(publishA)).json(), receiptA);
    assert.equal((await state()).publicVersionId, b.detail.id, 'late receipt cannot change current state');
    assert.equal((await post({ ...publishA, commandId: randomUUID() })).status, 409);
    assert.equal((await post({ ...await base(), action: 'unpublish' })).status, 200);
    for (const method of ['GET', 'HEAD']) {
      const hidden = await pdf({ 'if-none-match': '*', range: 'bytes=0-1' }, method);
      assert.equal(hidden.status, 404); assert.equal(hidden.headers.get('etag'), null); assert.match(hidden.headers.get('cache-control'), /no-store/);
    }
    assert.doesNotMatch(await resume(), /href="\/api\/resume\/pdf"/);
    assert.equal((await post(await review(a.detail))).status, 200);
    assert.deepEqual(Buffer.from(await (await pdf()).arrayBuffer()), a.bytes);
  } finally { assert.equal((await post({ ...await base(), action: 'unpublish' })).status, 200); }
});

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
