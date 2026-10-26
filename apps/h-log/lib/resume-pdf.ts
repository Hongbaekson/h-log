export const resumePdfLimits = { bytes: 5 * 1024 * 1024, pages: 10, versions: 20, report: 512 * 1024, json: 8 * 1024 * 1024, image: 8 * 1024 * 1024 } as const;
export const resumePdfPolicy = "resume-pdf-v1";
export type ResumeCommand = { commandId: string; expectedRevision: number };
export type ResumeNoteCommand = ResumeCommand & { action: "save_note"; id: string; note: string };
export type ResumeInspection = { policy: string; pages: number; text: string; metadata: string; links: string[]; tools: { qpdf: string; poppler: string } };
export type ResumeVersion = { id: string; sha256: string; byteSize: number; pageCount: number; note: string; createdAt: string };
export type ResumeState = { revision: number; publicVersionId: string | null; versions: ResumeVersion[] };
export type ResumeDetail = ResumeVersion & { inspection: ResumeInspection };
export type ResumeReceipt = { commandId: string; action: "upload" | "save_note"; targetId: string; revision: number; publicVersionId: string | null };

export function assertResumeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)) throw new Error("invalid_request");
}
export function parseResumeMetadata(value: { commandId?: unknown; expectedRevision?: unknown }): ResumeCommand {
  assertResumeId(value.commandId);
  if (!Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0 || (value.expectedRevision as number) >= 2147483647) throw new Error("invalid_request");
  return { commandId: value.commandId, expectedRevision: value.expectedRevision as number };
}
export function parseResumeCommand(value: unknown): ResumeNoteCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["action", "commandId", "expectedRevision", "id", "note"].includes(key))
    || input.action !== "save_note" || typeof input.note !== "string" || input.note.length > 2000 || input.note.includes("\0")) throw new Error("invalid_request");
  assertResumeId(input.id);
  return { action: "save_note", ...parseResumeMetadata(input), id: input.id, note: input.note };
}
