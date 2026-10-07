import { brainBasisLabels, brainKindLabels, brainRelationLabels, brainTopics, type BrainBasis, type BrainKind, type BrainNode, type BrainRelation, type BrainTopic } from "./brain.ts";
import { scanBlogPrivacyText, type BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";

export type BrainLink = { target: string; relation: BrainRelation; reason: string };
export type BrainSnapshot = BrainNode & { links?: BrainLink[] };
export type BrainDraft = {
  title: string; originalText: string; publicTitle: string; publicSummary: string; publicBody: string;
  kind: BrainKind; topic: BrainTopic; basis: BrainBasis; tags: string[];
  occurredOn?: string; shareOccurredOn?: boolean; links?: BrainLink[];
};

export function parseBrainDraft(input: unknown): BrainDraft {
  const invalid = () => { throw new Error("invalid_draft"); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid();
  const value = input as Record<string, unknown>;
  const fields = ["title", "originalText", "publicTitle", "publicSummary", "publicBody", "kind", "topic", "basis", "tags"];
  const optional = ["occurredOn", "shareOccurredOn", "links"];
  if (fields.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !fields.includes(key) && !optional.includes(key))) return invalid();
  if (value.occurredOn !== undefined && (typeof value.occurredOn !== "string" || (value.occurredOn !== "" &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value.occurredOn) || !Number.isFinite(Date.parse(value.occurredOn)) || new Date(value.occurredOn).toISOString().slice(0, 10) !== value.occurredOn)))) return invalid();
  if (value.shareOccurredOn !== undefined && typeof value.shareOccurredOn !== "boolean") return invalid();
  if (value.links !== undefined) {
    if (!Array.isArray(value.links) || value.links.length > 12) return invalid();
    const targets = new Set<string>();
    for (const link of value.links) {
      if (!link || typeof link !== "object" || Object.keys(link).length !== 3
        || typeof link.target !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(link.target) || link.target.length > 100
        || typeof link.relation !== "string" || !Object.hasOwn(brainRelationLabels, link.relation)
        || typeof link.reason !== "string" || !link.reason.trim() || link.reason.length > 300 || link.reason.includes("\0")
        || targets.has(link.target)) return invalid();
      targets.add(link.target);
    }
  }
  for (const [key, limit] of [["title", 160], ["originalText", 50000], ["publicTitle", 160], ["publicSummary", 300], ["publicBody", 30000]] as const) {
    const text = value[key];
    if (typeof text !== "string" || text.length > limit || text.includes("\0")) return invalid();
  }
  if (!(value.title as string).trim() || !(value.originalText as string).trim()
    || typeof value.kind !== "string" || !Object.hasOwn(brainKindLabels, value.kind)
    || typeof value.topic !== "string" || !Object.hasOwn(brainTopics, value.topic)
    || typeof value.basis !== "string" || !Object.hasOwn(brainBasisLabels, value.basis)
    || !Array.isArray(value.tags) || value.tags.length > 12
    || value.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 40 || tag.includes("\0"))) return invalid();
  return structuredClone(value) as BrainDraft;
}

export function toPublicBrainNode(draft: BrainDraft, id: string, recordedAt: string, policy: BlogPrivacyScanPolicy = {}): BrainSnapshot {
  if (![draft.publicTitle, draft.publicSummary, draft.publicBody].every(text => text.trim())) throw new Error("public_copy_required");
  if (draft.links?.some(link => link.target === id)) throw new Error("invalid_link");
  const node: BrainSnapshot = {
    id, recordedAt, title: draft.publicTitle, summary: draft.publicSummary,
    kind: draft.kind, topic: draft.topic, basis: draft.basis, tags: [...draft.tags],
    sections: [{ heading: "기록", paragraphs: draft.publicBody.split(/\n\s*\n/).filter(text => text.trim()) }],
    questions: [], sources: [{ label: "작성자가 직접 정리한 공개 메모" }],
    ...(draft.shareOccurredOn && draft.occurredOn ? { occurredOn: draft.occurredOn } : {}),
    ...(draft.links?.length ? { links: draft.links.map(link => ({ ...link })) } : {}),
  };
  assertSafeBrainPublication(node, policy);
  return node;
}

export function assertSafeBrainPublication(node: BrainNode, policy: BlogPrivacyScanPolicy = {}) {
  const text = JSON.stringify(node);
  if (scanBlogPrivacyText(text, policy).status !== "passed" || /[A-Za-z]:\\|file:\/\/|\/(?:Users|home|private)\//.test(text)) {
    throw new Error("public_copy_blocked");
  }
}

export type BrainNoteSummary = { id: string; title: string; revision: number; publishedRevision: number | null; createdAt: string; occurredOn?: string; tags: string[]; topic: BrainTopic; links?: BrainLink[] };
export type BrainRevision = { revision: number; draft: BrainDraft; createdAt: string };
export type BrainOwnerNote = BrainNoteSummary & { draft: BrainDraft; history: BrainRevision[] };
