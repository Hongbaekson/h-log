// Composes the existing probe fixture with real Grafana and an internal-only webhook.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { buildProvisioning } from './observability-config.mjs';
import { runObservedPublishCycle } from '../lib/observability-cycle.ts';

export async function prepareRehearsal(app, scratch, path) {
  const config = buildProvisioning();
  config.groups[0].interval = '10s';
  for (const rule of config.groups[0].rules) if (rule.for !== '0s') rule.for = '20s';
  config.contactPoints[0].receivers[0].settings.url = 'http://alert-fixture:8080/notify';
  for (const policy of [config.policies[0], config.policies[0].routes[0], config.policies[0].routes[0].routes[0]]) {
    delete policy.mute_time_intervals;
    policy.group_wait = '1s'; policy.group_interval = '10s'; policy.repeat_interval = '30s';
  }
  await writeFile(path('alerts.json'), JSON.stringify(config));
  await writeFile(path('alerts-mode'), 'normal'); await writeFile(path('events.jsonl'), '');
  await writeFile(path('datasource.json'), JSON.stringify({ apiVersion: 1, datasources: [{ name: 'H-Log Prometheus', uid: 'hlog-prometheus', type: 'prometheus', access: 'proxy', url: 'http://alert-fixture:8080/prom', isDefault: true, editable: false }] }));
  return {
    grafana: { environment: { GF_UNIFIED_ALERTING_MIN_INTERVAL: '10s' }, volumes: [`${path('datasource.json')}:/etc/grafana/provisioning/datasources/prometheus.yml:ro`, `${path('alerts.json')}:/etc/grafana/provisioning/alerting/hlog.json:ro`] },
    'alert-fixture': { image: (await readFile(resolve(app, 'Dockerfile'), 'utf8')).match(/^FROM (node:[^\s]+)/m)[1], user: 'node', read_only: true, cap_drop: ['ALL'], security_opt: ['no-new-privileges:true'], networks: ['monitoring_net'],
      environment: { HLOG_FIXTURE_MODE_FILE: '/fixture/alerts-mode' }, volumes: [`${resolve(app, 'scripts/observability-alerts.fixture.mjs').replaceAll('\\', '/')}:/fixture.mjs:ro`, `${scratch.replaceAll('\\', '/')}:/fixture`], command: ['node', '/fixture.mjs'], mem_limit: '96m', cpus: 0.2 },
  };
}

export async function rehearse({ app, path, docker, compose, origin, authorization, query, eventually }) {
  const directory = resolve(app, 'private/observe-step6'); await mkdir(directory, { recursive: true });
  const evidence = [];
  const api = async route => { const r = await fetch(origin + route, { headers: { authorization }, signal: AbortSignal.timeout(10000) }); assert.equal(r.status, 200); return r.json(); };
  const events = async () => (await readFile(path('events.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const state = async signal => (await api('/api/prometheus/grafana/api/v1/rules')).data.groups.flatMap(group => group.rules).find(rule => rule.labels?.rule === signal)?.state;
  const resetCollector = () => docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'hlog-metrics']);
  const fault = async (name, signal, activate, recover, type = 'actual-service') => {
    const offset = (await events()).length, started = Date.now();
    const matching = async status => (await events()).slice(offset).filter(e => e.signal === signal && e.status === status);
    await activate();
    let recoveryAttempted = false;
    try {
      if (!signal.startsWith('Datasource')) await eventually(async () => assert.equal(await state(signal), 'firing'), 240000);
      await eventually(async () => assert((await matching('firing')).length > 0), 240000);
      const firingMs = Date.now() - started, count = (await matching('firing')).length;
      assert(firingMs <= 240000, 'firing and mock delivery exceeded the bound');
      await delay(12000); assert.equal((await matching('firing')).length, count, 'duplicate before repeat');
      recoveryAttempted = true;
      await recover();
      await eventually(async () => assert((await matching('resolved')).length > 0), 180000);
      evidence.push({ name, signal, type, firingBoundMs: 240000, firingMs, mockFiring: true, duplicateSuppressed: true, mockResolved: true });
      await writeFile(resolve(directory, 'failures.json'), JSON.stringify(evidence, null, 2));
      console.log(`PASS: ${name}, mock firing/dedup/resolution`);
    } catch (error) { if (!recoveryAttempted) await recover(); throw error; }
  };
  await docker([...compose, 'start', 'hlog-postgres', 'postgres-exporter', 'blackbox-exporter']);
  await eventually(async () => assert.equal((await query('count(up == 1)'))[0]?.value[1], '7'));
  const expectations = JSON.parse(await readFile(path('state/expectations.json'), 'utf8'));
  for (const task of ['autopublish', 'backup', 'restore']) expectations[task].enabled = false;
  await writeFile(path('state/expectations.json'), JSON.stringify(expectations)); await resetCollector();
  await eventually(async () => assert.equal(await state('http-blog'), 'inactive'));
  await fault('web stopped', 'http-blog', () => docker([...compose, 'stop', 'hlog-web']), () => docker([...compose, 'start', 'hlog-web']));
  await fault('DB stopped', 'database', () => docker([...compose, 'stop', 'hlog-postgres']), () => docker([...compose, 'start', 'hlog-postgres']));
  await fault('exporter stopped', 'scrape', () => docker([...compose, 'stop', 'postgres-exporter']), () => docker([...compose, 'start', 'postgres-exporter']));
  const original = JSON.parse(await readFile(path('state/autopublish.json'), 'utf8'));
  const summary = async value => { await writeFile(path('state/autopublish.json'), JSON.stringify(value)); await resetCollector(); };
  for (const [name, generate] of [
    ['fake provider throws', async () => { throw Error('PRIVATE_PROVIDER_ERROR'); }],
    ['budget blocks generation', async () => ({ status: 'budget_exceeded' })],
  ]) {
    await fault(name, 'autopublish-failure', async () => {
      let last;
      await runObservedPublishCycle({ generate, runRequiredWorkerOnce: async () => ({ status: 'idle' }), verify: async () => false, write: async value => { last = value; } }).catch(error => assert.equal(error.message, 'PRIVATE_PROVIDER_ERROR'));
      assert(last && !last.verified);
      await summary({ ...original, result: last.result, stage: last.stage });
    }, () => summary(original), 'real-cycle + summary fixture');
  }
  await fault('preflight failure summary', 'autopublish-failure', () => summary({ ...original, result: 'failed', stage: 'preflight' }), () => summary(original), 'summary fixture; Linux hook tested separately');
  await fault('previous summary lost', 'source-autopublish', async () => { await unlink(path('state/autopublish.json')); await resetCollector(); }, () => summary(original), 'real collector file loss');
  for (const [mode, signal] of [['nodata', 'DatasourceNoData'], ['error', 'DatasourceError']]) await fault(`Prometheus ${mode}`, signal, () => writeFile(path('alerts-mode'), mode), () => writeFile(path('alerts-mode'), 'normal'), 'datasource proxy fault');
  // The deterministic source fixture has no network/provider call, but its legacy
  // source_fetch ledger row intentionally lacks provenance. Prove the warning
  // before supplying the known zero estimate for this ONE synthetic row only.
  await fault('source cost without provenance', 'unknown-cost', async () => {}, async () => {
    const updated = await docker([...compose, 'exec', '-T', 'hlog-postgres', 'psql', '-U', 'postgres', '-d', 'hlog', '-tAc', "WITH changed AS (UPDATE usage_events SET cost_basis='estimated' WHERE event_type='source_fetch' AND provider='Example' AND estimated_cost=0 AND cost_basis IS NULL RETURNING 1) SELECT count(*) FROM changed"]);
    assert.equal(updated.trim(), '1'); await resetCollector();
  }, 'real ledger; explicit provenance only for the known synthetic fixture');
  await docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'grafana']);
  await eventually(async () => assert.equal((await api('/api/dashboards/uid/hlog-operations')).dashboard.uid, 'hlog-operations'));
  assert.equal((await api('/api/v1/provisioning/alert-rules')).length, 43);
  evidence.push({ name: 'Grafana recreated', dashboardAndRulesPreserved: true });
  for (const e of await events()) {
    assert.deepEqual(Object.keys(e).sort(), ['observed_at', 'runbook', 'service', 'severity', 'signal', 'status']);
    assert.doesNotMatch(JSON.stringify(e), /PRIVATE_|postgresql|fixture:|generatorURL/);
  }
  await writeFile(resolve(directory, 'failures.json'), JSON.stringify(evidence, null, 2));
  // Production cadence for the soak; only the destination is the isolated mock.
  const config = buildProvisioning(); config.contactPoints[0].receivers[0].settings.url = 'http://alert-fixture:8080/notify';
  for (const route of [config.policies[0].routes[0], config.policies[0].routes[0].routes[0]]) delete route.mute_time_intervals;
  await writeFile(path('alerts.json'), JSON.stringify(config));
  const prom = await readFile(resolve(app, 'deploy/observability/prometheus.yml'), 'utf8');
  await writeFile(path('prometheus.yml'), prom);
  await docker([...compose, 'up', '-d', '--no-deps', '--force-recreate', 'prometheus', 'grafana']);
  await eventually(async () => {
    const rules = (await api('/api/prometheus/grafana/api/v1/rules')).data.groups.flatMap(g => g.rules);
    assert.equal(rules.length, 43); assert(rules.every(r => r.state === 'inactive' && r.health === 'ok'), JSON.stringify(rules.filter(r => r.state !== 'inactive' || r.health !== 'ok').map(r => ({ name: r.name, state: r.state, health: r.health }))));
  }, 240000);
  // Let resolved notifications drain before measuring normal-state noise.
  await delay(10000); await writeFile(path('events.jsonl'), '');
}
