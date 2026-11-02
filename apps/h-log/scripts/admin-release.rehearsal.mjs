// Explicit local rehearsal: synthetic records, disposable DBs and loopback ingress only.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, mkdir, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { createPostVersionContentFromMarkdown, createPublishJobIdempotencyKey } from '../lib/blog-content-model.ts';

assert.equal(process.env.HLOG_ADMIN_RELEASE_TEST, '1', 'Explicit local opt-in required');
assert(process.env.NODE_EXTRA_CA_CERTS, 'Trust the disposable certificate without disabling TLS verification');
const certDir = resolve(process.env.HLOG_ADMIN_RELEASE_CERT_DIR);
const image = process.env.HLOG_ADMIN_RELEASE_IMAGE || 'hlog-web:admin-release';
const previous = process.env.HLOG_ADMIN_PREVIOUS_IMAGE || 'hlog-web:observe-step6';
const receiptDir = resolve('private/admin-release');
const scratch = await mkdtemp(join(tmpdir(), 'hlog-admin-release-'));
const suffix = randomUUID().replaceAll('-', '').slice(0, 12), network = 'hlog-admin-release-' + suffix;
const database = network + '-db', web = network + '-web', ingress = network + '-ingress';
const adminOrigin = 'https://127.0.0.1:3045', publicOrigin = 'http://127.0.0.1:3044', upstream = 'http://127.0.0.1:3046';
let key = randomBytes(32).toString('hex'); const password = randomBytes(24).toString('hex'), epoch = randomUUID();
const connection = db => `postgresql://postgres:${password}@127.0.0.1:55447/${db}`;
const exec = promisify(execFile), created = []; let netCreated = false, pool;
const docker = async args => (await exec('docker', args, { windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
const run = async (name, args, env = {}) => {
  try { const output = await exec(process.execPath, args, { windowsHide: true, env: { ...process.env, ...env }, timeout: 240000, maxBuffer: 8 * 1024 * 1024 }); await writeFile(join(receiptDir, name + '.log'), output.stdout + output.stderr); }
  catch (error) { await writeFile(join(receiptDir, name + '.log'), (error.stdout || '') + (error.stderr || '')); throw Error(`${name} failed; inspect private/admin-release/${name}.log`); }
};
const eventually = async check => { let failure; for (let i = 0; i < 80; i++) { try { return await check(); } catch (error) { failure = error; await new Promise(resolve => setTimeout(resolve, 250)); } } throw failure; };
const headers = () => ({ authorization: `Basic ${Buffer.from('owner:' + key).toString('base64')}`, origin: adminOrigin });
const get = path => fetch(adminOrigin + path, { headers: headers(), signal: AbortSignal.timeout(15000) });
const post = (path, body) => fetch(adminOrigin + path, { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
const caps = { HLOG_BLOG_DRAFT_GENERATION_ENABLED: '1', HLOG_BLOG_AUTO_PUBLISH_ENABLED: '1', HLOG_BLOG_JOBS_ENABLED: '1', HLOG_BLOG_MANUAL_PUBLISH_ENABLED: '1' };
const baseEnv = () => ({ ...caps, DATABASE_URL: connection('release'), HLOG_ADMIN_ORIGIN: adminOrigin, HLOG_ADMIN_OWNER_KEY: key,
  HLOG_PUBLIC_BASE_URL: 'https://hlog.example.org', HLOG_ADMIN_HTTP_PUBLIC_ORIGIN: publicOrigin, HLOG_ADMIN_HTTP_UPSTREAM: upstream,
  HLOG_BRAIN_HTTP_PUBLIC_ORIGIN: publicOrigin, HLOG_BRAIN_DATABASE_ENABLED: '1', HLOG_AUTO_PUBLISH_INPUT_FILE: join(scratch, 'input.json'),
  HLOG_ADMIN_HTTP_TEST: '1', HLOG_BRAIN_HTTP_TEST: '1', HLOG_EDITORIAL_HTTP_TEST: '1', HLOG_DRAFT_HTTP_TEST: '1',
  HLOG_MONITORING_HOST_DENIAL: '404',
  HLOG_RESUME_HTTP_TEST: '1', HLOG_RESUME_PUBLIC_HTTP_TEST: '1', HLOG_RESUME_PUBLIC_TEST_ORIGIN: publicOrigin });
async function startWeb(db = 'release', overrides = {}, selected = image) {
  if (created.includes(web)) { await docker(['rm', '-f', web]); created.splice(created.indexOf(web), 1); }
  const env = { ...caps, HOSTNAME: '0.0.0.0', DATABASE_URL: `postgresql://postgres:${password}@${database}:5432/${db}`,
    HLOG_PUBLIC_BASE_URL: 'https://hlog.example.org', HLOG_ADMIN_ENABLED: '1', HLOG_ADMIN_ORIGIN: adminOrigin, HLOG_ADMIN_OWNER_KEY: key,
    HLOG_BRAIN_DATABASE_ENABLED: '1', HLOG_RESUME_PDF_ENABLED: '1', HLOG_RESUME_PDF_PUBLICATION_EPOCH: epoch,
    HLOG_AUTO_PUBLISH_INPUT_FILE: '/fixture/input.json', HLOG_DAILY_ESTIMATED_COST_LIMIT: '1', HLOG_MONTHLY_ESTIMATED_COST_LIMIT: '10', ...overrides };
  await writeFile(join(scratch, 'web.env'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'), { mode: 0o600 });
  await docker(['run', '-d', '--name', web, '--network', network, '--network-alias', 'hlog-web', '-p', '127.0.0.1:3046:3000',
    '--env-file', join(scratch, 'web.env'), '--mount', `type=bind,source=${join(scratch, 'input.json')},target=/fixture/input.json,readonly`,
    '--tmpfs', '/tmp/hlog-resume:size=32m,uid=1001,gid=1001,mode=0700,noexec,nosuid,nodev', selected]); created.push(web);
  await eventually(async () => assert.equal((await fetch(upstream + '/resume')).status, 200));
  if (created.includes(ingress)) { await docker(['restart', ingress]); await eventually(async () => assert.equal((await fetch(publicOrigin + '/resume')).status, 200)); }
}
async function policy(on) {
  const row = (await pool.query('select revision from blog_automation_policy')).rows[0];
  const response = await post('/admin/automation/policy', { commandId: randomUUID(), expectedRevision: row.revision, generation: on, publication: on, jobs: on, reason: '격리 릴리스 검수' });
  assert.equal(response.status, 200); return response.json();
}
async function snapshot(client) {
  const names = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(row => row.tablename);
  const result = {};
  for (const name of names) { assert(/^[a-z_]+$/.test(name)); const rows = (await client.query(`select to_jsonb(t)::text value from "${name}" t order by to_jsonb(t)::text`)).rows; result[name] = { rows: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') }; }
  return result;
}
const result = { image, previous, stages: [] };
const passed = stage => { result.stages.push(stage); console.log('PASS: ' + stage); };
try {
  await mkdir(receiptDir, { recursive: true });
  result.imageId = await docker(['image', 'inspect', image, '--format', '{{.Id}}']);
  result.previousImageId = await docker(['image', 'inspect', previous, '--format', '{{.Id}}']);
  const now = new Date().toISOString(), source = { id: 'source', publisher: 'Example', title: '공식 문서로 워커 적용 조건 살펴보기', summary: '공식 API 변경 사항을 정리합니다.', url: 'https://example.com/runtime' };
  await writeFile(join(scratch, 'input.json'), JSON.stringify({ personalContextItems: [{ id: 'context', category: 'H-Log', title: '워커 적용 검토', summary: '공개 자료를 바탕으로 적용 조건을 검토합니다.', allowedUsage: 'applied_analysis', publicSafe: true, createdAt: now, updatedAt: now, version: 1 }],
    topicSources: [{ ...source, sourceType: 'official_release_note', signals: { backendAutomationFit: true, directVerificationAvailable: true, originalSourceAvailable: true } }], researchPackSources: [{ ...source, sourceRole: 'official', excerpt: '공식 API 변경', fetchedAt: now, claimMetadata: [{ claimId: 'claim', claimText: 'API 동작이 바뀌었습니다.', sourceId: 'source' }] }] }));
  await writeFile(join(scratch, 'db.env'), `POSTGRES_PASSWORD=${password}\nPOSTGRES_DB=release\n`, { mode: 0o600 });
  await docker(['network', 'create', network]); netCreated = true;
  // A disposable anonymous volume survives DB stop/start; tmpfs does not.
  await docker(['run', '-d', '--name', database, '--network', network, '-p', '127.0.0.1:55447:5432', '--env-file', join(scratch, 'db.env'), '-v', '/var/lib/postgresql/data', 'pgvector/pgvector:pg16@sha256:a36250871de0833b8757561c72f2477ef1ddd1101afa4e617fb552e0de514c6b']); created.push(database);
  await eventually(async () => assert.match(await docker(['exec', database, 'pg_isready', '-U', 'postgres']), /accepting/));
  await runBlogMigrations(connection('release')); pool = new pg.Pool({ connectionString: connection('release') }); pool.on('error', () => {});
  assert(process.env.npm_execpath, 'Launch with npm run test:admin:release');
  await run('integration', [process.env.npm_execpath, 'run', 'test:integration'], { DATABASE_URL: connection('release') });
  passed('isolated complete database integration');
  await startWeb();
  const publicConfig = await readFile('deploy/nginx/conf.d/hlog.conf', 'utf8');
  const adminConfig = (await readFile('deploy/admin/admin.nginx.conf.example', 'utf8')).replace('server_name admin.hlog.example.org;', 'server_name 127.0.0.1;').replaceAll('admin.hlog.example.org:8443', '127.0.0.1:3045');
  await writeFile(join(scratch, 'nginx.conf'), publicConfig + '\n' + adminConfig);
  await docker(['run', '-d', '--name', ingress, '--network', network, '-p', '127.0.0.1:3044:80', '-p', '127.0.0.1:3045:443',
    '--mount', `type=bind,source=${join(scratch, 'nginx.conf')},target=/etc/nginx/conf.d/default.conf,readonly`, '--mount', `type=bind,source=${certDir},target=/etc/nginx/admin-tls,readonly`,
    'nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10']); created.push(ingress);
  await docker(['exec', ingress, 'nginx', '-t']);
  await eventually(async () => assert.equal((await get('/admin')).status, 200));
  for (const [name, file] of [['auth', 'admin-owner.http.test.mjs'], ['ingress', 'admin-release.http.test.mjs'], ['monitoring', 'admin-monitoring.http.test.mjs'], ['brain', 'brain-capture.http.test.mjs'], ['pdf', 'resume-pdf.http.test.mjs'], ['draft', 'blog-draft.http.test.mjs']]) {
    await run(name, ['--no-warnings', '--experimental-strip-types', '--test', 'scripts/' + file], baseEnv()); passed(name + ' HTTP');
  }
  await policy(true);
  await run('editorial', ['--no-warnings', '--experimental-strip-types', '--test', 'scripts/blog-editorial.http.test.mjs'], baseEnv()); passed('selected-version publication and retraction');
  // Persist a failed required job, retry through HTTP, then run each worker in a new process.
  const content = createPostVersionContentFromMarkdown('## 릴리스 검수\n\n합성 원고입니다.\n');
  await pool.query("insert into posts(id,slug,title,description,article_mode,status,created_at,updated_at) values('release-job','release-job','합성 검수','격리 자료','project_record','failed_publish',now(),now())");
  await pool.query("insert into post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values('release-version','release-job',1,'합성 검수','격리 자료',$1,$2,$3,'admin',now())", [content.contentMarkdown, content.contentHtml, content.contentHash]);
  await pool.query("update posts set current_version_id='release-version' where id='release-job'");
  await pool.query("insert into publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status,retry_count) values('release-job-render','release-job','release-version','render','required',$1,'failed',1)", [createPublishJobIdempotencyKey('render', { id: 'release-version', contentHash: content.contentHash })]);
  const job = (await pool.query("select admin_id from publish_jobs where id='release-job-render'")).rows[0];
  const retry = { commandId: randomUUID(), jobId: job.admin_id, expectedRetryCount: 1, expectedPostRevision: 0, expectedVersion: 1, expectedHash: content.contentHash, reason: '원인을 확인한 합성 작업', confirmed: true };
  const accepted = await post('/admin/jobs/retry', retry); assert.equal(accepted.status, 200); const retryReceipt = await accepted.json();
  await policy(false); assert.deepEqual(await (await post('/admin/jobs/retry', retry)).json(), retryReceipt);
  const workerEnv = { ...baseEnv(), HLOG_WORKER_POST_ID: 'release-job', HLOG_WORKER_PUBLIC_BASE_URL: publicOrigin };
  await run('worker-paused', ['--no-warnings', '--experimental-strip-types', 'scripts/blog-worker.mjs', '--once'], workerEnv);
  assert.equal((await pool.query("select status from publish_jobs where id='release-job-render'")).rows[0].status, 'queued');
  await policy(true);
  await run('worker-first', ['--no-warnings', '--experimental-strip-types', 'scripts/blog-worker.mjs', '--once'], workerEnv);
  await run('worker-restarted', ['--no-warnings', '--experimental-strip-types', 'scripts/blog-worker.mjs', '--once'], workerEnv);
  assert.equal((await pool.query("select status from publish_jobs where id='release-job-render'")).rows[0].status, 'succeeded');
  await policy(false); passed('single-job retry, pause and worker process restart');
  const beforeAudit = await snapshot(pool);
  await pool.query("create function reject_release_audit() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit unavailable'; end $$; create trigger reject_release_audit before insert on admin_actions for each row execute function reject_release_audit()");
  try { const revision = (await pool.query('select revision from blog_automation_policy')).rows[0].revision; const failed = await post('/admin/automation/policy', { commandId: randomUUID(), expectedRevision: revision, generation: true, publication: false, jobs: false, reason: '합성 감사 장애' }); assert.equal(failed.status, 503); }
  finally { await pool.query('drop trigger reject_release_audit on admin_actions; drop function reject_release_audit()'); }
  assert.deepEqual(await snapshot(pool), beforeAudit); passed('audit failure rolls back state and receipt');
  // A published baseline makes backup, key rotation and old-artifact checks observable.
  await pool.query("update posts set status='published',published_at=now() where id='release-job'");
  const brain = (await (await get('/admin/brain/records')).json()).notes[0];
  assert.equal((await post('/admin/brain/records', { action: 'publish', id: brain.id, revision: brain.revision, commandRevision: brain.commandRevision, commandId: randomUUID(), confirmed: true })).status, 200);
  const pdfState = await (await get('/admin/resume/records')).json();
  const file = (await pool.query('select id, sha256 from resume_pdf_versions order by created_at limit 1')).rows[0];
  const publishPdf = { action: 'publish', id: file.id, sha256: file.sha256, expectedRevision: pdfState.revision, commandId: randomUUID(), checklist: { allPages: true, metadataAndLinks: true, privacyAndOrganizations: true, hiddenContentAndSource: true } };
  assert.equal((await post('/admin/resume/records', publishPdf)).status, 200);
  assert.equal((await fetch(publicOrigin + '/api/resume/pdf')).status, 200);
  const stable = await snapshot(pool);
  await docker(['stop', database]);
  assert.equal((await get('/admin/brain/records')).status, 503);
  assert.match(await (await get('/admin/posts')).text(), /불러오지 못/);
  await docker(['start', database]);
  await eventually(async () => assert.equal((await get('/admin/brain/records')).status, 200));
  assert.deepEqual(await snapshot(pool), stable); passed('database restart preserves records and safe errors');
  const oldKey = key; key = randomBytes(32).toString('hex');
  await startWeb();
  assert.equal((await fetch(adminOrigin + '/admin', { headers: { authorization: `Basic ${Buffer.from('owner:' + oldKey).toString('base64')}` } })).status, 401);
  assert.equal((await get('/admin')).status, 200); assert.deepEqual(await snapshot(pool), stable);
  await startWeb('release', { HLOG_ADMIN_ENABLED: '0' });
  assert.equal((await get('/admin')).status, 404); assert.equal((await fetch(publicOrigin + '/blog/release-job')).status, 200);
  await startWeb(); assert.deepEqual(await snapshot(pool), stable); passed('key rotation and admin-OFF rollback preserve public data');
  const dump = '/tmp/admin-release.dump';
  await docker(['exec', database, 'pg_dump', '-U', 'postgres', '-Fc', '-f', dump, 'release']);
  await pool.query('create database restored');
  await docker(['exec', database, 'pg_restore', '-U', 'postgres', '--exit-on-error', '-d', 'restored', dump]);
  const restored = new pg.Pool({ connectionString: connection('restored') });
  try {
    assert.deepEqual(await snapshot(restored), stable);
    const newEpoch = randomUUID();
    await startWeb('restored', { HLOG_RESUME_PDF_PUBLICATION_EPOCH: newEpoch });
    assert.equal((await fetch(publicOrigin + '/api/resume/pdf')).status, 404);
    assert.equal((await post('/admin/resume/records', publishPdf)).status, 409);
    assert.equal((await fetch(publicOrigin + '/brain/' + brain.id)).status, 200);
    assert.equal((await fetch(publicOrigin + '/blog/release-job.md')).status, 200);
    const revision = (await restored.query('select revision from resume_pdf_state')).rows[0].revision;
    await startWeb('restored', { HLOG_RESUME_PDF_ENABLED: '0', HLOG_ADMIN_ENABLED: '0', HLOG_RESUME_PDF_PUBLICATION_EPOCH: '' }, previous);
    const resetArgs = ['--no-warnings', '--experimental-strip-types', 'scripts/resume-pdf-recovery.mjs', '--command-id', randomUUID(), '--expected-revision', String(revision)];
    await run('restore-reset', resetArgs, { DATABASE_URL: connection('restored'), HLOG_RESUME_PDF_ENABLED: '0', HLOG_RESUME_PDF_PUBLICATION_EPOCH: '' });
    const afterReset = await snapshot(restored);
    assert.equal((await get('/admin')).status, 404); assert.equal((await fetch(publicOrigin + '/api/resume/pdf')).status, 404);
    assert.equal((await fetch(publicOrigin + '/blog/release-job')).status, 200);
    await startWeb('restored', { HLOG_RESUME_PDF_PUBLICATION_EPOCH: newEpoch });
    assert.deepEqual(await snapshot(restored), afterReset); assert.equal((await get('/admin/monitoring')).status, 200);
    result.tables = Object.keys(stable).length; result.backup = stable;
    passed('full database dump/restore and previous artifact compatibility');
  } finally { await restored.end(); }
  // Browser verifier is optional for repeat CLI runs; this release receipt requires its evidence.
  await writeFile(join(scratch, 'owner-key'), key, { mode: 0o600 });
  await writeFile(join(receiptDir, 'browser-state.json'), JSON.stringify({ origin: adminOrigin, publicOrigin, keyFile: join(scratch, 'owner-key') }));
  if (process.env.HLOG_ADMIN_RELEASE_BROWSER_SCRIPT) { await run('browser', [process.env.HLOG_ADMIN_RELEASE_BROWSER_SCRIPT]); passed('1440/390/320px keyboard and no-JS browser review'); }
  await writeFile(join(receiptDir, 'result.json'), JSON.stringify({ ...result, completedAt: new Date().toISOString() }, null, 2));
} finally {
  if (pool) await pool.end();
  for (const name of [ingress, web, database]) if (created.includes(name)) await docker(['rm', '-fv', name]);
  if (netCreated) await docker(['network', 'rm', network]);
  // Only our newly generated flat directory; never recursively remove a supplied path.
  for (const name of await readdir(scratch)) await unlink(join(scratch, name));
  await rmdir(scratch);
}
