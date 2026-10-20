import { scanBlogPrivacyText, type BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";

export type BlogEditorialNote = {
  verification: {
    method: "source_review" | "local_test" | "production_observation";
    checkedOn: string;
    scope: string;
    limitations: string;
  } | null;
  revisions: { revisedOn: string; summary: string }[];
};

export function parseBlogEditorialNote(
  value: unknown,
  privacyScanPolicy?: BlogPrivacyScanPolicy,
): BlogEditorialNote | undefined {
  if (!hasKeys(value, ["verification", "revisions"]) ||
      !Array.isArray(value.revisions) || value.revisions.length > 20) return undefined;

  const verification = value.verification;
  if (verification !== null && (
    !hasKeys(verification, ["method", "checkedOn", "scope", "limitations"]) ||
    typeof verification.method !== "string" ||
    !["source_review", "local_test", "production_observation"].includes(verification.method) ||
    !isDate(verification.checkedOn) || !isPublicText(verification.scope) ||
    !isPublicText(verification.limitations)
  )) return undefined;

  if (!value.revisions.every((revision) =>
    hasKeys(revision, ["revisedOn", "summary"]) &&
    isDate(revision.revisedOn) && isPublicText(revision.summary),
  )) return undefined;
  if (verification === null && value.revisions.length === 0) return undefined;
  if (scanBlogPrivacyText(JSON.stringify(value), privacyScanPolicy).status !== "passed") return undefined;

  const note = value as BlogEditorialNote;
  return {
    verification: note.verification ? { ...note.verification } : null,
    revisions: note.revisions.map((revision) => ({ ...revision }))
      .sort((a, b) => b.revisedOn.localeCompare(a.revisedOn)),
  };
}

function hasKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function isPublicText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2000 &&
    !/(?:[a-z]:[\\/]|\\\\|\bfile:|(?:^|[\s("'`])\/?(?:private|\.codex|\.\.)(?:[\\/])|(?:^|[\s("'`])\/[\w.-]+\/)/i.test(value);
}
