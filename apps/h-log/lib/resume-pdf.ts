export const resumePdfLimits = { bytes: 5 * 1024 * 1024, pages: 10, versions: 20, report: 512 * 1024, json: 8 * 1024 * 1024, image: 8 * 1024 * 1024 } as const;
export const resumePdfPolicy = "resume-pdf-v1";
export type ResumeCommand = { commandId: string; expectedRevision: number };
export type ResumeNoteCommand = ResumeCommand & { action: "save_note"; id: string; note: string };
export const resumeReviewKeys = ["allPages", "metadataAndLinks", "privacyAndOrganizations", "hiddenContentAndSource"] as const;
export type ResumeReview = Record<typeof resumeReviewKeys[number], true>;
export type ResumePublishCommand = ResumeCommand & { action: "publish"; id: string; sha256: string; checklist: ResumeReview };
export type ResumeWithdrawCommand = ResumeCommand & { action: "unpublish" };
export type ResumeJsonCommand = ResumeNoteCommand | ResumePublishCommand | ResumeWithdrawCommand;
export type ResumeInspection = { policy: string; pages: number; text: string; metadata: string; links: string[]; tools: { qpdf: string; poppler: string } };
export type ResumeVersion = { id: string; sha256: string; byteSize: number; pageCount: number; note: string; createdAt: string };
export type ResumeState = { revision: number; publicVersionId: string | null; versions: ResumeVersion[] };
export type ResumeDetail = ResumeVersion & { inspection: ResumeInspection };
export type ResumeReceipt = { commandId: string; action: "upload" | ResumeJsonCommand["action"]; targetId: string; revision: number; publicVersionId: string | null };

export function resumePublicationEpoch(environment: Readonly<Record<string, string | undefined>>): string | null {
  try { const epoch = environment.HLOG_RESUME_PDF_PUBLICATION_EPOCH; assertResumeId(epoch); return epoch; }
  catch { return null; }
}

export function assertResumeId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)) throw new Error("invalid_request");
}
export function parseResumeMetadata(value: { commandId?: unknown; expectedRevision?: unknown }): ResumeCommand {
  assertResumeId(value.commandId);
  if (!Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0 || (value.expectedRevision as number) >= 2147483647) throw new Error("invalid_request");
  return { commandId: value.commandId, expectedRevision: value.expectedRevision as number };
}
export function parseResumeCommand(value: unknown): ResumeJsonCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request");
  const input = value as Record<string, unknown>;
  const extra = input.action === "save_note" ? ["id", "note"] : input.action === "publish" ? ["id", "sha256", "checklist"] : [];
  if (Object.keys(input).some(key => !["action", "commandId", "expectedRevision", ...extra].includes(key))) throw new Error("invalid_request");
  const command = parseResumeMetadata(input);
  if (input.action === "unpublish") return { action: "unpublish", ...command };
  assertResumeId(input.id);
  if (input.action === "publish") {
    if (typeof input.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(input.sha256) || !input.checklist || typeof input.checklist !== "object" || Array.isArray(input.checklist)) throw new Error("invalid_request");
    const checks = input.checklist as Record<string, unknown>;
    if (Object.keys(checks).length !== 4 || resumeReviewKeys.some(key => checks[key] !== true)) throw new Error("invalid_request");
    return { action: "publish", ...command, id: input.id, sha256: input.sha256,
      checklist: Object.fromEntries(resumeReviewKeys.map(key => [key, true])) as ResumeReview };
  }
  if (input.action !== "save_note" || typeof input.note !== "string" || input.note.length > 2000 || input.note.includes("\0")) throw new Error("invalid_request");
  return { action: "save_note", ...command, id: input.id, note: input.note };
}
