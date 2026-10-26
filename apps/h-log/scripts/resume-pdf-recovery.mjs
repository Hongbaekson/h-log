import { parseArgs } from 'node:util';
import pg from 'pg';
import { parseResumeMetadata } from '../lib/resume-pdf.ts';
import { createResumeRepository } from '../lib/resume-pdf-repository.ts';

// Offline operator command: stop all PDF writers/readers before invoking it on the restored DB.
let pool;
try {
  if (process.env.HLOG_RESUME_PDF_ENABLED === '1' || process.env.HLOG_RESUME_PDF_PUBLICATION_EPOCH) throw new Error('recovery_gate_open');
  let command;
  try {
    const { values } = parseArgs({ options: { 'command-id': { type: 'string' }, 'expected-revision': { type: 'string' } } });
    if (!/^(?:0|[1-9]\d*)$/.test(values['expected-revision'] ?? '')) throw new Error();
    command = parseResumeMetadata({ commandId: values['command-id'], expectedRevision: Number(values['expected-revision']) });
  } catch { throw new Error('invalid_recovery_command'); }
  if (!process.env.DATABASE_URL) throw new Error('resume_recovery_failed');
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  console.log(JSON.stringify(await createResumeRepository(pool).resetAfterRecovery(command)));
} catch (error) {
  console.error(['recovery_gate_open', 'invalid_recovery_command', 'revision_conflict', 'command_conflict'].includes(error?.message) ? error.message : 'resume_recovery_failed');
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }
