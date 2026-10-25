import { assertBrainNoteId, type createBrainRepository } from "./brain-postgres-repository.ts";
import { parseBrainCommand, parseBrainDraft } from "./brain-capture.ts";
import { authorizeBrainOwner, brainPrivateHeaders } from "./brain-owner.ts";

async function readCommand(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("unsupported_media_type");
  if (!request.body) throw new Error("invalid_request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 262144) { await reader.cancel(); throw new Error("request_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let command: unknown;
  try { command = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new Error("invalid_request"); }
  if (!command || typeof command !== "object" || Array.isArray(command)) throw new Error("invalid_request");
  return command as Record<string, unknown>;
}

export async function handleBrainCaptureRequest(
  request: Request,
  repository: () => ReturnType<typeof createBrainRepository>,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<Response> {
  const denied = authorizeBrainOwner(request, environment);
  if (denied) return denied;
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers: brainPrivateHeaders });
  try {
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id");
      if (id === null) return json({ notes: await repository().listOwnerNotes() });
      assertBrainNoteId(id);
      const note = await repository().getOwnerNote(id);
      return note ? json({ note }) : json({ error: "note_not_found" }, 404);
    }
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const command = await readCommand(request);
    const { action, id, revision } = command;
    if (!["save", "publish", "unpublish"].includes(action as string)) throw new Error("invalid_request");
    const keys = action === "save" ? ["action", "id", "revision", "draft"] : action === "publish" ? ["action", "id", "revision", "confirmed"] : ["action", "id", "revision"];
    keys.push("commandId", "commandRevision");
    if (Object.keys(command).some(key => !keys.includes(key))) throw new Error("invalid_request");
    if (id !== undefined || action !== "save") assertBrainNoteId(id);
    if (!Number.isSafeInteger(revision) || (id ? (revision as number) < 1 : revision !== 0)) throw new Error("invalid_revision");
    const metadata = parseBrainCommand(command);
    if (action === "save") {
      const draft = parseBrainDraft(command.draft);
      return json(await repository().saveDraft(draft, id as string | undefined, revision as number, metadata));
    }
    if (action === "publish") {
      if (command.confirmed !== true) throw new Error("publication_confirmation_required");
      return json(await repository().publish(id as string, revision as number, true, metadata));
    }
    return json(await repository().unpublish(id as string, revision as number, metadata));
  } catch (error) {
    const statuses: Record<string, number> = {
      invalid_request: 400, invalid_draft: 400, invalid_note_id: 400, invalid_revision: 400, invalid_link: 400,
      public_copy_required: 400, public_copy_blocked: 422, publication_confirmation_required: 400,
      revision_conflict: 409, note_not_found: 404, request_too_large: 413, unsupported_media_type: 415,
      command_metadata_required: 400, invalid_command_metadata: 400, command_conflict: 409, command_revision_conflict: 409,
    };
    const code = error instanceof Error && Object.hasOwn(statuses, error.message) ? error.message : "storage_unavailable";
    return json({ error: code, ...(code === "command_metadata_required" ? { message: "입력한 내용을 따로 보관한 뒤 화면을 새로고침해 주세요." } : {}) }, statuses[code] ?? 503);
  }
}
