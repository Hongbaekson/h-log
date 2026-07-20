export const blogPrivacyFindingTypes = [
  "api_credential",
  "internal_network",
  "personal_contact",
  "organization_name",
  "private_repository",
] as const;

export type BlogPrivacyFindingType =
  (typeof blogPrivacyFindingTypes)[number];

export type BlogPrivacyRestrictedTerm = {
  category: Extract<
    BlogPrivacyFindingType,
    "organization_name" | "private_repository"
  >;
  value: string;
};

export type BlogPrivacyScanPolicy = {
  restrictedTerms?: readonly BlogPrivacyRestrictedTerm[];
};

export type BlogPrivacyScanResult = {
  auditMessage: string;
  findingTypes: BlogPrivacyFindingType[];
  redactedText: string;
  status: "blocked" | "passed";
};

type PrivacyEnvironment = Readonly<Record<string, string | undefined>>;

type RedactionRule = {
  findingType: BlogPrivacyFindingType;
  pattern: RegExp;
  replacement: string;
};

const REDACTED = "[REDACTED]";

const REDACTION_RULES: readonly RedactionRule[] = [
  {
    findingType: "api_credential",
    pattern:
      /\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\s*["']?\s*[:=]\s*)["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
    replacement: `$1${REDACTED}`,
  },
  {
    findingType: "api_credential",
    pattern:
      /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{20,}|(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,})\b/g,
    replacement: REDACTED,
  },
  {
    findingType: "api_credential",
    pattern: /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,
    replacement: REDACTED,
  },
  {
    findingType: "internal_network",
    pattern:
      /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|(?:[a-z0-9-]+\.)+(?:internal|local|corp|lan))(?::\d{1,5})?(?:\/[^\s]*)?/gi,
    replacement: REDACTED,
  },
  {
    findingType: "internal_network",
    pattern:
      /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g,
    replacement: REDACTED,
  },
  {
    findingType: "internal_network",
    pattern:
      /\b((?:server[_ -]?ip|서버\s*IP)\s*[:=]?\s*)(?:\d{1,3}\.){3}\d{1,3}\b/gi,
    replacement: `$1${REDACTED}`,
  },
  {
    findingType: "personal_contact",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: REDACTED,
  },
  {
    findingType: "personal_contact",
    pattern: /(?:\+82[- ]?|0)(?:10|2|[3-6][1-5]|70)[- ]?\d{3,4}[- ]?\d{4}\b/g,
    replacement: REDACTED,
  },
  {
    findingType: "organization_name",
    pattern:
      /\b((?:company|customer|client)\s*[:=]\s*)[^\r\n,;]{2,80}/gi,
    replacement: `$1${REDACTED}`,
  },
  {
    findingType: "organization_name",
    pattern: /((?:회사명|고객사명|고객사)\s*[:=]\s*)[^\r\n,;]{2,80}/g,
    replacement: `$1${REDACTED}`,
  },
  {
    findingType: "private_repository",
    pattern:
      /\b((?:private\s+(?:repo|repository))\s*[:=]\s*)[^\s,;]+/gi,
    replacement: `$1${REDACTED}`,
  },
  {
    findingType: "private_repository",
    pattern: /((?:비공개\s*저장소(?:명)?)\s*[:=]\s*)[^\s,;]+/g,
    replacement: `$1${REDACTED}`,
  },
];

export function scanBlogPrivacyText(
  text: string,
  policy: BlogPrivacyScanPolicy = {},
): BlogPrivacyScanResult {
  let redactedText = text;
  const findings = new Set<BlogPrivacyFindingType>();

  for (const rule of REDACTION_RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);

    if (pattern.test(redactedText)) {
      findings.add(rule.findingType);
      pattern.lastIndex = 0;
      redactedText = redactedText.replace(pattern, rule.replacement);
    }
  }

  for (const term of normalizeRestrictedTerms(policy.restrictedTerms ?? [])) {
    const pattern = new RegExp(escapeRegularExpression(term.value), "gi");

    redactedText = redactedText.replace(pattern, () => {
      findings.add(term.category);
      return REDACTED;
    });
  }

  const findingTypes = blogPrivacyFindingTypes.filter((type) =>
    findings.has(type),
  );

  return {
    auditMessage:
      findingTypes.length === 0
        ? "privacy scan passed"
        : `privacy scan blocked: ${findingTypes
            .map((type) => `${type}=${REDACTED}`)
            .join(", ")}`,
    findingTypes,
    redactedText,
    status: findingTypes.length === 0 ? "passed" : "blocked",
  };
}

export function createBlogPrivacyScanPolicyFromEnvironment(
  environment: PrivacyEnvironment,
): BlogPrivacyScanPolicy {
  return {
    restrictedTerms: [
      ...parseRestrictedTerms(
        environment.HLOG_PRIVACY_ORGANIZATION_NAMES,
        "HLOG_PRIVACY_ORGANIZATION_NAMES",
        "organization_name",
      ),
      ...parseRestrictedTerms(
        environment.HLOG_PRIVACY_PRIVATE_REPOSITORIES,
        "HLOG_PRIVACY_PRIVATE_REPOSITORIES",
        "private_repository",
      ),
    ],
  };
}

function parseRestrictedTerms(
  value: string | undefined,
  name:
    | "HLOG_PRIVACY_ORGANIZATION_NAMES"
    | "HLOG_PRIVACY_PRIVATE_REPOSITORIES",
  category: BlogPrivacyRestrictedTerm["category"],
): BlogPrivacyRestrictedTerm[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== "string" || !item.trim())
    ) {
      throw new Error("invalid privacy term list");
    }

    return parsed.map((item) => ({ category, value: item.trim() }));
  } catch {
    throw new Error(`${name} must be a JSON string array`);
  }
}

function normalizeRestrictedTerms(
  terms: readonly BlogPrivacyRestrictedTerm[],
): BlogPrivacyRestrictedTerm[] {
  const normalized: BlogPrivacyRestrictedTerm[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const value = term.value.trim();
    const key = `${term.category}:${value.toLocaleLowerCase("en")}`;

    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ category: term.category, value });
  }

  return normalized;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
