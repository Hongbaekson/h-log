import type { BrainDraft } from "./brain-capture.ts";
import { brainTopics, type BrainTopic } from "./brain.ts";

type Candidate = { id: string; title: string; tags: string[]; topic: BrainTopic };
export type BrainSuggestions = { links: { id: string; title: string; duplicate: boolean; reasons: string[] }[]; tags: string[] };
const normalize = (text: string) => text.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
export function suggestBrainLinks(draft: BrainDraft, candidates: Candidate[], currentId?: string): BrainSuggestions {
  const titles = [draft.title, draft.publicTitle].map(normalize).filter(Boolean);
  const tags = new Set(draft.tags.map(normalize));
  if (!titles.length && !tags.size) return { links: [], tags: [] };
  const words = new Set(titles.flatMap(title => title.match(/[\p{L}\p{N}]{2,}/gu) ?? []));
  const excluded = new Set([currentId, ...(draft.links ?? []).map(link => link.target)]);
  // ponytail: rank the owner's in-memory summaries; move to a paged query if the journal outgrows this screen.
  const ranked = candidates.filter(node => !excluded.has(node.id)).map(node => {
    const title = normalize(node.title);
    const duplicate = titles.includes(title);
    const commonTags = node.tags.filter(tag => tags.has(normalize(tag)));
    const commonWords = [...new Set((title.match(/[\p{L}\p{N}]{2,}/gu) ?? []).filter(word => words.has(word)))];
    const sameTopic = draft.topic === node.topic;
    return { node, duplicate, score: Number(duplicate) * 100 + commonTags.length * 4 + commonWords.length * 2 + Number(sameTopic),
      reasons: [...(duplicate ? ["제목이 같아 중복 여부를 확인해 볼 만합니다."] : []),
        ...(commonTags.length ? [`겹치는 태그: ${commonTags.join(", ")}`] : []),
        ...(commonWords.length ? [`제목의 공통 단어: ${commonWords.join(", ")}`] : []),
        ...(sameTopic ? [`같은 주제: ${brainTopics[node.topic].label}`] : [])],
    };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id)).slice(0, 5);
  const suggestedTags = new Map<string, string>();
  for (const { node } of ranked) for (const tag of node.tags) {
    const key = normalize(tag);
    if (!tags.has(key) && !suggestedTags.has(key)) suggestedTags.set(key, tag);
  }
  return { links: ranked.map(({ node, duplicate, reasons }) => ({ id: node.id, title: node.title, duplicate, reasons })), tags: [...suggestedTags.values()].slice(0, 8) };
}
