import { articleClaimTypes, blogPostStatuses, type ArticleClaimType, type BlogPostStatus } from "./blog-content-model.ts";

export type EditorialClaim = { text: string; type: ArticleClaimType; sourceId: string; evidencePath: string; evidenceQuote: string };
export type EditorialDraft = { title: string; description: string; contentMarkdown: string; claims: EditorialClaim[]; evidencePaths: string[] };
export type EditorialCommand = {
  action: "save" | "publish" | "retract"; commandId: string; postId: string; expectedRevision: number;
  expectedStatus: BlogPostStatus; expectedCurrentVersionId: string | null; versionId: string; reason: string;
  draft?: EditorialDraft; contentHash?: string; confirmed?: boolean;
};
export type EditorialReceipt = { postId: string; versionId: string; versionNo: number; commandRevision: number; status: BlogPostStatus };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request");
  return value as Record<string, unknown>;
};
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim()) || /\u0000/.test(value)) throw new Error("invalid_request");
  return value;
}
export function parseEditorialDraft(value: unknown): EditorialDraft {
  const draft = object(value);
  if (Object.keys(draft).some(k=>!["title", "description", "contentMarkdown", "claims", "evidencePaths"].includes(k))
    || !Array.isArray(draft.claims) || draft.claims.length > 30 || !Array.isArray(draft.evidencePaths) || draft.evidencePaths.length > 20) throw new Error("invalid_request");
  const contentMarkdown = text(draft.contentMarkdown, 131072);
  if (new TextEncoder().encode(contentMarkdown).length > 131072) throw new Error("request_too_large");
  return { title: text(draft.title, 200).trim(), description: text(draft.description, 1000).trim(), contentMarkdown,
    evidencePaths: draft.evidencePaths.map(p=>text(p, 300).trim()),
    claims: draft.claims.map(value=>{
      const c = object(value);
      if (Object.keys(c).some(k=>!["text", "type", "sourceId", "evidencePath", "evidenceQuote"].includes(k)) || !articleClaimTypes.includes(c.type as ArticleClaimType)) throw new Error("invalid_request");
      return { text: text(c.text, 2000).trim(), type: c.type as ArticleClaimType, sourceId: text(c.sourceId, 200, true), evidencePath: text(c.evidencePath, 300, true), evidenceQuote: text(c.evidenceQuote, 240, true) };
    }) };
}
export function parseEditorialCommand(value: unknown): EditorialCommand {
  const c = object(value), action = c.action;
  const fields = ["action", "commandId", "postId", "expectedRevision", "expectedStatus", "expectedCurrentVersionId", "versionId", "reason",
    ...(action === "save" ? ["draft"] : action === "publish" ? ["contentHash", "confirmed"] : [])];
  if (!["save", "publish", "retract"].includes(action as string) || Object.keys(c).some(k=>!fields.includes(k))
    || typeof c.commandId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.commandId)
    || !Number.isSafeInteger(c.expectedRevision) || (c.expectedRevision as number) < 0 || (c.expectedRevision as number) >= 2147483647
    || !blogPostStatuses.includes(c.expectedStatus as BlogPostStatus)) throw new Error("invalid_request");
  const result: EditorialCommand = { action: action as EditorialCommand["action"], commandId: c.commandId.toLowerCase(), postId: text(c.postId,200), expectedRevision: c.expectedRevision as number,
    expectedStatus: c.expectedStatus as BlogPostStatus, expectedCurrentVersionId: c.expectedCurrentVersionId === null ? null : text(c.expectedCurrentVersionId,200), versionId: text(c.versionId,200), reason: text(c.reason,400).trim() };
  if (action === "save") result.draft = parseEditorialDraft(c.draft);
  if (action === "publish") {
    if (c.confirmed !== true) throw new Error("review_required");
    if (typeof c.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(c.contentHash)) throw new Error("invalid_request");
    result.confirmed = true; result.contentHash = c.contentHash;
  }
  return result;
}
