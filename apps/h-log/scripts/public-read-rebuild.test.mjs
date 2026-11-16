import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { localDatabaseUrl, parseRebuildArguments } from './public-read-rebuild.mjs';

test('CLI accepts only explicit commands, bounded options and an owned loopback target', () => {
  assert.deepEqual(parseRebuildArguments(['rebuild', '--kind', 'all', '--confirm-owned-local', '--batch-size', '25']), {
    command: 'rebuild', kind: 'all', confirmOwnedLocal: true, batchSize: 25,
  });
  for (const args of [['rebuild', '--kind', 'all'], ['rebuild', '--kind', 'all', '--confirm-owned-local', '--batch-size', '101'], ['rebuild', '--kind', 'all', '--confirm-owned-local', '--concurrency', '3'], ['drop', '--confirm-owned-local'], ['rebuild', '--kind', 'all', '--confirm-owned-local', '--sql', 'select 1']]) assert.throws(() => parseRebuildArguments(args));
  const url = 'postgresql://postgres@127.0.0.1:5432/hlog_projection_test';
  assert.equal(localDatabaseUrl(url), url);
  for (const bad of [url.replace('127.0.0.1', 'db.example.org'), url.replace('hlog_projection_test', 'postgres'), url + '?host=db.example.org', undefined]) assert.throws(() => localDatabaseUrl(bad), /invalid_local_database/);
});
test('CLI prints help without connecting and redacts rejected database URLs', () => {
  const args = ['--no-warnings', '--experimental-strip-types', 'scripts/public-read-rebuild.mjs'];
  const help = spawnSync(process.execPath, [...args, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.match(help.stdout, /reset-derived/);
  const failure = spawnSync(process.execPath, [...args, 'rebuild', '--kind', 'all', '--confirm-owned-local'], {
    encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://PRIVATE_USER:PRIVATE_PASSWORD@db.example.org/prod' },
  });
  assert.equal(failure.status, 1); assert.match(failure.stderr, /invalid_local_database/);
  assert.doesNotMatch(failure.stderr + failure.stdout, /PRIVATE_|db.example/);
});
