import assert from "node:assert/strict";
import test from "node:test";
import { handleResumeRequest } from "./resume-pdf-http.ts";

const environment = { NODE_ENV: "test", HLOG_ADMIN_ENABLED: "1", HLOG_ADMIN_OWNER_KEY: "a".repeat(64), HLOG_ADMIN_ORIGIN: "http://localhost:3035", HLOG_RESUME_PDF_ENABLED: "1" };
const headers = { host: "localhost:3035", authorization: `Basic ${Buffer.from(`owner:${environment.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`, origin: environment.HLOG_ADMIN_ORIGIN };
const unavailable = () => { throw new Error("PRIVATE_DATABASE_FAILURE"); };
test("PDF records, upload and previews authorize before reading body or storage", async () => {
  for (const resource of ["records", "files", { id: "bad", page: "1" }] as const) {
    const anonymous = await handleResumeRequest(new Request(environment.HLOG_ADMIN_ORIGIN, { headers: { host: headers.host } }), unavailable, resource, environment);
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("cache-control")!, /no-store/);
    const off = await handleResumeRequest(new Request(environment.HLOG_ADMIN_ORIGIN, { headers }), unavailable, resource, { ...environment, HLOG_RESUME_PDF_ENABLED: "0" });
    assert.equal(off.status, 404);
    const origin = await handleResumeRequest(new Request(environment.HLOG_ADMIN_ORIGIN, { method: "POST", headers: { ...headers, origin: "https://other.example" } }), unavailable, resource, environment);
    assert.equal(origin.status, 403);
  }
});

test("publication requires a server epoch before storage access", async () => {
  const command = { action: "publish", commandId: "11111111-1111-4111-8111-111111111111", expectedRevision: 1,
    id: "22222222-2222-4222-8222-222222222222", sha256: "a".repeat(64),
    checklist: { allPages: true, metadataAndLinks: true, privacyAndOrganizations: true, hiddenContentAndSource: true } };
  const req = () => new Request(environment.HLOG_ADMIN_ORIGIN, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(command) });
  const closed = await handleResumeRequest(req(), unavailable, "records", environment);
  assert.equal(closed.status, 409); assert.deepEqual(await closed.json(), { error: "publication_disabled" });
});
test("PDF handlers reject invalid input and never reveal storage errors", async () => {
  const request = (body: string, type = "application/json") => new Request(environment.HLOG_ADMIN_ORIGIN, { method: "POST", headers: { ...headers, "content-type": type }, body });
  assert.equal((await handleResumeRequest(request('{}'), unavailable, "records", environment)).status, 400);
  assert.equal((await handleResumeRequest(request('x'.repeat(16385)), unavailable, "records", environment)).status, 413);
  assert.equal((await handleResumeRequest(request('fake', 'text/plain'), unavailable, "files", environment)).status, 415);
  assert.equal((await handleResumeRequest(request('fake', 'application/pdf'), unavailable, "files", environment)).status, 400);
  const error = await handleResumeRequest(new Request(environment.HLOG_ADMIN_ORIGIN, { headers }), unavailable, "records", environment);
  assert.equal(error.status, 503);
  assert.deepEqual(await error.json(), { error: "storage_unavailable" });
});
