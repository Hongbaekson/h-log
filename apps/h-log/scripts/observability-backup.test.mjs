import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile, readdir, unlink, rmdir, chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import pg from 'pg';
import { backupArchive, restoreArchive, verifyRestoredDatabase } from './observability-backup.mjs';
import { runBlogMigrations } from './blog-migrations.mjs';
import { createPostVersionContentFromMarkdown } from '../lib/blog-content-model.ts';
import { createResumeRepository } from '../lib/resume-pdf-repository.ts';
import { resumePdfPolicy } from '../lib/resume-pdf.ts';
import { syntheticPdf } from './resume-pdf-fixtures.mjs';
import { readFileMetrics } from '../lib/observability-publishing.ts';

const execute = promisify(execFile), app = resolve(import.meta.dirname, '..');
const docker = async args => (await execute('docker', args, { timeout: 180000, maxBuffer: 1024*1024, windowsHide: true })).stdout.trim();

test('real checked backup and isolated restore retain data, verify public routes and keep failures separate', { skip: process.env.HLOG_OBSERVABILITY_BACKUP_SMOKE !== '1', timeout: 600000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'hlog-backup-'));
  await chmod(scratch,0o700);
  if (process.platform === 'win32') await execute('icacls',[scratch,'/inheritance:r','/grant:r',`${process.env.USERNAME}:(OI)(CI)F`]);
  const container = 'hlog-backup-'+randomUUID().slice(0,8), password = randomBytes(24).toString('hex');
  const file = join(scratch,'checked.dump'), stateDir = join(scratch,'state');
  let id, pool;
  const records = [];
  const host = (task,action,invocation,result='success') => docker(['run','--rm','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',`type=bind,source=${resolve(app,'scripts')},target=/scripts,readonly`,'--mount',`type=bind,source=${stateDir},target=/state`,'-e',`INVOCATION_ID=${invocation}`,'-e',`SERVICE_RESULT=${result}`,'-e','EXIT_CODE=exited','-e',`EXIT_STATUS=${result==='success'?0:1}`,'-e','PYTHONDONTWRITEBYTECODE=1','python:3.14-alpine@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2','python','/scripts/observability-state.py','--directory','/state','--task',task,action]);
  const observed = async (task, operation) => {
    const invocation=randomUUID().replaceAll('-','');
    await host(task,'start',invocation);
    const write=async evidence => {
      records.push(evidence);
      await writeFile(join(stateDir,'evidence',task+'.json'),JSON.stringify({schema_version:1,invocation_id:invocation,...evidence}));
    };
    try { await operation(write); }
    catch(error) { await host(task,'finish',invocation,'exit-code'); throw error; }
    await host(task,'finish',invocation);
    assert.match(await readFileMetrics(join(stateDir,task+'.json'),task),new RegExp(`hlog_batch_result\\{task="${task}",result="succeeded"} 1`));
  };
  try {
    await writeFile(join(scratch,'password'),password,{mode:0o444}); await mkdir(stateDir,{mode:0o750});
    id = await docker(['run','-d','--name',container,'--label','hlog.restore-rehearsal=1','--tmpfs','/var/lib/postgresql/data','-p','127.0.0.1::5432','--mount',`type=bind,source=${join(scratch,'password')},target=/run/secrets/password,readonly`,'-e','POSTGRES_DB=hlog','-e','POSTGRES_PASSWORD_FILE=/run/secrets/password','pgvector/pgvector:pg16@sha256:a36250871de0833b8757561c72f2477ef1ddd1101afa4e617fb552e0de514c6b']);
    const info=JSON.parse(await docker(['inspect',id]))[0];
    const url=`postgresql://postgres:${password}@127.0.0.1:${info.NetworkSettings.Ports['5432/tcp'][0].HostPort}/hlog`;
    pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:2000});
    for(let i=0;;i++) { try { await pool.query('SELECT 1'); break; } catch { if(i>=40)throw Error('fixture readiness'); await delay(250); } }
    await runBlogMigrations(url);
    // Incompressible data makes pg_restore --list close stdin before the whole archive is written.
    await pool.query('CREATE TABLE restore_stream_fixture(bytes bytea)');
    await pool.query('INSERT INTO restore_stream_fixture VALUES($1)',[randomBytes(2*1024*1024)]);
    for(const status of ['published','drafted']) {
      const content=createPostVersionContentFromMarkdown(`## Synthetic ${status}\n\nLocal restore check.\n`);
      await pool.query("INSERT INTO posts(id,slug,title,description,article_mode,status,created_at,updated_at,published_at) VALUES($1,$1,$1,'Synthetic local fixture','project_record',$2,now(),now(),now())",['fixture-'+status,status]);
      await pool.query("INSERT INTO post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) VALUES($1,$1,1,$1,'Synthetic local fixture',$2,$3,$4,'system',now())",['fixture-'+status,content.contentMarkdown,content.contentHtml,content.contentHash]);
      await pool.query('UPDATE posts SET current_version_id=id WHERE id=$1',['fixture-'+status]);
    }
    const repo=createResumeRepository(pool), bytes=syntheticPdf();
    const upload=await repo.saveUpload(bytes,{policy:resumePdfPolicy,pages:2,text:'synthetic',metadata:'',links:[],tools:{qpdf:'synthetic',poppler:'synthetic'}},{commandId:randomUUID(),expectedRevision:0});
    const state=await repo.list();
    await repo.publish({commandId:randomUUID(),expectedRevision:1,action:'publish',id:upload.targetId,sha256:state.versions[0].sha256,checklist:{allPages:true,metadataAndLinks:true,privacyAndOrganizations:true,hiddenContentAndSource:true}},randomUUID());
    const options={container,user:'postgres',database:'hlog',file};
    await observed('backup',write=>backupArchive({...options,write}));
    assert.equal(records.at(-1).result,'succeeded'); assert.equal(records.at(-1).verified,true);
    const backupSuccess=JSON.parse(await readFile(join(stateDir,'backup.json'))).last_success_at;
    await assert.rejects(observed('backup',write=>backupArchive({...options,write}))); // Never overwrite the checked archive.
    assert.equal(JSON.parse(await readFile(join(stateDir,'backup.json'))).last_success_at,backupSuccess);
    await observed('restore',write=>restoreArchive({container,user:'postgres',databaseUrl:url,file,write}));
    assert.equal(records.at(-1).result,'succeeded');
    assert.equal((await pool.query("SELECT count(*)::int n FROM pg_database WHERE datname LIKE 'hlog_restore_%'")).rows[0].n,0);
    assert.notEqual((await repo.list()).publicVersionId,null,'source PDF publication is unchanged');
    await writeFile(join(scratch,'broken.dump'),'PGDMP broken synthetic archive');
    const restoreSuccess=JSON.parse(await readFile(join(stateDir,'restore.json'))).last_success_at;
    await assert.rejects(observed('restore',write=>restoreArchive({container,user:'postgres',databaseUrl:url,file:join(scratch,'broken.dump'),write})));
    assert.equal(records.at(-1).result,'failed');
    await pool.query("UPDATE post_versions SET content_markdown='tampered' WHERE id='fixture-published'");
    await assert.rejects(verifyRestoredDatabase(pool));
    const corrupt=join(scratch,'corrupt.dump');
    await observed('backup',write=>backupArchive({...options,file:corrupt,write}));
    await assert.rejects(observed('restore',write=>restoreArchive({container,user:'postgres',databaseUrl:url,file:corrupt,write})));
    assert.equal(records.at(-1).stage,'verification'); assert.equal(records.at(-1).result,'failed');
    assert.doesNotMatch(JSON.stringify(records),new RegExp(`${password}|fixture-published|dump|postgresql|${container}`));
    assert.equal(JSON.parse(await readFile(join(stateDir,'restore.json'))).last_success_at,restoreSuccess);
    assert.match(await readFileMetrics(join(stateDir,'restore.json'),'restore'),/result="failed"} 1/);
    await assert.rejects(restoreArchive({container,user:'postgres',databaseUrl:url.replace(/:\d+\/hlog$/,':1/hlog'),file}),/restore_failed/);
    const silent=join(scratch,'observation-failure.dump');
    await backupArchive({...options,file:silent,write:async()=>{throw Error('observation offline');}});
    assert((await readFile(silent)).subarray(0,5).equals(Buffer.from('PGDMP')));
    console.log('PASS: custom dump, isolated restore, migration/vector/hash, public/private HTTP, PDF epoch/reset, corruption and private evidence');
  } finally {
    if(pool)await pool.end(); if(id)await docker(['rm','-f',id]);
    for(const dir of [join(stateDir,'evidence'),stateDir,scratch]) { for(const name of await readdir(dir).catch(()=>[]))await unlink(join(dir,name)); await rmdir(dir).catch(()=>undefined); }
  }
});
