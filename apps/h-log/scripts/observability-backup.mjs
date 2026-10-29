import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants, createWriteStream } from 'node:fs';
import { open, readdir, realpath, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import pg from 'pg';
import { createPostVersionContentHash } from '../lib/blog-content-model.ts';
import { createPostgresBlogRepository } from '../lib/blog-postgres-repository.ts';
import { getPublicBlogPostMarkdown } from '../lib/blog-public.ts';
import { createResumeRepository } from '../lib/resume-pdf-repository.ts';
import { resumePdfLimits, resumePdfPolicy } from '../lib/resume-pdf.ts';
import { writeCycleEvidence } from '../lib/observability-cycle.ts';

const app = resolve(import.meta.dirname, '..'), repository = resolve(app, '../..');
const execute = promisify(execFile);
const poolFor = url => new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000, statement_timeout: 30000 });
const identifier = value => assert(typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value));
const containerName = value => assert(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value));

async function observe(task, write, action) {
  let stage = 'preflight';
  const record = async (result, verified = false) => {
    try { await write({ result, stage, verified, checked_at: Date.now()/1000 }); } catch { /* Evidence cannot retry or change the operation. */ }
  };
  await record('running');
  try {
    await action(async () => { stage = 'verification'; await record('running'); });
    stage = 'complete'; await record('succeeded', true);
  } catch { await record('failed'); throw Error(`${task}_failed`); }
}

// The archive handle stays open across list/restore; pipeline destruction must not close it.
function archiveInput(handle) {
  return Readable.from((async function* () {
    for (let position=0;;) {
      const buffer=Buffer.allocUnsafe(65536), {bytesRead}=await handle.read(buffer,0,buffer.length,position);
      if (!bytesRead) return;
      position+=bytesRead; yield buffer.subarray(0,bytesRead);
    }
  })(),{objectMode:false});
}

// Stream binary archives without shell redirection or logging database output/arguments.
async function dockerStream(args, input, output, listOnly = false) {
  const child = spawn('docker', args, { stdio: [input ? 'pipe' : 'ignore', output ? 'pipe' : 'ignore', 'ignore'], windowsHide: true, signal: AbortSignal.timeout(180000) });
  const exited = new Promise((res, rej) => { child.once('error', rej); child.once('exit', code => code === 0 ? res() : rej(Error('database_command_failed'))); });
  // --list intentionally stops at the TOC. Only that command may close input early;
  // its own exit status must still succeed. A real restore never ignores EPIPE.
  const sending = input && pipeline(input, child.stdin).catch(error => { if (!listOnly || !['EPIPE','EOF'].includes(error.code)) throw error; });
  try { await Promise.all([exited, sending, output && pipeline(child.stdout, output)]); }
  catch { child.kill(); input?.destroy(); output?.destroy(); throw Error('database_command_failed'); }
}

async function externalFile(file) {
  assert(typeof file === 'string' && isAbsolute(file));
  const parent = await realpath(dirname(file)), root = await realpath(repository), path = relative(root, parent);
  assert(path.startsWith('..'+(process.platform === 'win32' ? '\\' : '/')) || isAbsolute(path), 'archive must remain outside the repository');
}

async function checkedArchive(file, container, user) {
  await externalFile(file);
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat(), header = Buffer.alloc(5);
    assert(stat.isFile() && stat.size > 5);
    await handle.read(header, 0, 5, 0); assert.equal(header.toString(), 'PGDMP');
    await dockerStream(['exec','-i',container,'pg_restore','-U',user,'--list'],archiveInput(handle),undefined,true);
    return handle;
  } catch (error) { await handle.close(); throw error; }
}

export async function backupArchive({ container, user, database, file, write = e => writeCycleEvidence(e, process.env, 'backup') }) {
  return observe('backup', write, async verification => {
    containerName(container); identifier(user); identifier(database); await externalFile(file);
    const output = await open(file, 'wx', 0o600);
    let complete = false;
    try {
      try {
        await dockerStream(['exec',container,'pg_dump','-U',user,'-d',database,'--format=custom','--no-owner','--no-acl'], undefined, createWriteStream(file,{ fd: output.fd, autoClose: false }));
        await output.sync();
      } finally { await output.close(); }
      await verification();
      const checked = await checkedArchive(file, container, user); await checked.close();
      if (process.platform !== 'win32') {
        const parent = await open(dirname(file), 'r');
        try { await parent.sync(); } finally { await parent.close(); }
      }
      complete = true;
    } finally { if (!complete) await unlink(file).catch(() => undefined); }
  });
}

export async function verifyRestoredDatabase(pool) {
  const expected = (await readdir(resolve(app,'migrations'))).filter(f=>/^\d+_[a-z0-9_]+\.sql$/.test(f)).map(f=>f.slice(0,-4)).sort();
  assert.deepEqual((await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(r=>r.version),expected);
  assert.equal((await pool.query("SELECT '[1,2,3]'::vector <-> '[1,2,3]'::vector AS distance")).rows[0].distance,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM posts p LEFT JOIN post_versions v ON v.id=p.current_version_id AND v.post_id=p.id
    WHERE (p.current_version_id IS NOT NULL AND v.id IS NULL) OR (p.status='published' AND p.current_version_id IS NULL)`)).rows[0].n,0);
  let last = '';
  for (;;) {
    const rows = (await pool.query('SELECT id,content_markdown,content_html,content_hash FROM post_versions WHERE id>$1 ORDER BY id LIMIT 100',[last])).rows;
    for (const r of rows) assert.equal(createPostVersionContentHash({ contentMarkdown:r.content_markdown,contentHtml:r.content_html }),r.content_hash);
    if (rows.length < 100) break;
    last = rows.at(-1).id;
  }
  const pdf = await pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE encode(sha256(bytes),'hex')<>sha256 OR octet_length(bytes)<>byte_size
    OR byte_size NOT BETWEEN 1 AND $1 OR page_count NOT BETWEEN 1 AND $2 OR validation_policy<>$3
    OR inspection->>'policy' IS DISTINCT FROM $3 OR (inspection->>'pages')::int IS DISTINCT FROM page_count
    OR inspection->'tools' IS DISTINCT FROM tool_versions)::int AS invalid FROM resume_pdf_versions`,[resumePdfLimits.bytes,resumePdfLimits.pages,resumePdfPolicy]);
  assert.equal(pdf.rows[0].invalid,0); assert(pdf.rows[0].total<=resumePdfLimits.versions);
  assert.equal((await pool.query('SELECT count(*)::int n FROM resume_pdf_state WHERE id=1')).rows[0].n,1);
}

async function publicSmoke(pool, databaseUrl, epoch) {
  const socket = createServer();
  await new Promise((res,rej)=>{socket.once('error',rej);socket.listen(0,'127.0.0.1',res);});
  const port = socket.address().port;
  await new Promise((res,rej)=>socket.close(error=>error?rej(error):res()));
  const child = spawn(process.execPath, [resolve(app,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)], {
    cwd: app, windowsHide: true, stdio: 'ignore',
    env: { ...process.env, DATABASE_URL:databaseUrl, HLOG_ADMIN_ENABLED:'0', HLOG_BRAIN_DATABASE_ENABLED:'0', HLOG_RESUME_PDF_ENABLED:'1', HLOG_RESUME_PDF_PUBLICATION_EPOCH:epoch, HLOG_PUBLIC_BASE_URL:'https://hlog.example.org' },
  });
  let startError;
  child.on('error',error=>{startError=error;});
  const exited = new Promise(res=>child.once('exit',res));
  const get = (path,options={}) => fetch(`http://127.0.0.1:${port}${path}`,{...options,redirect:'manual',signal:AbortSignal.timeout(5000)});
  try {
    let ready=false;
    for(let i=0;i<60;i++) {
      if(startError || child.exitCode!==null) throw Error('rehearsal_start_failed');
      try { ready=(await get('/resume')).status===200; } catch { /* Startup only. */ }
      if(ready)break;
      await delay(500);
    }
    assert(ready);
    assert.equal((await get('/blog')).status,200);
    const store=await createPostgresBlogRepository(pool).findPublicBlogContent();
    const all=(await pool.query('SELECT slug FROM posts ORDER BY id')).rows;
    for(const {slug} of all) {
      const markdown=getPublicBlogPostMarkdown(slug,store), path='/blog/'+encodeURIComponent(slug);
      assert.equal((await get(path)).status,markdown===undefined?404:200);
      const response=await get(path+'.md');
      assert.equal(response.status,markdown===undefined?404:200);
      if(markdown!==undefined)assert.equal(await response.text(),markdown);
    }
    for(const method of ['GET','HEAD']) assert.equal((await get('/api/resume/pdf',{method,headers:{'If-None-Match':'*','Range':'bytes=0-5'}})).status,404);
    assert.equal((await get('/admin')).status,404);
  } finally {
    if(child.exitCode===null && !startError) { child.kill(); await exited; }
  }
}

export async function restoreArchive({ container, user, databaseUrl, file, write = e => writeCycleEvidence(e, process.env, 'restore') }) {
  return observe('restore',write,async verification=>{
    containerName(container); identifier(user);
    const url=new URL(databaseUrl);
    assert(['127.0.0.1','localhost'].includes(url.hostname) && ['postgres:','postgresql:'].includes(url.protocol));
    assert.equal(url.search,''); // libpq query options must not override the checked host/port/user.
    assert.equal(decodeURIComponent(url.username),user);
    const info=JSON.parse((await execute('docker',['inspect',container],{windowsHide:true,timeout:10000,maxBuffer:1024*1024})).stdout)[0];
    // This command may only create a fresh DB inside an explicitly disposable local container.
    assert.equal(info.Config.Labels?.['hlog.restore-rehearsal'],'1');
    assert(Object.hasOwn(info.HostConfig.Tmpfs??{},'/var/lib/postgresql/data'));
    assert(!info.Mounts?.some(m=>m.Type!=='tmpfs' && m.Destination.startsWith('/var/lib/postgresql')));
    assert(!info.Config.Env.some(e=>e.startsWith('PGDATA=') && e!=='PGDATA=/var/lib/postgresql/data'));
    assert(info.NetworkSettings.Ports['5432/tcp']?.some(p=>p.HostIp==='127.0.0.1' && p.HostPort===url.port));
    const archive=await checkedArchive(file,container,user);
    const database='hlog_restore_'+randomUUID().replaceAll('-','');
    url.pathname='/postgres'; const admin=poolFor(url.href);
    let restored,created=false;
    try {
      await admin.query(`CREATE DATABASE ${database}`); created=true;
      await dockerStream(['exec','-i',container,'pg_restore','-U',user,'-d',database,'--exit-on-error','--no-owner','--no-acl'],archiveInput(archive));
      url.pathname='/'+database; restored=poolFor(url.href);
      await verification(); await verifyRestoredDatabase(restored);
      const epoch=randomUUID(), repo=createResumeRepository(restored), state=await repo.list();
      assert.equal(await repo.publicMetadata(epoch),null);
      await publicSmoke(restored,url.href,epoch);
      const reset=await repo.resetAfterRecovery({commandId:randomUUID(),expectedRevision:state.revision});
      assert.equal(reset.publicVersionId,null);
      assert.equal((await repo.list()).publicVersionId,null);
      assert.equal((await restored.query("SELECT count(*)::int n FROM admin_actions WHERE command_id=$1 AND reason='resume_recovery_reset'",[reset.commandId])).rows[0].n,1);
    } finally {
      await archive.close();
      try { if(restored)await restored.end(); if(created)await admin.query(`DROP DATABASE ${database} WITH (FORCE)`); }
      finally { await admin.end(); }
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  try {
    const {positionals,values}=parseArgs({allowPositionals:true,options:{file:{type:'string'}}}), task=positionals[0];
    assert(positionals.length===1 && ['backup','restore'].includes(task));
    assert(!process.env.HLOG_OBSERVABILITY_TASK || process.env.HLOG_OBSERVABILITY_TASK===task);
    if(task==='backup')await backupArchive({container:process.env.HLOG_BACKUP_DB_CONTAINER,user:process.env.HLOG_BACKUP_DB_USER??'postgres',database:process.env.HLOG_BACKUP_DB_NAME,file:values.file});
    else await restoreArchive({container:process.env.HLOG_RESTORE_DB_CONTAINER,user:process.env.HLOG_RESTORE_DB_USER??'postgres',databaseUrl:process.env.HLOG_RESTORE_DATABASE_URL,file:values.file});
    console.log('backup_restore_check_succeeded');
  } catch { console.error('backup_restore_check_failed'); process.exitCode=1; }
}
