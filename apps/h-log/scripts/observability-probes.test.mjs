import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, readdir, unlink, rmdir, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import test from "node:test";
import pg from "pg";
import { readDatabaseMetrics } from "../lib/observability-collector.ts";
import { runBlogMigrations } from "./blog-migrations.mjs";
import { publishingFixture } from "./observability-publishing.fixture.mjs";
import { runObservedPublishCycle } from "../lib/observability-cycle.ts";
import { backupArchive } from "./observability-backup.mjs";
import { prepareRehearsal, rehearse } from "./observability-rehearsal.mjs";

const app = resolve(import.meta.dirname, "..");
const project = "hlog-observe-probes-local";
const execute = promisify(execFile);
const docker = async args => (await execute("docker", args, { cwd: app, timeout: 240_000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
async function eventually(check, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { return await check(); } catch (error) { last = error; }
    await delay(1000);
  }
  throw last;
}

test("isolated host/DB/HTTP probes enforce permissions, privacy and distinguish failures", {
  skip: process.env.HLOG_OBSERVABILITY_PROBES_SMOKE !== "1", timeout: 2400_000,
}, async () => {
  for (const kind of ["container", "volume", "network"]) assert.equal(await docker([kind, "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]), "", "must not adopt an existing project");
  const scratch = await mkdtemp(resolve(tmpdir(), "hlog-observe-probes-"));
  await chmod(scratch, 0o700);
  if (process.platform === "win32") await execute("icacls", [scratch, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:(OI)(CI)F`]);
  const path = name => resolve(scratch, name).replaceAll("\\", "/");
  const password = randomBytes(24).toString("hex");
  const exporterPassword = randomBytes(24).toString("hex");
  const collectorPassword = randomBytes(24).toString("hex");
  const base = JSON.parse(await docker(["compose", "-f", "compose.yaml", "config", "--format", "json"]));
  const fixture = path("compose.json");
  const publishing = process.env.HLOG_OBSERVABILITY_PUBLISHING_SMOKE === "1";
  const rehearsal = process.env.HLOG_OBSERVABILITY_REHEARSAL === "1";
  assert(!rehearsal || publishing, 'rehearsal requires publishing fixture');
  let preserve = false;
  const compose = ["compose", "-p", project, "-f", "compose.observability.yaml", "-f", "compose.observability-probes.yaml", ...(publishing ? ["-f", "compose.observability-publishing.yaml"] : []), ...(rehearsal ? ["-f", "compose.observability-alerts.yaml"] : []), "-f", fixture, "--profile", "observability"];
  const envKeys = ["HLOG_GRAFANA_PASSWORD_FILE", "HLOG_EXPORTER_URI_FILE", "HLOG_EXPORTER_PASSWORD_FILE", "HLOG_COLLECTOR_DSN_FILE", "HLOG_OBSERVABILITY_STATE_DIR", "HLOG_OBSERVABILITY_GID", "HLOG_DAILY_ESTIMATED_COST_LIMIT", "HLOG_MONTHLY_ESTIMATED_COST_LIMIT"];
  const oldEnv = envKeys.map(key => process.env[key]);
  let admin;
  let pool;
  let integration;
  let expectedSuccess;
  let expectedBackup;
  try {
    for (const [key, name, content] of [
      [envKeys[0], "grafana-password", password],
      [envKeys[1], "exporter-uri", "hlog-postgres:5432/hlog?sslmode=disable&connect_timeout=2&options=-c%20statement_timeout%3D3000"],
      [envKeys[2], "exporter-password", exporterPassword],
      [envKeys[3], "collector-dsn", `postgresql://hlog_metrics_collector:${collectorPassword}@hlog-postgres:5432/hlog?sslmode=disable`],
    ]) { await writeFile(path(name), content, { mode: 0o444 }); process.env[key] = path(name); }
    await writeFile(path("db-password"), password, { mode: 0o444 });
    await writeFile(path("mode"), "normal");
    if (publishing) {
      await mkdir(path("state"), { mode: 0o750 });
      process.env.HLOG_OBSERVABILITY_STATE_DIR = path("state");
      process.env.HLOG_OBSERVABILITY_GID = "1000";
      process.env.HLOG_DAILY_ESTIMATED_COST_LIMIT = "1";
      process.env.HLOG_MONTHLY_ESTIMATED_COST_LIMIT = "10";
      const off = { enabled: false, enabled_at: 0, maintenance_from: 0, maintenance_until: 0 };
      await writeFile(path("state/expectations.json"), JSON.stringify({ schema_version: 1, autopublish: { ...off, enabled: true, enabled_at: Math.floor(Date.now()/86400000)*86400-60 }, backup: off, restore: off }), { mode: 0o640 });
    }
    const openssl = process.env.HLOG_TEST_OPENSSL || (process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl");
    await execute(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", rehearsal ? "30" : "2", "-subj", "/CN=hlog-web", "-addext", "subjectAltName=DNS:hlog-web", "-keyout", path("key.pem"), "-out", path("cert.pem")]);
    await chmod(path("key.pem"), 0o444);
    const blackbox = await readFile(resolve(app, "deploy/observability/blackbox.yml"), "utf8");
    await writeFile(path("blackbox.yml"), `${blackbox}\n      tls_config:\n        ca_file: /fixtures/cert.pem\n`);
    // Fast Prometheus fixture scrapes; the deployed 60-second config is validated separately.
    const prom = await readFile(resolve(app, "deploy/observability/prometheus.yml"), "utf8");
    assert.match(prom, /scrape_interval: 60s/);
    await writeFile(path("prometheus.yml"), prom.replace("scrape_interval: 60s", "scrape_interval: 10s"));
    const probes = await readFile(resolve(app, "deploy/observability/probes/host-db-http.yml"), "utf8");
    await writeFile(path("probes.yml"), probes.replaceAll("http://hlog-web:3000", "https://hlog-web:3443"));
    await writeFile(path("fixture.mjs"), `
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { createRequire } from 'node:module';
const pg = createRequire('/app/package.json')('pg');
const pool = new pg.Pool({ host: 'hlog-postgres', database: 'hlog', user: 'postgres', password: readFileSync('/fixtures/db-password','utf8'), max: 1, connectionTimeoutMillis: 1000, statement_timeout: 1000 });
pool.on('error',()=>{});
createServer({ key: readFileSync('/fixtures/key.pem'), cert: readFileSync('/fixtures/cert.pem') }, async (q,s) => {
  if (!['/','/blog'].includes(q.url)) { s.writeHead(404).end(); return; }
  if (q.url === '/') { s.end('home'); return; }
  const mode = readFileSync('/fixtures/mode','utf8');
  if (mode === 'timeout') { setTimeout(()=>s.end('late'), 7000); return; }
  if (mode === 'redirect') { s.writeHead(302,{location:'https://example.invalid/'}).end(); return; }
  if (mode === 'failure') { s.writeHead(503).end(); return; }
  try { await pool.query('SELECT 1'); s.end('db-backed-blog'); } catch { s.writeHead(503).end(); }
}).listen(3443,'0.0.0.0');
`);
    const common = { read_only: true, cap_drop: ["ALL"], security_opt: ["no-new-privileges:true"] };
    await writeFile(fixture, JSON.stringify({ services: {
      ...(rehearsal ? await prepareRehearsal(app, scratch, path) : {}),
      "hlog-postgres": { image: base.services["hlog-postgres"].image, environment: { POSTGRES_DB: "hlog", POSTGRES_PASSWORD_FILE: "/run/secrets/db_password" }, secrets: ["db_password"], networks: ["data_net", "test_access_net"], ports: ["127.0.0.1::5432"], ...(rehearsal ? { volumes: ['rehearsal_database:/var/lib/postgresql/data'] } : { tmpfs: ["/var/lib/postgresql/data"] }), healthcheck: { test: ["CMD-SHELL", "pg_isready -U postgres -d hlog"], interval: "1s", timeout: "2s", retries: 30 } },
      "hlog-web": { ...common, image: "hlog-metrics:local", user: "1000:1000", command: ["node", "/fixtures/fixture.mjs"], volumes: ["fixture.mjs", "key.pem", "cert.pem", "db-password", "mode"].map(name => `${path(name)}:/fixtures/${name}:ro`), networks: ["probe_net", "data_net"] },
      prometheus: { volumes: [`${path("prometheus.yml")}:/etc/prometheus/prometheus.yml:ro`, `${path("probes.yml")}:/etc/prometheus/probes/host-db-http.yml:ro`] },
      "blackbox-exporter": { volumes: [`${path("blackbox.yml")}:/etc/blackbox/config.yml:ro`, `${path("cert.pem")}:/fixtures/cert.pem:ro`] },
    }, secrets: { db_password: { file: path("db-password") } }, networks: { test_access_net: {} }, ...(rehearsal ? { volumes: { rehearsal_database: {} } } : {}) }));
    const config = JSON.parse(await docker([...compose, "config", "--format", "json"]));
    for (const service of ["node-exporter", "postgres-exporter", "blackbox-exporter", "hlog-metrics"]) {
      assert.equal(config.services[service].ports, undefined);
      assert.equal(config.services[service].read_only, true);
      assert.deepEqual(config.services[service].cap_drop, ["ALL"]);
    }
    const combined = JSON.parse(await docker(["compose", "-f", "compose.yaml", "-f", "compose.observability.yaml", "-f", "compose.observability-probes.yaml", "--profile", "observability", "config", "--format", "json"]));
    for (const [name, service] of Object.entries(base.services)) assert.deepEqual(combined.services[name], service);
    await docker([...compose, "build", "hlog-metrics"]);
    await docker([...compose, "run", "--rm", "--no-deps", "--entrypoint", "promtool", "prometheus", "check", "config", "/etc/prometheus/prometheus.yml"]);
    await docker([...compose, "up", "-d", "--wait", "hlog-postgres"]);
    const inspect = async service => JSON.parse(await docker(["inspect", await docker([...compose, "ps", "-q", service])]))[0];
    const db = await inspect("hlog-postgres");
    const localUrl = `postgresql://postgres:${password}@127.0.0.1:${db.NetworkSettings.Ports["5432/tcp"][0].HostPort}/hlog`;
    admin = new pg.Client({ connectionString: localUrl });
    await admin.connect();
    await admin.query(await readFile(resolve(app, "deploy/observability/database-roles.sql"), "utf8"));
    await admin.query(`ALTER ROLE hlog_metrics_exporter LOGIN PASSWORD '${exporterPassword}'; ALTER ROLE hlog_metrics_collector LOGIN PASSWORD '${collectorPassword}'; CREATE TABLE private_content (body text); INSERT INTO private_content VALUES ('PRIVATE_CANARY');`);
    if (publishing) {
      await runBlogMigrations(localUrl);
      await admin.query(await readFile(resolve(app, "deploy/observability/publishing-views.sql"), "utf8"));
      const hostState = (action, invocation, task='autopublish') => docker(["run", "--rm", "--network", "none", "--read-only", "--user", "1000:1000", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--mount", `type=bind,source=${resolve(app, 'scripts')},target=/scripts,readonly`, "--mount", `type=bind,source=${path('state')},target=/state`, "-e", `INVOCATION_ID=${invocation}`, "-e", "SERVICE_RESULT=success", "-e", "EXIT_CODE=exited", "-e", "EXIT_STATUS=0", "-e", "PYTHONDONTWRITEBYTECODE=1", "python:3.14-alpine@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2", "python", "/scripts/observability-state.py", "--directory", "/state", '--task', task, action]);
      let invocation = 'a'.repeat(32);
      await hostState('start', invocation);
      const writer = evidence => writeFile(path('state/evidence/autopublish.json'), JSON.stringify({ schema_version: 1, invocation_id: invocation, ...evidence }), { mode: 0o640 });
      const fixturePool = new pg.Pool({ connectionString: localUrl });
      try {
        const options = await publishingFixture(fixturePool, writer);
        await hostState('finish', invocation);
        const success = JSON.parse(await readFile(path('state/autopublish.json'), 'utf8'));
        assert.equal(success.result, 'succeeded'); expectedSuccess = success.last_success_at;
        invocation = 'b'.repeat(32);
        await hostState('start', invocation);
        await runObservedPublishCycle(options);
        await hostState('finish', invocation);
        const duplicate = JSON.parse(await readFile(path('state/autopublish.json'), 'utf8'));
        assert.equal(duplicate.result, 'skipped'); assert.equal(duplicate.last_success_at, expectedSuccess);
      } finally { await fixturePool.end(); }
      const backupInvocation='c'.repeat(32);
      await hostState('start',backupInvocation,'backup');
      await backupArchive({container:db.Id,user:'postgres',database:'hlog',file:path('verified.dump'),write:evidence=>writeFile(path('state/evidence/backup.json'),JSON.stringify({schema_version:1,invocation_id:backupInvocation,...evidence}),{mode:0o640})});
      await hostState('finish',backupInvocation,'backup');
      expectedBackup=JSON.parse(await readFile(path('state/backup.json'),'utf8')).last_success_at;
      assert(expectedBackup>0);
      console.log('PASS: fake provider, six real required checks, durable success and duplicate preservation');
    }
    for (const [role, secret] of [["hlog_metrics_exporter", exporterPassword], ["hlog_metrics_collector", collectorPassword]]) {
      const url = new URL(localUrl); url.username = role; url.password = secret;
      const client = new pg.Client({ connectionString: url.toString() });
      await client.connect();
      try {
        assert.equal((await client.query("SHOW statement_timeout")).rows[0].statement_timeout, "3s");
        assert.equal((await client.query("SELECT pg_has_role(current_user, 'pg_monitor', 'MEMBER') AS member")).rows[0].member, false);
        await client.query("SET default_transaction_read_only = off");
        for (const sql of ["SELECT * FROM private_content", "INSERT INTO private_content VALUES ('x')", "CREATE TABLE forbidden (id int)", "CREATE TEMP TABLE forbidden (id int)", "CREATE SCHEMA forbidden"]) await assert.rejects(client.query(sql), error => error.code === "42501", sql);
        if (role === "hlog_metrics_exporter") await assert.rejects(client.query("SELECT * FROM monitoring.database_health"), error => error.code === "42501");
      } finally { await client.end(); }
    }
    const collectorUrl = new URL(localUrl); collectorUrl.username = "hlog_metrics_collector"; collectorUrl.password = collectorPassword;
    pool = new pg.Pool({ connectionString: collectorUrl.toString(), max: 1, connectionTimeoutMillis: 2000 });
    assert.ok((await readDatabaseMetrics(pool, publishing)).maxConnections > 0);
    if (publishing) {
      const restricted = await pool.connect();
      try { for (const sql of ['SELECT * FROM posts', 'SELECT * FROM usage_events', "UPDATE publish_jobs SET status='failed'"]) await assert.rejects(restricted.query(sql), error => error.code === '42501' || error.code === '25006'); }
      finally { restricted.release(); }
    }
    // A real blocked lock appears in the aggregate, without query text or backend identifiers.
    const lock = new pg.Client({ connectionString: localUrl });
    const waiter = new pg.Client({ connectionString: localUrl });
    await lock.connect(); await waiter.connect();
    try {
      await lock.query("BEGIN; LOCK private_content IN ACCESS EXCLUSIVE MODE");
      const waiting = waiter.query("SELECT * FROM private_content");
      await eventually(async () => assert.ok((await readDatabaseMetrics(pool)).waitingLocks >= 1));
      await lock.query("ROLLBACK"); await waiting;
    } finally { await lock.end(); await waiter.end(); }
    // Prove the query deadline and safe connection disposal using a slow aggregate view.
    await admin.query("CREATE OR REPLACE VIEW monitoring.database_health AS SELECT 100::int AS max_connections, 0::bigint AS waiting_locks, 0::bigint AS connections FROM pg_sleep(10)");
    const started = Date.now();
    await assert.rejects(readDatabaseMetrics(pool), error => error.code === "57014");
    assert.ok(Date.now() - started < 5500);
    await admin.query("CREATE OR REPLACE VIEW monitoring.database_health AS SELECT current_setting('max_connections')::int AS max_connections, (SELECT count(*) FROM pg_locks WHERE NOT granted) AS waiting_locks, (SELECT coalesce(sum(numbackends),0)::bigint FROM pg_stat_database) AS connections");
    await pool.end(); pool = undefined;
    // Run the repository's full DB gates on this new disposable cluster when requested.
    if (process.env.HLOG_OBSERVABILITY_FULL_INTEGRATION === "1") {
      integration = execute("npm.cmd", ["run", "test:integration"], { cwd: app, shell: process.platform === "win32", env: { ...process.env, DATABASE_URL: localUrl }, timeout: 240_000, maxBuffer: 8 * 1024 * 1024 });
      const result = await integration;
      assert.doesNotMatch(result.stdout, /# fail [1-9]/);
      console.log("PASS: full application integration gates on isolated cluster");
    }
    await docker([...compose, "up", "-d", "--wait", "--wait-timeout", "120"]);
    const gateway = await inspect("monitoring-gateway");
    const origin = `http://127.0.0.1:${gateway.NetworkSettings.Ports["8080/tcp"][0].HostPort}`;
    const authorization = `Basic ${Buffer.from(`owner:${password}`).toString("base64")}`;
    const query = async expression => {
      const response = await fetch(`${origin}/api/datasources/proxy/uid/hlog-prometheus/api/v1/query?${new URLSearchParams({ query: expression })}`, { headers: { authorization }, signal: AbortSignal.timeout(10_000) });
      assert.equal(response.status, 200);
      return (await response.json()).data.result;
    };
    const value = async (expression, expected) => eventually(async () => assert.equal((await query(expression))[0]?.value[1], String(expected), expression));
    await value('count(up == 1)', 7);
    await value("pg_up", 1);
    await value('hlog_metrics_collection_success{source="db"}', 1);
    await value('count(probe_success == 1)', 2);
    if (publishing) {
      await value('hlog_metrics_collection_success{source="autopublish"}', 1);
      await value('hlog_batch_last_success_timestamp_seconds{task="backup"}',expectedBackup);
      await value('hlog_schedule_expected_enabled{task="backup"}',0);
      await value('hlog_schedule_expected_enabled{task="restore"}',0);
      await value('hlog_metrics_source_state{source="restore",state="missing"}',1);
      assert.equal((await query('hlog_batch_last_success_timestamp_seconds{task="restore"}')).length,0);
      await value('hlog_autopublish_last_success_timestamp_seconds', expectedSuccess);
      await value('hlog_usage_included_events{window="day"}', 1);
      await value('hlog_batch_result{result="skipped"}', 1);
      await value('sum(hlog_publish_jobs{state="succeeded",importance="required"})', 6);
      await docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'hlog-metrics']);
      await value('hlog_autopublish_last_success_timestamp_seconds', expectedSuccess);
      const original = await readFile(path('state/autopublish.json'), 'utf8');
      await value('hlog_batch_last_success_timestamp_seconds{task="backup"}',expectedBackup);
      await writeFile(path('state/autopublish.json'), '{');
      await docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'hlog-metrics']);
      await value('hlog_metrics_source_state{source="autopublish",state="invalid"}', 1);
      await value('hlog_metrics_collection_success{source="db"}', 1);
      await eventually(async () => assert.equal((await query('hlog_autopublish_last_success_timestamp_seconds')).length, 0));
      await writeFile(path('state/autopublish.json'), original);
      await docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'hlog-metrics']);
      await value('hlog_autopublish_last_success_timestamp_seconds', expectedSuccess);
    }
    assert.ok(Number((await query("node_memory_MemTotal_bytes"))[0]?.value[1]) > 0);
    assert.ok((await query("node_filesystem_size_bytes")).length > 0);
    const nodeContainer = await inspect("node-exporter");
    const promContainer = await inspect("prometheus");
    assert.equal(await docker(["exec", nodeContainer.Id, "stat", "-f", "-c", "%i:%t", "/storage"]), await docker(["exec", promContainer.Id, "stat", "-f", "-c", "%i:%t", "/prometheus"]), "empty local volume must represent the monitored Docker data filesystem");
    assert.deepEqual(nodeContainer.Mounts.filter(m => m.Type === "bind").map(m => m.Destination).sort(), ["/proc/cpuinfo", "/proc/meminfo", "/proc/stat"]);
    assert.ok((await query('pg_stat_database_numbackends{database="app"}')).length === 1);
    const expiry = Number((await query('probe_ssl_earliest_cert_expiry{target="home"}'))[0].value[1]);
    assert.ok(expiry > Date.now() / 1000 && expiry < Date.now() / 1000 + (rehearsal ? 31 : 3) * 86400);
    for (const mode of ["failure", "timeout", "redirect"]) {
      await writeFile(path("mode"), mode);
      await value('probe_success{target="blog"}', 0);
      await value('probe_success{target="home"}', 1);
      await value('up{job="http",target="blog"}', 1);
      if (mode === "timeout") assert.ok(Number((await query('probe_duration_seconds{target="blog"}'))[0].value[1]) >= 4);
      await writeFile(path("mode"), "normal");
      await value('probe_success{target="blog"}', 1);
    }
    for (const service of ["node-exporter", "postgres-exporter", "blackbox-exporter", "hlog-metrics"]) {
      const container = await inspect(service);
      assert.deepEqual(container.HostConfig.PortBindings, {});
      assert.equal(container.HostConfig.Privileged, false);
      assert.ok(container.Mounts.filter(m => m.Type === "bind").every(m => !m.RW));
      assert.equal(container.State.OOMKilled, false);
      assert.equal(container.RestartCount, 0);
      const routes = await docker(["exec", container.Id, "cat", "/proc/net/route"]);
      assert.ok(routes.split("\n").slice(1).every(line => line.trim().split(/\s+/)[1] !== "00000000"));
    }
    const series = await query('{__name__=~".+"}');
    const allowed = new Set(["__name__", "job", "instance", "cpu", "mode", "mountpoint", "database", "source", "state", "target", "job_type", "importance", "window", "task", "result", "stage"]);
    for (const sample of series) {
      assert.ok(Object.keys(sample.metric).every(key => allowed.has(key)), JSON.stringify(sample.metric));
      assert.doesNotMatch(JSON.stringify(sample.metric), /postgresql|hlog-postgres|hlog-web|PRIVATE_CANARY|127\.0\.0\.1|datid|datname/);
    }
    await admin.end(); admin = undefined;
    await docker([...compose, "stop", "hlog-postgres"]);
    await value("pg_up", 0);
    await value('up{job="database"}', 1);
    await value('hlog_metrics_collection_success{source="db"}', 0);
    if (publishing) {
      await value('hlog_metrics_collection_success{source="autopublish"}', 1);
      await value('hlog_autopublish_last_success_timestamp_seconds', expectedSuccess);
    }
    await value('probe_success{target="blog"}', 0);
    await value('probe_success{target="home"}', 1);
    await docker([...compose, "stop", "postgres-exporter", "blackbox-exporter"]);
    await value('up{job="database"}', 0);
    await value('up{job="probe-exporter"}', 0);
    await value('up{job="http",target="home"}', 0);
    const logs = await docker([...compose, "logs", "--no-color", "postgres-exporter", "hlog-metrics", "blackbox-exporter"]);
    assert.doesNotMatch(logs, new RegExp(`${password}|${exporterPassword}|${collectorPassword}|PRIVATE_CANARY|postgresql://|hlog-postgres`));
    console.log("PASS: host/DB/probe metrics, bounded queries, permission denial, locks, TLS bounds, HTTP status/timeout/redirect, DB/exporter failure, label/log privacy, no egress/host ports");
    if (rehearsal) {
      await rehearse({ app, path, docker, compose, origin, authorization, query, eventually });
      if (process.env.HLOG_OBSERVABILITY_SOAK_START === '1') {
        const ids = (await docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`])).split(/\s+/).filter(Boolean);
        const directory = resolve(app, 'private/observe-step6');
        await writeFile(resolve(directory, 'stack.json'), JSON.stringify({ project, scratch, compose, origin, ids, passwordFile: path('grafana-password'), environment: Object.fromEntries(envKeys.map(key => [key, process.env[key]])), preparedAt: new Date().toISOString() }, null, 2));
        preserve = true;
        console.log('PASS: isolated stack retained; start bounded observation with observability:soak run');
      }
    }
  } finally {
    if (pool) await pool.end();
    if (admin) await admin.end();
    if (!preserve) await docker([...compose, "down", "--volumes", "--timeout", "15"]);
    envKeys.forEach((key, index) => { if (oldEnv[index] === undefined) delete process.env[key]; else process.env[key] = oldEnv[index]; });
    // Only files created in our unique scratch directory; no recursive deletion.
    if (!preserve && publishing) {
      const evidence = path('state/evidence');
      for (const name of await readdir(evidence).catch(() => [])) await unlink(resolve(evidence, name));
      await rmdir(evidence).catch(() => undefined);
      for (const name of await readdir(path('state')).catch(() => [])) await unlink(path(`state/${name}`));
      await rmdir(path('state')).catch(() => undefined);
    }
    if (!preserve) {
      for (const name of await readdir(scratch)) await unlink(resolve(scratch, name));
      await rmdir(scratch);
    }
  }
});
