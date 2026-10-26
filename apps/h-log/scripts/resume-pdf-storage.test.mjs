import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, statfs, writeFile, rm } from 'node:fs/promises';
import { inspectResumePdf } from '../lib/resume-pdf-processor.ts';
import { syntheticPdf } from './resume-pdf-fixtures.mjs';

test('PDF processing requires bounded scratch storage and recovers from a full scratch disk', async () => {
  if (process.env.HLOG_RESUME_TEST_UNBOUNDED === '1') {
    await assert.rejects(inspectResumePdf(syntheticPdf()), /pdf_processor_unavailable/);
    return;
  }
  const root = '/tmp/hlog-resume';
  const stat = await statfs(root);
  assert.equal(stat.type, 0x1021994);
  assert.equal(stat.blocks * stat.bsize, 32 * 1024 * 1024);
  await inspectResumePdf(syntheticPdf());
  const ballast = root + '/capacity-test';
  try {
    await assert.rejects(writeFile(ballast, Buffer.alloc(33 * 1024 * 1024)), { code: 'ENOSPC' });
    await assert.rejects(inspectResumePdf(syntheticPdf()));
    assert.deepEqual((await readdir(root)).filter(name => name.startsWith('job-')), []);
  } finally { await rm(ballast, { force: true }); }
  assert.equal((await inspectResumePdf(syntheticPdf())).pages, 2);
  assert.deepEqual(await readdir(root), []);
});
