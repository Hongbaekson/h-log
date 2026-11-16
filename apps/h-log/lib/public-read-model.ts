import { createHash } from "node:crypto";
import { assertPostVersionContentHashMatches, selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import { getPublicBlogIndex, getPublicBlogPostBySlug, type BlogContentStore, type PublicBlogPost } from "./blog-public.ts";
import { normalizeBlogTags } from "./blog-tags.ts";
import { scanBlogPrivacyText, type BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";
import { mergePublishedBrain } from "./brain-curation.ts";
import { brainCatalog } from "./brain-catalog.ts";
import { projectPostConnections } from "./portfolio-posts.ts";
import type { BrainSnapshot } from "./brain-capture.ts";

export const PUBLIC_READ_LIMITS = { input: 1024 * 1024, payload: 2 * 1024 * 1024, batchBytes: 8 * 1024 * 1024, batchSize: 25, maxBatchSize: 100 };
export function canonicalJson(value: unknown): string {
  function canonical(item: unknown): unknown {
    if (item === undefined) return null;
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).sort(([a], [b]) => {
      const left = [...a], right = [...b];
      for (let index = 0; index < Math.min(left.length, right.length); index++) {
        const difference = left[index].codePointAt(0)! - right[index].codePointAt(0)!;
        if (difference) return difference;
      }
      return left.length - right.length;
    }).map(([key, child]) => [key, canonical(child)]));
    return item;
  }
  return JSON.stringify(canonical(value));
}
export function fingerprint(value: unknown): string {
  return createHash("sha256").update("h-log/public-read-input/v1\0").update(canonicalJson(value)).digest("hex");
}
export function projectionContext(policy: BlogPrivacyScanPolicy = {}, versions: Record<string, number> = {}) {
  const manifest = { schema: 1, renderer: 1, headings: 1, tags: 1, search: 1, sourceUrls: 1, privacy: 1, brainParser: 1, series: 1,
    ...versions, staticHash: fingerprint({ brainCatalog, projectPostConnections }) };
  const terms = [...(policy.restrictedTerms ?? [])];
  if (terms.some(term => !["organization_name", "private_repository"].includes(term.category) || typeof term.value !== "string" || !term.value.trim())) throw new Error("invalid_policy");
  terms.sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b), "en"));
  return { policy: structuredClone(policy), manifest, manifestHash: fingerprint(manifest), policyFingerprint: fingerprint({ privacy: manifest.privacy, brainParser: manifest.brainParser, terms }) };
}
export type ProjectionContext = ReturnType<typeof projectionContext>;
type BlogPayload = { list: ReturnType<typeof getPublicBlogIndex>["posts"][number]; detail: Omit<PublicBlogPost, "markdown" | "contentHtml">; search: { text: string; tags: string[] } };
type BrainPayload = { node: ReturnType<typeof mergePublishedBrain>["nodes"][number]; links: NonNullable<BrainSnapshot["links"]>; search: string };
export type Projection<T = BlogPayload | BrainPayload> = {
  sourceVersion: string | null; inputFingerprint: string; contentHash: string | null;
  result: "ready" | "excluded"; payload: T | null; payloadHash: string;
};
function checkedInput(input: unknown, context: ProjectionContext) {
  if (Buffer.byteLength(canonicalJson(input)) > PUBLIC_READ_LIMITS.input) throw new Error("input_limit");
  return fingerprint({ input, manifest: context.manifest, policyFingerprint: context.policyFingerprint });
}
function output<T>(inputFingerprint: string, sourceVersion: string | null, contentHash: string | null, payload: T | null): Projection<T> {
  if (Buffer.byteLength(canonicalJson(payload)) > PUBLIC_READ_LIMITS.payload) throw new Error("payload_limit");
  return { inputFingerprint, sourceVersion, contentHash, result: payload === null ? "excluded" : "ready", payload, payloadHash: fingerprint(payload) };
}
const normalizeSearch = (text: string) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");

// One source at a time. The repository supplies only its selected version and ordered relations.
export function projectBlog(store: BlogContentStore, context: ProjectionContext, rawInput: unknown = store): Projection<BlogPayload> {
  const post = store.posts[0], inputFingerprint = checkedInput({ kind: "blog", id: post?.id ?? null, source: rawInput }, context);
  const version = store.versions.find(version => version.id === post?.currentVersionId && version.postId === post.id);
  const excluded = () => output<BlogPayload>(inputFingerprint, post?.currentVersionId ?? null, version?.contentHash ?? null, null);
  if (!selectPublicBlogRouteEntries(store.posts, store.versions, context.policy).length) return excluded();
  assertPostVersionContentHashMatches(version!);
  if (scanBlogPrivacyText(JSON.stringify({ assets: store.assets ?? [], post, sources: store.sources, tags: store.tags, version }), context.policy).status !== "passed") return excluded();
  const full = getPublicBlogPostBySlug(post.slug, store)!;
  const { markdown, contentHtml, ...detail } = full;
  void contentHtml;
  const tags = store.tags.map(tag => tag.tag);
  return output(inputFingerprint, version!.id, version!.contentHash, {
    list: getPublicBlogIndex(store).posts[0], detail,
    search: { text: normalizeSearch([post.title, post.description, version!.title, version!.description, markdown, tags.join(" ")].join(" ")), tags: normalizeBlogTags(tags).map(normalizeSearch) },
  });
}
export function projectBrain(snapshot: BrainSnapshot | null, revision: number | null, context: ProjectionContext, sourceId = snapshot?.id ?? null): Projection<BrainPayload> {
  const inputFingerprint = checkedInput({ kind: "brain", id: sourceId, snapshot, revision }, context);
  const node = snapshot && revision !== null ? mergePublishedBrain({ nodes: [], edges: [] }, [snapshot], context.policy).nodes[0] : undefined;
  return output(inputFingerprint, revision === null ? null : String(revision), snapshot ? fingerprint(snapshot) : null, node ? {
    node, links: snapshot!.links ?? [],
    search: [node.title, node.summary, ...node.tags, ...node.questions, ...node.sections.flatMap(section => [section.heading, ...section.paragraphs])].join(" ").normalize("NFKC").toLowerCase(),
  } : null);
}
