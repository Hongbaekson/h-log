import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { runLocalProjection, validateRebuildOptions } from '../lib/public-read-rebuild.ts';
import { projectionContext } from '../lib/public-read-model.ts';
import { createBlogPrivacyScanPolicyFromEnvironment } from '../lib/blog-privacy-scanner.ts';

export function localDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1'
      || !/^\/hlog_projection_[a-z0-9_]+$/.test(url.pathname) || url.search || url.hash) throw new Error();
    return value;
  } catch { throw new Error('invalid_local_database'); }
}
export function parseRebuildArguments(args) {
  const { values, positionals } = parseArgs({ args, strict: true, allowPositionals: true, options: {
    kind: { type: 'string' }, generation: { type: 'string' }, id: { type: 'string' },
    'batch-size': { type: 'string' }, concurrency: { type: 'string' }, 'max-seconds': { type: 'string' },
    'confirm-owned-local': { type: 'boolean' }, progress: { type: 'boolean' },
  } });
  if (positionals.length !== 1) throw new Error('invalid_options');
  const options = { command: positionals[0], confirmOwnedLocal: values['confirm-owned-local'] === true };
  for (const key of ['kind', 'generation', 'id']) if (values[key] !== undefined) options[key] = values[key];
  for (const [flag, key] of [['batch-size', 'batchSize'], ['concurrency', 'concurrency'], ['max-seconds', 'maxSeconds']]) {
    if (values[flag] !== undefined) {
      if (!/^\d+$/.test(values[flag])) throw new Error('invalid_options');
      options[key] = Number(values[flag]);
    }
  }
  validateRebuildOptions(options);
  if (values.progress) options.onProgress = result => console.log(JSON.stringify(result));
  return options;
}
async function main() {
  if (process.argv.slice(2).join(' ') === '--help') {
    console.log('Local only: rebuild --kind blog|brain|all; resume|verify|activate --generation UUID; repair --kind blog|brain --id ID; reset-derived.\nAll commands require --confirm-owned-local and a labelled hlog_projection_* loopback DB.\nOptions: --batch-size 1..100 (25), --concurrency 1..2 (ceiling; current serial runner), --max-seconds 1..3600 (60), --progress.');
    return;
  }
  const options = parseRebuildArguments(process.argv.slice(2));
  const context = projectionContext(createBlogPrivacyScanPolicyFromEnvironment(process.env));
  const pool = new pg.Pool({ connectionString: localDatabaseUrl(process.env.DATABASE_URL), max: 1, connectionTimeoutMillis: 3000 });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try { console.log(JSON.stringify(await runLocalProjection(pool, { ...options, signal: controller.signal }, context))); }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); await pool.end(); }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    // Content/hash/parser/SQL errors may contain private IDs or connection strings.
    const code = /^[a-z_]{1,48}$/.test(error.message) ? error.message : 'rebuild_failed';
    console.error(JSON.stringify({ error: code, ...(/^[0-9a-f-]{36}$/.test(error.generation ?? '') ? { generation: error.generation } : {}) })); process.exitCode = 1;
  });
}
