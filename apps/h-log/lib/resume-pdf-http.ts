import { authorizeAdminOwner, adminPrivateHeaders } from "./admin-owner.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";
import { assertResumeId, parseResumeCommand, parseResumeMetadata, resumePdfLimits } from "./resume-pdf.ts";
import { inspectResumePdf, renderResumePage } from "./resume-pdf-processor.ts";
import type { createResumeRepository } from "./resume-pdf-repository.ts";

async function readBody(request: Request, maximum: number, signal = request.signal) {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new Error("invalid_request");
  if (length !== null && Number(length) > maximum) throw new Error("request_too_large");
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.toLowerCase() !== "identity") throw new Error("unsupported_media_type");
  if (!request.body) throw new Error("invalid_request");
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(30000)]);
  const reader = request.body.getReader();
  const abort = () => { void reader.cancel().catch(() => undefined); };
  deadline.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (deadline.aborted) throw new Error("request_timeout");
    for (;;) {
      const { value, done } = await reader.read();
      if (deadline.aborted) throw new Error("request_timeout");
      if (done) break;
      size += value.length;
      if (size > maximum) throw new Error("request_too_large");
      chunks.push(value);
    }
    if (!size || (length !== null && Number(length) !== size)) throw new Error("invalid_request");
    return Buffer.concat(chunks, size);
  } finally {
    deadline.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined); reader.releaseLock();
  }
}

export async function handleResumeRequest(request: Request, getRepository: () => ReturnType<typeof createResumeRepository>, resource: "records" | "files" | { readonly id: string; readonly page: string }, environment: Readonly<Record<string, string | undefined>> = process.env): Promise<Response> {
  const denied = authorizeAdminOwner(request, environment);
  if (denied) return denied;
  const headers = { ...adminPrivateHeaders, "x-content-type-options": "nosniff" };
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  if (environment.HLOG_RESUME_PDF_ENABLED !== "1") return json({ error: "not_configured" }, 404);
  try {
    if (typeof resource === "object") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
      assertResumeId(resource.id);
      if (!/^(?:[1-9]|10)$/.test(resource.page)) throw new Error("invalid_request");
      const repository = getRepository();
      const png = await repository.withProcessingLock(async signal => {
        const file = await repository.file(resource.id);
        if (!file) throw new Error("file_not_found");
        return renderResumePage(file.bytes, Number(resource.page), file.inspection, signal);
      }, request.signal);
      return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png", "content-length": String(png.length), "content-security-policy": "default-src 'none'; sandbox" } });
    }
    if (resource === "files") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      if (request.headers.get("content-type")?.toLowerCase() !== "application/pdf") throw new Error("unsupported_media_type");
      const revision = request.headers.get("x-hlog-expected-revision") ?? "";
      if (!/^(?:0|[1-9]\d{0,9})$/.test(revision)) throw new Error("invalid_request");
      const command = parseResumeMetadata({ commandId: request.headers.get("x-hlog-command-id"), expectedRevision: Number(revision) });
      const repository = getRepository();
      return json(await repository.withProcessingLock(async signal => {
        const bytes = await readBody(request, resumePdfLimits.bytes, signal);
        const inspection = await inspectResumePdf(bytes, createBlogPrivacyScanPolicyFromEnvironment(environment), signal);
        if (signal.aborted) throw new Error("request_timeout");
        return repository.saveUpload(bytes, inspection, command);
      }, request.signal));
    }
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id");
      if (id === null) return json(await getRepository().list());
      assertResumeId(id);
      const detail = await getRepository().detail(id);
      return detail ? json(detail) : json({ error: "file_not_found" }, 404);
    }
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (request.headers.get("content-type")?.split(";")[0].toLowerCase() !== "application/json") throw new Error("unsupported_media_type");
    const bytes = await readBody(request, 16384);
    let value: unknown;
    try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new Error("invalid_request"); }
    const command = parseResumeCommand(value);
    return json(await getRepository().saveNote(command));
  } catch (error) {
    const statuses: Record<string, number> = { invalid_request: 400, unsupported_media_type: 415, request_too_large: 413, request_timeout: 408,
      pdf_invalid: 422, pdf_unsupported: 422, pdf_privacy_blocked: 422, pdf_timeout: 422, pdf_processor_unavailable: 503, pdf_busy: 429,
      duplicate_file: 409, revision_conflict: 409, command_conflict: 409, storage_full: 409, file_not_found: 404 };
    const code = error instanceof Error && Object.hasOwn(statuses, error.message) ? error.message : "storage_unavailable";
    if (code === "pdf_busy") return Response.json({ error: code }, { status: 429, headers: { ...headers, "retry-after": "2" } });
    const existingId = code === "duplicate_file" && error && typeof error === "object" && "existingId" in error ? error.existingId : undefined;
    return json({ error: code, ...(existingId ? { existingId } : {}) }, statuses[code] ?? 503);
  }
}
