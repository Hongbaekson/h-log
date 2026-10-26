import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, lstat, mkdir, mkdtemp, readFile, readdir, rm, statfs, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { join } from "node:path";
import { scanBlogPrivacyText, type BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";
import { resumePdfLimits as limits, resumePdfPolicy, type ResumeInspection } from "./resume-pdf.ts";

const temporaryRoot = "/tmp/hlog-resume";
let activeDirectory: string | undefined;
const sandbox = ["--as=268435456", "--cpu=5", "--fsize=8388608", "--nofile=64", "--core=0", "/usr/bin/enosys",
  ...["socket", "connect", "io_uring_setup", "io_uring_enter", "io_uring_register"].flatMap(name => ["-s", `${name}:EPERM`]), "--"];

// Only fixed server-side callers supply executable/args; never accept a command from HTTP.
export function runBoundedPdfProcess(executable: string, args: string[], signal: AbortSignal, outputLimit = limits.json): Promise<{ stdout: Buffer; stderr: Buffer; code: number | null }> {
  if (process.platform !== "linux" || !["x64", "arm64"].includes(process.arch)) return Promise.reject(new Error("pdf_processor_unavailable"));
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("pdf_timeout")); return; }
    const child = spawn("/usr/bin/prlimit", [...sandbox, executable, ...args], {
      shell: false, detached: true, cwd: "/tmp", stdio: ["ignore", "pipe", "pipe"],
      env: { NODE_ENV: "production", PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", HOME: activeDirectory ?? temporaryRoot, TMPDIR: activeDirectory ?? temporaryRoot },
    });
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let size = 0, failure: Error | undefined;
    const kill = () => { if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch { /* Already reaped. */ } } };
    const stop = (code: string) => { failure ??= new Error(code); kill(); };
    const abort = () => stop("pdf_timeout");
    const timer = setTimeout(abort, 10000);
    signal.addEventListener("abort", abort, { once: true });
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > outputLimit) stop("pdf_unsupported");
      else if (!failure) target.push(chunk);
    };
    child.stdout.on("data", collect(stdout)); child.stderr.on("data", collect(stderr));
    child.on("error", () => { failure = new Error("pdf_processor_unavailable"); });
    child.on("close", code => {
      clearTimeout(timer); signal.removeEventListener("abort", abort); kill();
      if (failure) reject(failure);
      else resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), code });
    });
  });
}

let ready: Promise<ResumeInspection["tools"]> | undefined;
async function prepare(signal: AbortSignal) {
  ready ??= (async () => {
    if (process.platform !== "linux" || !["x64", "arm64"].includes(process.arch)) throw new Error("pdf_processor_unavailable");
    for (const executable of ["prlimit", "enosys", "qpdf", "pdfinfo", "pdftotext", "pdftoppm"]) await access(`/usr/bin/${executable}`, constants.X_OK);
    await mkdir(temporaryRoot, { mode: 0o700, recursive: true });
    const root = await lstat(temporaryRoot);
    if (!root.isDirectory() || root.isSymbolicLink() || root.uid !== process.getuid?.() || (root.mode & 0o777) !== 0o700) throw new Error("pdf_processor_unavailable");
    const filesystem = await statfs(temporaryRoot);
    if (filesystem.type !== 0x1021994 || filesystem.blocks * filesystem.bsize > 32 * 1024 * 1024) throw new Error("pdf_processor_unavailable");
    for (const entry of await readdir(temporaryRoot)) {
      if (/^job-[A-Za-z0-9]+$/.test(entry)) await rm(join(temporaryRoot, entry), { recursive: true, force: true });
    }
    const qpdf = await runBoundedPdfProcess("/usr/bin/qpdf", ["--version"], signal);
    const poppler = await runBoundedPdfProcess("/usr/bin/pdftoppm", ["-v"], signal);
    if (qpdf.code !== 0 || poppler.code !== 0 || !qpdf.stdout.includes("qpdf version 12.3.2") || !poppler.stderr.includes("pdftoppm version 25.12.0")) throw new Error("pdf_processor_unavailable");
    return { qpdf: "12.3.2", poppler: "25.12.0" };
  })().catch(() => { ready = undefined; throw new Error("pdf_processor_unavailable"); });
  return ready;
}

let processing = false;
async function withFile<T>(bytes: Buffer, signal: AbortSignal | undefined, action: (file: string, signal: AbortSignal, tools: ResumeInspection["tools"]) => Promise<T>): Promise<T> {
  if (!bytes.length || bytes.length > limits.bytes) throw new Error("request_too_large");
  if (processing) throw new Error("pdf_busy");
  processing = true;
  let directory: string | undefined;
  const deadline = AbortSignal.any([AbortSignal.timeout(45000), ...(signal ? [signal] : [])]);
  try {
    const tools = await prepare(deadline);
    directory = await mkdtemp(join(temporaryRoot, "job-"));
    activeDirectory = directory;
    const file = join(directory, "input.pdf");
    await writeFile(file, bytes, { mode: 0o600 });
    return await action(file, deadline, tools);
  } finally {
    try { if (directory) await rm(directory, { recursive: true, force: true }); }
    finally { activeDirectory = undefined; processing = false; }
  }
}

async function run(tool: string, args: string[], signal: AbortSignal, limit = limits.json) {
  const result = await runBoundedPdfProcess(`/usr/bin/${tool}`, args, signal, limit);
  if (result.code !== 0 || result.stderr.length) throw new Error("pdf_invalid");
  return result.stdout;
}

type Dictionary = Record<string, unknown>;
function dictionary(value: unknown): Dictionary {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("pdf_invalid");
  return value as Dictionary;
}

function inspectObjects(input: unknown, policy: BlogPrivacyScanPolicy) {
  const json = dictionary(input);
  if (json.version !== 2 || !Array.isArray(json.qpdf) || !Array.isArray(json.pages) || json.pages.length < 1 || json.pages.length > limits.pages) throw new Error("pdf_unsupported");
  if (dictionary(json.encrypt).encrypted !== false) throw new Error("pdf_unsupported");
  const objects = dictionary(json.qpdf[1]);
  if (Object.keys(objects).length > 20000) throw new Error("pdf_unsupported");
  const dereference = (value: unknown): unknown => {
    const visited = new Set<string>();
    while (typeof value === "string" && /^\d+ \d+ R$/.test(value)) {
      if (visited.has(value) || visited.size >= 64) throw new Error("pdf_unsupported");
      visited.add(value);
      const object = dictionary(objects[`obj:${value}`]);
      value = object.value ?? dictionary(object.stream).dict;
    }
    return value;
  };
  const links = new Set<string>(), strings: string[] = [], metadataStreams: string[] = [];
  const linkedActions = new Set<unknown>();
  const collectActions = (value: unknown, depth = 0) => {
    if (depth > 64) throw new Error("pdf_unsupported");
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value)) {
      const data = dictionary(value);
      if (dereference(data["/Subtype"]) === "/Link" && data["/A"] !== undefined) linkedActions.add(dereference(data["/A"]));
    }
    Object.values(value).forEach(item => collectActions(item, depth + 1));
  };
  collectActions(objects);
  const forbidden = new Set(["/JS", "/JavaScript", "/OpenAction", "/AA", "/AcroForm", "/XFA", "/EF", "/EmbeddedFiles", "/AF", "/OCProperties", "/OC", "/RichMediaContent", "/RichMediaSettings", "/Prev", "/Encrypt", "/Collection", "/FS", "/FFilter", "/FDecodeParms"]);
  const activeTypes = new Set(["/JavaScript", "/Launch", "/SubmitForm", "/ImportData", "/GoToR", "/GoToE", "/Rendition", "/Movie", "/Sound", "/Thread", "/Hide", "/Named", "/SetOCGState", "/Trans", "/GoTo3DView", "/ResetForm"]);
  const text = (value: string) => value.startsWith("u:") ? value.slice(2) : Buffer.from(value.slice(2), "hex").toString("latin1");
  const action = (value: unknown) => {
    const data = dictionary(dereference(value));
    const kind = dereference(data["/S"]);
    if (!["/URI", "/GoTo"].includes(kind as string) || data["/Next"] !== undefined) throw new Error("pdf_unsupported");
    if (kind === "/URI") {
      const uri = dereference(data["/URI"]);
      if (typeof uri !== "string" || !uri.startsWith("u:")) throw new Error("pdf_unsupported");
      let url: URL;
      try { url = new URL(uri.slice(2)); } catch { throw new Error("pdf_unsupported"); }
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (url.protocol !== "https:" || url.username || url.password || isIP(host) || !host.includes(".") || /(?:^|\.)(?:localhost|local|internal|corp|lan)$/.test(host)
        || scanBlogPrivacyText(url.href, policy).status !== "passed") throw new Error("pdf_unsupported");
      links.add(url.href);
    }
  };
  const visit = (value: unknown, depth = 0) => {
    if (depth > 64) throw new Error("pdf_unsupported");
    if (typeof value === "string") { if (/^[ub]:/.test(value)) strings.push(text(value)); return; }
    if (Array.isArray(value)) { value.forEach(v => visit(v, depth + 1)); return; }
    if (!value || typeof value !== "object") return;
    const data = dictionary(value);
    for (const key of Object.keys(data)) if (forbidden.has(key)) throw new Error("pdf_unsupported");
    const type = dereference(data["/Type"]), subtype = dereference(data["/Subtype"]), kind = dereference(data["/S"]);
    if (["/FileAttachment", "/Widget", "/RichMedia", "/Movie", "/Sound", "/3D", "/Screen"].includes(subtype as string)) throw new Error("pdf_unsupported");
    if (["/EmbeddedFile", "/Filespec", "/Sig", "/OCG", "/OCMD"].includes(type as string) || activeTypes.has(kind as string)) throw new Error("pdf_unsupported");
    if (type === "/Action" || kind === "/URI" || kind === "/GoTo") {
      if (!linkedActions.has(data)) throw new Error("pdf_unsupported");
      action(data);
    }
    if (data["/A"] !== undefined && type !== "/StructElem") {
      if (subtype !== "/Link") throw new Error("pdf_unsupported");
      action(data["/A"]);
    }
    if (data["/Annots"] !== undefined) {
      const annotations = dereference(data["/Annots"]);
      if (!Array.isArray(annotations)) throw new Error("pdf_invalid");
      for (const annotation of annotations) {
        if (dereference(dictionary(dereference(annotation))["/Subtype"]) !== "/Link") throw new Error("pdf_unsupported");
      }
    }
    if (type === "/Annot" && subtype !== "/Link") throw new Error("pdf_unsupported");
    if (data["/URI"] !== undefined && kind !== "/URI") throw new Error("pdf_unsupported");
    if (data["/F"] !== undefined && data["/Length"] !== undefined) throw new Error("pdf_unsupported"); // External stream file.
    Object.values(data).forEach(v => visit(v, depth + 1));
  };
  visit(objects);
  for (const [key, value] of Object.entries(objects)) {
    const object = dictionary(value);
    if (object.stream && dereference(dictionary(dictionary(object.stream).dict)["/Type"]) === "/Metadata") {
      if (!/^obj:\d+ \d+ R$/.test(key)) throw new Error("pdf_invalid");
      metadataStreams.push(key.slice(4, -2).replace(" ", ","));
    }
  }
  for (const item of json.pages) {
    let page = dictionary(dereference(dictionary(item).object));
    let box = page["/MediaBox"], rotate = page["/Rotate"];
    const seen = new Set<unknown>();
    while (box === undefined && page["/Parent"] !== undefined) {
      if (seen.has(page["/Parent"]) || seen.size >= 64) throw new Error("pdf_invalid");
      seen.add(page["/Parent"]); page = dictionary(dereference(page["/Parent"]));
      box = page["/MediaBox"]; rotate ??= page["/Rotate"];
    }
    const bounds = dereference(box), rotation = dereference(rotate ?? 0);
    if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some(v => typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 14400)
      || bounds[2] <= bounds[0] || bounds[3] <= bounds[1] || typeof rotation !== "number" || rotation % 90 !== 0) throw new Error("pdf_unsupported");
  }
  return { pages: json.pages.length, links: [...links], metadata: strings.join("\n"), metadataStreams };
}

async function render(file: string, page: number, signal: AbortSignal) {
  const output = file + "-page";
  await run("pdftoppm", ["-f", String(page), "-l", String(page), "-singlefile", "-scale-to", "2000", "-png", file, output], signal);
  const path = output + ".png";
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.size > limits.image) throw new Error("pdf_unsupported");
    const png = await readFile(path);
    if (png.length < 24 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || png.readUInt32BE(16) > 2000 || png.readUInt32BE(20) > 2000) throw new Error("pdf_invalid");
    return png;
  } finally { await rm(path, { force: true }); }
}

export async function inspectResumePdf(bytes: Buffer, policy: BlogPrivacyScanPolicy = {}, signal?: AbortSignal): Promise<ResumeInspection> {
  return withFile(bytes, signal, async (file, signal, tools) => {
    const encrypted = await runBoundedPdfProcess("/usr/bin/qpdf", ["--is-encrypted", file], signal);
    if (encrypted.code !== 2) throw new Error("pdf_unsupported");
    await run("qpdf", ["--check", file], signal);
    const data = await run("qpdf", ["--json=2", file], signal);
    let parsed: unknown;
    try { parsed = JSON.parse(data.toString("utf8")); } catch { throw new Error("pdf_invalid"); }
    const structure = inspectObjects(parsed, policy);
    const info = (await run("pdfinfo", ["-f", "1", "-l", String(structure.pages), "-box", file], signal, limits.report)).toString("utf8");
    if (Number(info.match(/^Pages:\s+(\d+)/m)?.[1]) !== structure.pages) throw new Error("pdf_invalid");
    const text = (await run("pdftotext", ["-layout", "-enc", "UTF-8", file, "-"], signal, limits.report)).toString("utf8");
    let metadata = structure.metadata;
    for (const id of structure.metadataStreams) {
      metadata += "\n" + (await run("qpdf", [`--show-object=${id}`, "--filtered-stream-data", file], signal, limits.report)).toString("utf8");
      if (Buffer.byteLength(metadata) > limits.report) throw new Error("pdf_unsupported");
    }
    const report: ResumeInspection = { policy: resumePdfPolicy, pages: structure.pages, text, metadata, links: structure.links, tools };
    if (Buffer.byteLength(JSON.stringify(report)) > limits.report) throw new Error("pdf_unsupported");
    if (scanBlogPrivacyText(JSON.stringify(report), policy).status !== "passed") throw new Error("pdf_privacy_blocked");
    for (let page = 1; page <= report.pages; page++) await render(file, page, signal);
    return report;
  });
}

export function renderResumePage(bytes: Buffer, page: number, inspection: ResumeInspection, signal?: AbortSignal) {
  if (!Number.isInteger(page) || page < 1 || page > inspection.pages || inspection.policy !== resumePdfPolicy) throw new Error("invalid_request");
  return withFile(bytes, signal, (file, signal) => render(file, page, signal));
}
