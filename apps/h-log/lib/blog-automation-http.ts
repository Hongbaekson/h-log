import { authorizeAdminOwner, adminPrivateHeaders } from "./admin-owner.ts";
import { parseAutomationCommand, type AutomationCommand, type AutomationReceipt } from "./blog-automation-policy.ts";

export async function handleAutomationPolicyRequest(request: Request, execute: (command: AutomationCommand) => Promise<AutomationReceipt>, environment: Readonly<Record<string, string | undefined>> = process.env) {
  const denied = authorizeAdminOwner(request, environment);
  if (denied) return denied;
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: adminPrivateHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw Error("unsupported_media_type");
    if (!request.body) throw Error("invalid_request");
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0, timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 10000);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (timedOut) throw Error("request_timeout");
        if (done) break;
        size += value.length;
        if (size > 4096) { await reader.cancel(); throw Error("request_too_large"); }
        chunks.push(value);
      }
    } finally { clearTimeout(timeout); reader.releaseLock(); }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw Error("invalid_request"); }
    return json(await execute(parseAutomationCommand(input)), 200);
  } catch (e) {
    const statuses: Record<string, number> = { invalid_request: 400, request_timeout: 408, request_too_large: 413, unsupported_media_type: 415,
      revision_conflict: 409, command_conflict: 409, unsafe_reason: 422 };
    const code = e instanceof Error && Object.hasOwn(statuses, e.message) ? e.message : "storage_unavailable";
    return json({ error: code }, statuses[code] ?? 503);
  }
}
