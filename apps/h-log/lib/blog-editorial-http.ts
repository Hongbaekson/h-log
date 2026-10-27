import { authorizeAdminOwner, adminPrivateHeaders } from "./admin-owner.ts";
import { parseEditorialCommand, type EditorialCommand, type EditorialReceipt } from "./blog-editorial-command.ts";

export async function handleEditorialRequest(request: Request, execute: (command: EditorialCommand) => Promise<EditorialReceipt>, environment: Readonly<Record<string, string | undefined>> = process.env) {
  const denied = authorizeAdminOwner(request, environment);
  if (denied) return denied;
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers: adminPrivateHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Error("unsupported_media_type");
    if (!request.body) throw new Error("invalid_request");
    const reader = request.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0, timedOut = false;
    const timeout = setTimeout(()=>{ timedOut = true; void reader.cancel().catch(()=>undefined); }, 10000);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (timedOut) throw new Error("request_timeout");
        if (done) break;
        size += value.length;
        if (size > 262144) { await reader.cancel(); throw new Error("request_too_large"); }
        chunks.push(value);
      }
    } finally { clearTimeout(timeout); reader.releaseLock(); }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new Error("invalid_request"); }
    return json(await execute(parseEditorialCommand(input)));
  } catch (error) {
    const statuses: Record<string, number> = { invalid_request: 400, request_timeout: 408, request_too_large: 413, unsupported_media_type: 415,
      review_required: 422, publication_disabled: 422, automation_paused: 422, quality_blocked: 422, unsafe_reason: 422, post_not_found: 404,
      version_conflict: 409, revision_conflict: 409, state_conflict: 409, command_conflict: 409 };
    const code = error instanceof Error && Object.hasOwn(statuses, error.message) ? error.message : "storage_unavailable";
    return json({ error: code }, statuses[code] ?? 503);
  }
}
