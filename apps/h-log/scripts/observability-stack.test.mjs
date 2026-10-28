import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const app = resolve(import.meta.dirname, "..");
const project = "hlog-observe-local";
const overlay = ["compose", "-p", project, "-f", "compose.observability.yaml"];
async function docker(args) {
  return (await execute("docker", args, { cwd: app, timeout: 180_000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
}
async function inspect(service) {
  const id = await docker([...overlay, "ps", "-q", service]);
  return JSON.parse(await docker(["inspect", id]))[0];
}
async function eventually(check) {
  const deadline = Date.now() + 90_000;
  let last;
  while (Date.now() < deadline) {
    try { return await check(); } catch (error) { last = error; }
    await delay(1000);
  }
  throw last;
}

test("isolated monitoring is private, bounded and durable across container recreation", {
  skip: process.env.HLOG_OBSERVABILITY_SMOKE !== "1",
  timeout: 360_000,
}, async () => {
  const secretFile = process.env.HLOG_GRAFANA_PASSWORD_FILE;
  assert.ok(secretFile && isAbsolute(secretFile), "absolute external secret file required");
  const relativeSecret = relative(resolve(app, "../.."), resolve(secretFile));
  assert.ok(relativeSecret.startsWith("..") || isAbsolute(relativeSecret), "secret must be outside repository");
  const password = (await readFile(secretFile, "utf8")).trim();
  assert.ok(password.length >= 32, "use a generated local test password");
  // Refuse to adopt or remove an existing project, including its retained volumes.
  for (const kind of ["container", "volume", "network"]) {
    assert.equal(await docker([kind, "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]), "", "test project must be fresh");
  }
  const base = JSON.parse(await docker(["compose", "-f", "compose.yaml", "config", "--format", "json"]));
  const combined = JSON.parse(await docker(["compose", "-f", "compose.yaml", "-f", "compose.observability.yaml", "--profile", "observability", "config", "--format", "json"]));
  for (const [name, service] of Object.entries(base.services)) assert.deepEqual(combined.services[name], service);
  const inactive = JSON.parse(await docker(["compose", "-f", "compose.yaml", "-f", "compose.observability.yaml", "config", "--format", "json"]));
  assert.deepEqual(Object.keys(inactive.services).sort(), Object.keys(base.services).sort());
  const config = JSON.parse(await docker([...overlay, "--profile", "observability", "config", "--format", "json"]));
  assert.deepEqual(Object.keys(config.services).sort(), ["grafana", "monitoring-gateway", "prometheus"]);
  assert.equal(config.networks.monitoring_net.internal, true);
  assert.equal(config.networks.grafana_access_net.internal, true);
  const scratch = await mkdtemp(resolve(tmpdir(), "hlog-observe-smoke-"));
  const fixture = resolve(scratch, "compose.json");
  const nodeImage = (await readFile(resolve(app, "Dockerfile"), "utf8")).match(/^FROM (node:[^\s]+).*$/m)[1];
  await writeFile(fixture, JSON.stringify({ services: {
    "hlog-web": {
      image: nodeImage, user: "node", init: true, read_only: true, cap_drop: ["ALL"],
      command: ["node", "-e", "require('http').createServer((q,s)=>s.end('isolated-upstream')).listen(3000,'0.0.0.0')"],
      networks: ["smoke_net"],
    },
    "ingress-smoke": {
      image: base.services["hlog-nginx"].image,
      volumes: [`${resolve(app, "deploy/nginx/conf.d").replaceAll("\\", "/")}:/etc/nginx/conf.d:ro`],
      ports: ["127.0.0.1::80"], networks: ["smoke_net", "smoke_access_net"], depends_on: ["hlog-web"],
    },
  }, networks: { smoke_net: { internal: true }, smoke_access_net: {} } }));
  const compose = [...overlay, "-f", fixture, "--profile", "observability"];
  const authorization = `Basic ${Buffer.from(`owner:${password}`).toString("base64")}`;
  let origin;
  const api = (path, options = {}) => fetch(`${origin}${path}`, {
    ...options, headers: { authorization, "content-type": "application/json" }, signal: AbortSignal.timeout(10_000),
  });
  async function json(path, options) {
    const response = await api(path, options);
    assert.equal(response.status, 200, path);
    return response.json();
  }
  const query = (expression, time) => json(`/api/datasources/proxy/uid/hlog-prometheus/api/v1/query?${new URLSearchParams({ query: expression, ...(time ? { time: String(time) } : {}) })}`);
  try {
    await docker([...overlay, "--profile", "observability", "run", "--rm", "--no-deps", "--entrypoint", "promtool", "prometheus", "check", "config", "/etc/prometheus/prometheus.yml"]);
    await docker([...compose, "up", "-d", "--wait", "--wait-timeout", "120"]);
    const grafana = await inspect("grafana");
    const prometheus = await inspect("prometheus");
    const gateway = await inspect("monitoring-gateway");
    assert.deepEqual(prometheus.HostConfig.PortBindings, {});
    assert.deepEqual(grafana.HostConfig.PortBindings, {});
    assert.equal(gateway.HostConfig.PortBindings["8080/tcp"][0].HostIp, "127.0.0.1");
    origin = `http://127.0.0.1:${gateway.NetworkSettings.Ports["8080/tcp"][0].HostPort}`;
    for (const [container, memory, cpu, user] of [[prometheus, 384, 350_000_000, "65534:65534"], [grafana, 304, 200_000_000, "472:0"], [gateway, 16, 50_000_000, "101:101"]]) {
      assert.equal(container.Config.User, user);
      assert.equal(container.HostConfig.Memory, memory * 1024 * 1024);
      assert.equal(container.HostConfig.NanoCpus, cpu);
      assert.equal(container.HostConfig.ReadonlyRootfs, true);
      assert.deepEqual(container.HostConfig.CapDrop, ["ALL"]);
      assert.ok(container.HostConfig.SecurityOpt.includes("no-new-privileges:true"));
      assert.deepEqual(container.HostConfig.LogConfig.Config, { "max-file": "3", "max-size": "10m" });
      assert.ok(container.Mounts.filter((mount) => mount.Type === "bind").every((mount) => !mount.RW));
    }
    assert.deepEqual(Object.keys(prometheus.NetworkSettings.Networks), [`${project}_monitoring_net`]);
    assert.deepEqual(Object.keys(grafana.NetworkSettings.Networks).sort(), [`${project}_grafana_access_net`, `${project}_monitoring_net`]);
    assert.deepEqual(Object.keys(gateway.NetworkSettings.Networks).sort(), [`${project}_grafana_access_net`, `${project}_monitoring_access_net`]);
    for (const container of [prometheus, grafana]) {
      const routes = await docker(["exec", container.Id, "cat", "/proc/net/route"]);
      assert.ok(routes.split("\n").slice(1).every((line) => line.trim().split(/\s+/)[1] !== "00000000"), "no default egress route");
    }
    await docker(["exec", gateway.Id, "nginx", "-t"]);
    for (const path of ["/metrics", "/probe", "/prometheus"]) assert.equal((await fetch(`${origin}${path}`)).status, 404);
    assert.equal((await fetch(`${origin}/api/datasources`, { signal: AbortSignal.timeout(5000) })).status, 401);
    assert.equal((await fetch(`${origin}/api/datasources`, { headers: { authorization: "Basic b3duZXI6d3Jvbmc=" }, signal: AbortSignal.timeout(5000) })).status, 401);
    const settings = await json("/api/admin/settings");
    for (const [section, key] of [["auth.anonymous", "enabled"], ["users", "allow_sign_up"], ["users", "allow_org_create"], ["snapshots", "enabled"], ["snapshots", "external_enabled"], ["public_dashboards", "enabled"], ["analytics", "reporting_enabled"]]) {
      assert.equal(settings[section][key], "false", `${section}.${key}`);
    }
    const datasource = await json("/api/datasources/uid/hlog-prometheus");
    assert.equal(datasource.url, "http://prometheus:9090");
    assert.equal(datasource.readOnly, true);
    assert.equal((await json("/api/datasources/uid/hlog-prometheus/health")).status, "OK");
    await eventually(async () => assert.equal((await query("up")).data.result[0]?.value[1], "1"));
    const beforeTime = Math.floor(Date.now() / 1000);
    const before = (await query("up", beforeTime)).data.result;
    assert.equal(before.length, 1);
    assert.deepEqual(before[0].metric, { __name__: "up", instance: "prometheus", job: "prometheus" });
    const series = (await query('{job="prometheus"}')).data.result;
    assert.ok(series.length > 5 && series.length <= 20);
    for (const sample of series) assert.deepEqual(Object.keys(sample.metric).sort(), ["__name__", "instance", "job"]);
    const flags = await json("/api/datasources/proxy/uid/hlog-prometheus/api/v1/status/flags");
    assert.equal(flags.data["storage.tsdb.retention.time"], "1w");
    assert.ok(["1GB", "1GiB"].includes(flags.data["storage.tsdb.retention.size"]));
    await json("/api/dashboards/db", { method: "POST", body: JSON.stringify({ dashboard: { uid: "hlog-storage-smoke", title: "Isolated storage smoke", schemaVersion: 41, panels: [] } }) });
    const ingressId = await docker([...compose, "ps", "-q", "ingress-smoke"]);
    const ingress = JSON.parse(await docker(["inspect", ingressId]))[0];
    const publicOrigin = `http://127.0.0.1:${ingress.NetworkSettings.Ports["80/tcp"][0].HostPort}`;
    for (const path of ["/", "/blog", "/resume", "/portfolio"]) {
      assert.equal(await (await fetch(`${publicOrigin}${path}`)).text(), "isolated-upstream");
    }
    for (const path of ["/admin", "/admin/metrics", "/api/internal/metrics", "/metrics", "/metrics/", "/probe?target=example", "/prometheus/api/v1/query", "/grafana/"]) {
      assert.equal((await fetch(`${publicOrigin}${path}`)).status, 404, path);
    }
    const promIp = Object.values(prometheus.NetworkSettings.Networks)[0].IPAddress;
    const webId = await docker([...compose, "ps", "-q", "hlog-web"]);
    await docker(["exec", webId, "node", "-e", `fetch('http://${promIp}:9090/-/ready',{signal:AbortSignal.timeout(1500)}).then(()=>process.exit(1)).catch(()=>process.exit(0))`]);
    // Both the named volume identity and old samples must survive new containers.
    await docker([...overlay, "--profile", "observability", "up", "-d", "--force-recreate", "--wait", "--wait-timeout", "120"]);
    const afterProm = await inspect("prometheus");
    const afterGrafana = await inspect("grafana");
    const afterGateway = await inspect("monitoring-gateway");
    assert.equal(afterGateway.RestartCount, 0);
    assert.equal(afterGateway.State.OOMKilled, false);
    assert.notEqual(afterProm.Id, prometheus.Id);
    assert.notEqual(afterGrafana.Id, grafana.Id);
    for (const [first, second] of [[prometheus, afterProm], [grafana, afterGrafana]]) {
      assert.deepEqual(first.Mounts.filter((m) => m.Type === "volume").map((m) => m.Name), second.Mounts.filter((m) => m.Type === "volume").map((m) => m.Name));
      assert.equal(second.RestartCount, 0);
      assert.equal(second.State.OOMKilled, false);
    }
    assert.deepEqual((await query("up", beforeTime)).data.result, before);
    assert.equal((await json("/api/dashboards/uid/hlog-storage-smoke")).dashboard.uid, "hlog-storage-smoke");
    assert.equal((await json("/api/datasources/uid/hlog-prometheus")).id, datasource.id);
    assert.equal((await json("/api/datasources/uid/hlog-prometheus/health")).status, "OK");
    await json("/api/dashboards/uid/hlog-storage-smoke", { method: "DELETE" });
    console.log("PASS: config/profile, promtool, auth, self-scrape, datasource, ingress/isolation, limits and recreation persistence");
  } finally {
    await docker([...compose, "down", "--volumes", "--timeout", "20"]);
    await rm(fixture);
    await rmdir(scratch);
  }
});
