import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectResumePdf, renderResumePage, runBoundedPdfProcess } from '../lib/resume-pdf-processor.ts';
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { syntheticPdf } from './resume-pdf-fixtures.mjs';

test('real bounded tools inspect every page and render authenticated preview bytes', async () => {
  const bytes = syntheticPdf();
  const report = await inspectResumePdf(bytes);
  assert.equal(report.pages, 2);
  assert.match(report.text, /Synthetic resume 1/);
  assert.match(report.text, /Synthetic resume 2/);
  const png = await renderResumePage(bytes, 2, report);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) <= 2000 && png.readUInt32BE(20) <= 2000);
  assert.equal((await inspectResumePdf(syntheticPdf({ pages: 10 }))).pages, 10);
  let padding = 5242880 - syntheticPdf({ pages: 1 }).length - 2;
  let maximum = syntheticPdf({ pages: 1, padding });
  while (maximum.length !== 5242880) { padding += 5242880 - maximum.length; maximum = syntheticPdf({ pages: 1, padding }); }
  assert.equal((await inspectResumePdf(maximum)).pages, 1);
  await assert.rejects(inspectResumePdf(Buffer.concat([maximum, Buffer.from(' ')])), /request_too_large/);
});

test('parser handles compressed objects and rejects encrypted, hidden history and attachment annotations', async () => {
  const dir = await mkdtemp('/tmp/resume-fixture-');
  try {
    const input = dir + '/input.pdf', output = dir + '/output.pdf';
    await writeFile(input, syntheticPdf());
    execFileSync('/usr/bin/qpdf', ['--object-streams=generate', input, output]);
    assert.equal((await inspectResumePdf(await readFile(output))).pages, 2);
    for (const password of ['', 'synthetic']) {
      execFileSync('/usr/bin/qpdf', ['--encrypt', password, 'owner', '256', '--', input, output]);
      await assert.rejects(inspectResumePdf(await readFile(output)), /pdf_unsupported/);
    }
    await writeFile(input, syntheticPdf({ catalog: '/OpenAction << /S /JavaScript /JS (alert) >>' }));
    execFileSync('/usr/bin/qpdf', ['--object-streams=generate', input, output]);
    await assert.rejects(inspectResumePdf(await readFile(output)), /pdf_unsupported/);
    const original = syntheticPdf();
    const previous = original.toString().match(/startxref\n(\d+)/)[1];
    const incremental = Buffer.concat([original, Buffer.from(`xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R /Size 8 /Prev ${previous} >>\nstartxref\n${original.length}\n%%EOF\n`)]);
    await assert.rejects(inspectResumePdf(incremental), /pdf_(invalid|unsupported)/);
    await assert.rejects(inspectResumePdf(syntheticPdf({ extra: ['<< /Subtype /FileAttachment >>'] })), /pdf_unsupported/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('native sandbox blocks network and bounds output, CPU, cancellation and cleanup', async () => {
  const signal = AbortSignal.timeout(20000);
  for (const address of ['http://127.0.0.1:9/', 'http://169.254.169.254/']) {
    const denied = await runBoundedPdfProcess('/bin/busybox', ['wget', '-T', '1', '-O', '-', address], signal);
    assert.notEqual(denied.code, 0); assert.match(denied.stderr.toString(), /Operation not permitted/);
  }
  const environment = await runBoundedPdfProcess('/usr/bin/env', [], signal);
  assert.doesNotMatch(environment.stdout.toString(), /DATABASE_URL|OWNER_KEY|PRIVATE_PROBE/);
  await assert.rejects(runBoundedPdfProcess('/bin/busybox', ['head', '-c', '9000000', '/dev/zero'], signal, 1024), /pdf_unsupported/);
  await assert.rejects(runBoundedPdfProcess('/bin/busybox', ['sleep', '30'], AbortSignal.timeout(30)), /pdf_timeout/);
  const start = Date.now();
  const cpu = await runBoundedPdfProcess('/bin/sh', ['-c', 'while :; do :; done'], signal);
  assert.notEqual(cpu.code, 0); assert.ok(Date.now() - start < 10000);
  const memory = await runBoundedPdfProcess('/usr/bin/awk', ['BEGIN { s="x"; for (i=0;i<30;i++) s=s s; print length(s) }'], signal);
  assert.notEqual(memory.code, 0);
  await assert.rejects(inspectResumePdf(syntheticPdf(), {}, AbortSignal.abort()), /pdf_(timeout|processor_unavailable)/);
  assert.deepEqual(await readdir('/tmp/hlog-resume'), []);
});

test('rejects invalid, active, private and unsupported documents before registration', async () => {
  for (const bytes of [Buffer.from('not a PDF'), syntheticPdf().subarray(0, 150), syntheticPdf({ pages: 11 }),
    syntheticPdf({ catalog: '/OpenAction << /S /JavaScript /JS (alert) >>' }),
    syntheticPdf({ catalog: '/AcroForm << /Fields [] >>' }),
    syntheticPdf({ catalog: '/OCProperties << >>' }),
    syntheticPdf({ extra: ['<< /Type /EmbeddedFile >>'] }),
    syntheticPdf({ extra: ['<< /J#53 (alert) >>'] }),
    syntheticPdf({ extra: ['<< /S /URI /URI (https://8.8.8.8/) >>'] }),
    syntheticPdf({ text: 'person@example.com' }),
    syntheticPdf({ annotations: '/Annots [<< /Subtype /Link /Rect [0 0 1 1] /A << /S /URI /URI (https://127.0.0.1/) >> >>]' }),
  ]) await assert.rejects(inspectResumePdf(bytes), /pdf_(invalid|unsupported|privacy_blocked)/);
  const report = await inspectResumePdf(syntheticPdf({ annotations: '/Annots [<< /Subtype /Link /Rect [0 0 1 1] /A << /S /URI /URI (https://example.com/) >> >>]' }));
  assert.deepEqual(report.links, ['https://example.com/']);
});
