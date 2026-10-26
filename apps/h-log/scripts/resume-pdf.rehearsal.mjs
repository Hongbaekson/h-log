// Opt-in local rehearsal. Creates only generated test databases/containers; uses no personal PDFs.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { runBlogMigrations } from './blog-migrations.mjs';
import { maximumSyntheticPdf } from './resume-pdf-fixtures.mjs';
import { createResumeRepository } from '../lib/resume-pdf-repository.ts';

assert.equal(process.env.HLOG_RESUME_REHEARSAL, '1', 'Explicit local rehearsal opt-in required');
const url = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(url.hostname), 'Local database required');
const dbContainer = process.env.HLOG_RESUME_DB_CONTAINER;
assert.match(dbContainer ?? '', /^hlog-resume-[a-z0-9-]+$/);
const certificates = resolve(process.env.HLOG_RESUME_REHEARSAL_CERT_DIR);
assert(process.env.NODE_EXTRA_CA_CERTS, 'Trust only the disposable localhost certificate; do not disable TLS verification');
const image = process.env.HLOG_RESUME_REHEARSAL_IMAGE || 'hlog-web:resume-step3';
const previousImage = process.env.HLOG_RESUME_PREVIOUS_IMAGE || 'hlog-web:resume-step1';
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const source = 'hlog_resume_source_' + suffix, restored = 'hlog_resume_restored_' + suffix;
const network = 'hlog-resume-rehearsal-' + suffix, web = network + '-web', proxy = network + '-proxy';
const dump = '/tmp/' + network + '.dump';
const origin = 'https://localhost:3045', publicOrigin = 'http://localhost:3044';
const epoch = randomUUID(), newEpoch = randomUUID(), key = 'a'.repeat(64);
const headers = { authorization: `Basic ${Buffer.from('owner:' + key).toString('base64')}`, origin, connection: 'close' };
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString() });
const pools = [];
let running = false, proxyRunning = false, networkCreated = false, sourceCreated = false, restoreCreated = false;
const result = { image, previousImage, versions: 20, pagesPerVersion: 10, uploadMs: [], maxWebRssKiB: 0, maxTemporaryBytes: 0 };
const connection = database => { const value = new URL(url); value.pathname = '/' + database; return value.toString(); };
const poolFor = database => { const pool = new pg.Pool({ connectionString: connection(database) }); pools.push(pool); return pool; };
const getState = async () => (await fetch(origin + '/admin/resume/records', { headers })).json();
const command = async () => ({ commandId: randomUUID(), expectedRevision: (await getState()).revision });
const post = value => fetch(origin + '/admin/resume/records', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(value) });
const pdf = (extra = {}, method = 'GET') => fetch(publicOrigin + '/api/resume/pdf', { headers: { connection: 'close', ...extra }, method });
const review = async file => ({ ...await command(), action: 'publish', id: file.id, sha256: file.sha256,
  checklist: { allPages: true, metadataAndLinks: true, privacyAndOrganizations: true, hiddenContentAndSource: true } });
const checkedPost = async value => { const response = await post(value); assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
const snapshot = async pool => (await pool.query(`select id, sha256, encode(sha256(bytes),'hex') as actual,
  byte_size, page_count, md5(inspection::text) as inspection, validation_policy, tool_versions, note, created_at
  from resume_pdf_versions order by id`)).rows;
async function startWeb(database, publicationEpoch, enabled = '1', selectedImage = image) {
  if (running) { docker(['rm', '-f', web]); running = false; }
  const databaseUrl = new URL(connection(database)); databaseUrl.hostname = 'host.docker.internal';
  docker(['run', '-d', '--name', web, '--network', network, '--network-alias', 'resume-web', '-p', '127.0.0.1:3046:3000',
    '--tmpfs', '/tmp/hlog-resume:size=32m,uid=1001,gid=1001,mode=0700,noexec,nosuid,nodev',
    '-e', 'HOSTNAME=0.0.0.0',
    '-e', 'HLOG_ADMIN_ENABLED=1', '-e', 'HLOG_ADMIN_OWNER_KEY=' + key, '-e', 'HLOG_ADMIN_ORIGIN=' + origin,
    '-e', 'HLOG_PUBLIC_BASE_URL=https://hlog.example.org', '-e', 'HLOG_BRAIN_DATABASE_ENABLED=0',
    '-e', 'HLOG_RESUME_PDF_ENABLED=' + enabled, '-e', 'HLOG_RESUME_PDF_PUBLICATION_EPOCH=' + publicationEpoch,
    '-e', 'DATABASE_URL=' + databaseUrl, selectedImage]); running = true;
  for (let i = 0; i < 60; i++) {
    const readiness = await fetch('http://127.0.0.1:3046/resume').catch(error => ({ error: error.cause?.message }));
    if (readiness.ok) return;
    if (i === 59) console.error('Local readiness:', readiness.status, readiness.error, readiness.text ? (await readiness.text()).slice(0, 500) : '');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const logs = spawnSync('docker', ['logs', web], { encoding: 'utf8', windowsHide: true });
  console.error(logs.stdout, logs.stderr);
  throw new Error('Local web did not start');
}
async function sample() {
  const code = `const fs=require('fs');let max=0,tmp=0;function read(){max=Math.max(max,Number(fs.readFileSync('/proc/1/status','utf8').match(/VmRSS:\\s+(\\d+)/)[1]));const s=fs.statfsSync('/tmp/hlog-resume');tmp=Math.max(tmp,(s.blocks-s.bfree)*s.bsize)}read();const baseline=max;const t=setInterval(read,10);process.stdin.resume();console.log('ready');process.stdin.on('end',()=>{clearInterval(t);read();console.log(JSON.stringify({baseline,max,tmp}))});`;
  const child = spawn('docker', ['exec', '-i', web, 'node', '-e', code], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
  let output = ''; child.stdout.on('data', chunk => output += chunk);
  await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); child.once('exit', () => reject(new Error('RSS sampler did not start'))); });
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(output.trim().split('\n').at(-1))) : reject(new Error('RSS sampler failed'))); });
  return async () => { child.stdin.end(); return done; };
}
async function refreshProxy() {
  docker(['restart', proxy]); // Re-resolve the replaced container; do not retain old-worker upstream connections.
  for (let i = 0; i < 40; i++) {
    const response = await fetch(origin + '/admin/resume/records', { headers, signal: AbortSignal.timeout(2000) }).catch(() => null);
    if (response && [200, 404].includes(response.status)) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local proxy did not restart');
}
try {
  await admin.connect();
  await admin.query(`create database ${source}`); sourceCreated = true;
  await runBlogMigrations(connection(source));
  const sourcePool = poolFor(source);
  docker(['network', 'create', network]); networkCreated = true;
  await startWeb(source, epoch);
  docker(['run','-d','--name',proxy,'--network',network,'-p','127.0.0.1:3044:80','-p','127.0.0.1:3045:81',
    '-v',resolve('deploy/resume-rehearsal.nginx.conf') + ':/etc/nginx/conf.d/default.conf:ro','-v',certificates + ':/cert:ro',
    'nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10']); proxyRunning = true;
  for (let i = 0; i < 40; i++) {
    if ((await fetch(origin + '/admin/resume/records', { headers }).catch(() => null))?.ok) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  for (const path of ['/admin/resume','/admin/resume/records','/admin/resume/preview/11111111-1111-4111-8111-111111111111/1']) {
    assert.equal((await fetch(publicOrigin + path)).status, 404);
    assert.equal((await fetch(origin + path)).status, 401);
  }
  assert.equal((await pdf()).status, 404);
  const httpEnv = { ...process.env, HLOG_ADMIN_ORIGIN: origin, HLOG_ADMIN_OWNER_KEY: key,
    HLOG_ADMIN_HTTP_PUBLIC_ORIGIN: publicOrigin, HLOG_ADMIN_HTTP_UPSTREAM: 'http://127.0.0.1:3046',
    HLOG_PUBLIC_BASE_URL: 'https://hlog.example.org', HLOG_BRAIN_DATABASE_ENABLED: '0',
    HLOG_ADMIN_HTTP_TEST: '1', HLOG_RESUME_HTTP_TEST: '1', HLOG_RESUME_PUBLIC_HTTP_TEST: '1', HLOG_RESUME_PUBLIC_TEST_ORIGIN: publicOrigin };
  execFileSync(process.execPath, ['--test', 'scripts/admin-owner.http.test.mjs', 'scripts/resume-pdf.http.test.mjs'], { env: httpEnv, stdio: 'inherit', windowsHide: true });
  // This database was generated above for this run only. Clear smoke fixtures before the capacity measurement.
  await sourcePool.query('truncate resume_pdf_state, resume_pdf_versions, admin_actions; insert into resume_pdf_state(id) values(1)');
  result.databaseBaseline = Number((await sourcePool.query('select pg_database_size(current_database()) as bytes')).rows[0].bytes);
  await mkdir('private/resume-rehearsal', { recursive: true });
  const files = [];
  let firstCommand, firstReceipt;
  for (let i = 0; i < 20; i++) {
    const bytes = maximumSyntheticPdf('Synthetic capacity ' + i);
    const cmd = await command(), stopSample = await sample(), started = performance.now();
    const response = await fetch(origin + '/admin/resume/files', { method: 'POST', headers: { ...headers, 'content-type': 'application/pdf', 'x-hlog-command-id': cmd.commandId, 'x-hlog-expected-revision': String(cmd.expectedRevision) }, body: bytes });
    const metrics = await stopSample();
    assert.equal(response.status, 200, await response.clone().text());
    result.uploadMs.push(Math.round(performance.now() - started));
    const receipt = await response.json();
    result.maxWebRssKiB = Math.max(result.maxWebRssKiB, metrics.max); result.maxTemporaryBytes = Math.max(result.maxTemporaryBytes, metrics.tmp);
    result.maxUploadRssDeltaKiB = Math.max(result.maxUploadRssDeltaKiB ?? 0, metrics.max - metrics.baseline);
    files.push({ id: receipt.targetId, sha256: createHash('sha256').update(bytes).digest('hex') });
    if (i === 0) { firstCommand = await review(files[0]); firstReceipt = await checkedPost(firstCommand); }
    assert.equal((await getState()).publicVersionId, files[0].id);
    if ((i + 1) % 5 === 0) console.log(`Validated ${i + 1}/20 maximum synthetic PDFs`);
  }
  const beforeOverflow = await getState(), overflow = await command();
  const rejected = await fetch(origin + '/admin/resume/files', { method:'POST',headers:{...headers,'content-type':'application/pdf','x-hlog-command-id':overflow.commandId,'x-hlog-expected-revision':String(overflow.expectedRevision)},body:maximumSyntheticPdf('Synthetic overflow') });
  assert.equal(rejected.status,409); assert.deepEqual(await getState(),beforeOverflow);
  await checkedPost(await review(files[19]));
  const current = await pdf(); assert.equal(current.status,200); const etag=current.headers.get('etag');
  assert.equal(createHash('sha256').update(Buffer.from(await current.arrayBuffer())).digest('hex'),files[19].sha256);
  assert.equal((await pdf({'if-none-match':etag})).status,304);
  await checkedPost({...await command(),action:'unpublish'});
  assert.equal((await pdf({'if-none-match':etag,range:'bytes=0-1'})).status,404);
  await checkedPost(await review(files[0]));
  for(let page=1;page<=10;page++) {
    const png=await fetch(origin+`/admin/resume/preview/${files[0].id}/${page}`,{headers});assert.equal(png.status,200);
    const bytes=Buffer.from(await png.arrayBuffer());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    await writeFile(`private/resume-rehearsal/page-${page}.png`,bytes);
  }
  const stopDownloads=await sample();
  await Promise.all(Array.from({length:4},async()=>{const r=await pdf();assert.equal(r.status,200);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),files[0].sha256);}));
  result.downloadRss=await stopDownloads();
  const before=await snapshot(sourcePool); assert(before.every(row=>row.sha256===row.actual));
  const stateBefore=(await sourcePool.query('select * from resume_pdf_state')).rows;
  const auditBefore=(await sourcePool.query('select * from admin_actions order by id')).rows;
  const sizes=(await sourcePool.query('select sum(byte_size)::bigint as originals,sum(octet_length(inspection::text))::bigint as reports from resume_pdf_versions')).rows[0];
  result.originalBytes=Number(sizes.originals);result.reportBytes=Number(sizes.reports);
  result.databaseDelta=Number((await sourcePool.query('select pg_database_size(current_database()) as bytes')).rows[0].bytes)-result.databaseBaseline;
  let started=performance.now();docker(['exec',dbContainer,'pg_dump','-U',url.username,'-d',source,'-Fc','--no-owner','--no-acl','-f',dump]);result.dumpMs=Math.round(performance.now()-started);
  result.dumpBytes=Number(docker(['exec',dbContainer,'stat','-c','%s',dump]).trim());
  console.log('Capacity and custom dump measured');
  await checkedPost({...await command(),action:'unpublish'});assert.equal((await pdf()).status,404);
  await admin.query(`create database ${restored}`);restoreCreated=true;
  started=performance.now();docker(['exec',dbContainer,'pg_restore','-U',url.username,'-d',restored,'--no-owner','--no-acl','--exit-on-error',dump]);result.restoreMs=Math.round(performance.now()-started);
  const restoredPool=poolFor(restored),restoredRepo=createResumeRepository(restoredPool);
  assert.deepEqual(await snapshot(restoredPool),before);
  assert.deepEqual((await restoredPool.query('select * from resume_pdf_state')).rows,stateBefore);
  assert.deepEqual((await restoredPool.query('select * from admin_actions order by id')).rows,auditBefore);
  await startWeb(restored,newEpoch);await refreshProxy();
  assert.equal((await pdf({'if-none-match':'*'})).status,404);
  assert.equal((await post(firstCommand)).status,409);
  docker(['rm', '-f', web]); running = false;
  const reset={commandId:randomUUID(),expectedRevision:(await restoredRepo.list()).revision};
  const resetArgs=['--no-warnings','--experimental-strip-types','scripts/resume-pdf-recovery.mjs','--command-id',reset.commandId,'--expected-revision',String(reset.expectedRevision)];
  const resetEnv={...process.env,DATABASE_URL:connection(restored),HLOG_RESUME_PDF_ENABLED:'0',HLOG_RESUME_PDF_PUBLICATION_EPOCH:''};
  const resetReceipt=JSON.parse(execFileSync(process.execPath,resetArgs,{env:resetEnv,encoding:'utf8',windowsHide:true}));
  assert.deepEqual(JSON.parse(execFileSync(process.execPath,resetArgs,{env:resetEnv,encoding:'utf8',windowsHide:true})),resetReceipt);
  assert.equal(await restoredRepo.publicMetadata(newEpoch),null);
  assert.deepEqual(await restoredRepo.publish(firstCommand,epoch),firstReceipt);assert.equal(await restoredRepo.publicMetadata(epoch),null);
  console.log('Restored bytes, audit, fresh epoch and offline reset verified');
  await startWeb(restored,newEpoch);await refreshProxy();
  await checkedPost(await review(files[0]));assert.equal((await pdf({},'HEAD')).status,200);
  await restoredPool.query('alter table resume_pdf_versions rename to resume_pdf_versions_unavailable');
  try {
    const unavailable=await pdf({'if-none-match':'*',range:'bytes=0-1'});
    assert.equal(unavailable.status,503);assert.match(unavailable.headers.get('cache-control'),/no-store/);
    assert.deepEqual(await unavailable.json(),{error:'resume_unavailable'});
    const resume=await fetch(publicOrigin+'/resume');assert.equal(resume.status,200);
    const body=await resume.text();assert.match(body,/프로필 요약/);assert.doesNotMatch(body,/href="\/api\/resume\/pdf"/);
  } finally { await restoredPool.query('alter table resume_pdf_versions_unavailable rename to resume_pdf_versions'); }
  assert.equal((await pdf({},'HEAD')).status,200);
  const preserved=await snapshot(restoredPool);
  await startWeb(restored,'','0',previousImage);await refreshProxy();
  assert.equal((await pdf()).status,404);assert.deepEqual(await snapshot(restoredPool),preserved);
  await startWeb(restored,newEpoch);await refreshProxy();assert.equal((await pdf({},'HEAD')).status,200);
  await restoredRepo.unpublish({action:'unpublish',commandId:randomUUID(),expectedRevision:(await restoredRepo.list()).revision});
  assert.equal((await pdf()).status,404);
  assert.equal(result.originalBytes,104857600);assert(result.reportBytes<=10485760);
  assert(result.databaseDelta<=268435456);assert(result.dumpBytes<=209715200);assert(result.maxTemporaryBytes<=33554432);
  assert(result.maxUploadRssDeltaKiB<=65536,`Upload RSS delta ${result.maxUploadRssDeltaKiB} KiB exceeds 64 MiB`);
  result.recovery={hashesAndMetadata:true,pointerAndAudit:true,oldReceiptCannotPublish:true,newEpochRequired:true,offlineReset:true,storageFailureClosed:true,featureOffRollbackPreservedBytes:true};
  await mkdir('private/resume-rehearsal',{recursive:true});await writeFile('private/resume-rehearsal/result.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally {
  if(proxyRunning)docker(['rm','-f',proxy]);if(running)docker(['rm','-f',web]);
  if(networkCreated)docker(['network','rm',network]);
  for(const pool of pools)await pool.end();
  if(restoreCreated)await admin.query(`drop database ${restored}`);
  if(sourceCreated)await admin.query(`drop database ${source}`);
  docker(['exec',dbContainer,'rm','-f',dump]);await admin.end();
}
