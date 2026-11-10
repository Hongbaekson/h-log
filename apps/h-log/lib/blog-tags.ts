// Keep this list explicit: punctuation and case can distinguish unknown concepts.
const aliases = new Map([
  ["next.js", "Next.js"],
  ["nextjs", "Next.js"],
  ["postgresql", "PostgreSQL"],
  ["postgres", "PostgreSQL"],
]);

export function normalizeBlogTag(tag: string): string {
  const trimmed = tag.trim();
  return aliases.get(trimmed.toLowerCase()) ?? trimmed;
}

export function normalizeBlogTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map(normalizeBlogTag).filter(Boolean))];
}
