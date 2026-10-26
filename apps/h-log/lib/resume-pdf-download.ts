import { resumePublicationEpoch } from "./resume-pdf.ts";
import type { createResumeRepository } from "./resume-pdf-repository.ts";

type Repository = Pick<ReturnType<typeof createResumeRepository>, "publicFile" | "publicMetadata">;
const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow, noarchive" };
let active = 0;

export async function handleResumeDownload(request: Request, getRepository: () => Repository, environment: Readonly<Record<string, string | undefined>> = process.env): Promise<Response> {
  const error = (status: number, code: string, extra = {}) => new Response(request.method === "HEAD" ? null : JSON.stringify({ error: code }), {
    status, headers: { ...headers, "content-type": "application/json", ...extra },
  });
  if (!["GET", "HEAD"].includes(request.method)) return error(405, "method_not_allowed", { allow: "GET, HEAD" });
  const epoch = resumePublicationEpoch(environment);
  if (environment.HLOG_RESUME_PDF_ENABLED !== "1" || !epoch || new URL(request.url).search) return error(404, "resume_not_found");
  let held = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const release = () => {
    if (held) { active--; held = false; }
    clearTimeout(timer);
    if (abort) request.signal.removeEventListener("abort", abort);
  };
  try {
    const repository = getRepository();
    // Under pressure, check visibility without loading a fifth bytea. The file query remains authoritative.
    if (active >= 4) return await repository.publicMetadata(epoch) ? error(429, "resume_busy", { "retry-after": "2" }) : error(404, "resume_not_found");
    active++; held = true;
    const file = await repository.publicFile(epoch);
    if (!file) { release(); return error(404, "resume_not_found"); }
    if (request.signal.aborted) throw new Error("aborted");
    const etag = `"${file.sha256}"`;
    const match = (value: string, weak: boolean) => value.trim() === "*" || value.split(",").some(tag => (weak ? tag.trim().replace(/^W\//, "") : tag.trim()) === etag);
    const ifMatch = request.headers.get("if-match"), ifNone = request.headers.get("if-none-match");
    if (ifMatch !== null && !match(ifMatch, false)) { release(); return error(412, "precondition_failed"); }
    if (ifNone !== null && match(ifNone, true)) { release(); return new Response(null, { status: 304, headers: { ...headers, etag } }); }
    const success = { ...headers, etag, "content-type": "application/pdf", "content-length": String(file.byteSize),
      "content-disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent("이력서.pdf")}`, "accept-ranges": "none" };
    if (request.method === "HEAD") { release(); return new Response(null, { headers: success }); }
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        abort = () => { release(); controller.error(new Error("resume_unavailable")); };
        request.signal.addEventListener("abort", abort, { once: true });
        timer = setTimeout(abort, 30000); timer.unref();
      },
      pull(controller) {
        const end = Math.min(offset + 65536, file.byteSize);
        controller.enqueue(new Uint8Array(file.bytes.subarray(offset, end))); offset = end;
        if (offset === file.byteSize) { controller.close(); release(); }
      },
      cancel() { release(); },
    }, { highWaterMark: 0 });
    return new Response(body, { headers: success });
  } catch { release(); return error(503, "resume_unavailable"); }
}
