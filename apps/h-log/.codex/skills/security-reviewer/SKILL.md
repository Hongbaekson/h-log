---
name: security-reviewer
description: "Security review workflow for Codex in the H-Log Next.js app. Use when reviewing authentication, authorization, secrets, privacy exposure, dependency risk, route handlers, DB-backed blog publishing, generated HTML/Markdown rendering, deployment config, or any security-sensitive change before merge."
---

# Security Reviewer

Use this skill to review H-Log security risk before or after a change. Default to a code-review stance: findings first, ordered by severity, with file and line references.

## Scope

Focus on:

- Authentication and authorization boundaries.
- IDOR, privilege escalation, missing ownership checks, and admin-only operations.
- Secrets, credentials, tokens, cookies, environment variables, and log exposure.
- XSS, unsafe Markdown/HTML rendering, command injection, path traversal, SSRF, and SQL injection.
- Dependency and build/deploy configuration risk.
- Personal portfolio privacy guardrails from `AGENTS.md` and `.codex/rules/content-seo-privacy.md`.
- H-Log DB-backed blog publishing boundaries: `posts`, `post_versions`, generated Markdown/HTML, publish jobs, preview/save/publish flows, and future PostgreSQL/pgvector usage.

## Repository Context

Start by reading only what is needed:

- `AGENTS.md` for H-Log product, privacy, and validation rules.
- `package.json` for scripts and dependencies.
- `.codex/rules/content-seo-privacy.md` when public content, resume data, SEO, or privacy exposure is relevant.
- `.codex/docs/harness/ARCHITECTURE.md` or phase docs only when the review touches DB-backed publishing or deployment boundaries.

## Discovery Commands

Run commands from `apps/h-log` unless the user gives another root.

```bash
rg --files app components lib deploy .codex -g "*.ts" -g "*.tsx" -g "*.mjs" -g "*.js" -g "*.json" -g "*.yaml" -g "*.yml" -g "*.md"
```

Search for high-risk patterns while excluding generated and dependency folders:

```bash
rg -n --hidden --glob "!node_modules/**" --glob "!.next/**" --glob "!tsconfig.tsbuildinfo" "process\.env|NEXT_PUBLIC_|secret|token|password|api[_-]?key|private|cookie|jwt|auth|session|csrf|dangerouslySetInnerHTML|innerHTML|eval\(|new Function|child_process|exec\(|spawn\(|fetch\(|headers\(|cookies\(|NextResponse|redirect\(" .
```

Run dependency and baseline validation when practical:

```bash
npm audit --audit-level=moderate
npm run lint
npm run typecheck
```

Optional tools, only when installed locally:

```bash
gitleaks detect --source . --no-git -v
semgrep scan --config p/owasp-top-ten --config p/secrets --timeout=60 .
```

If an optional tool is missing, continue with `rg`, code reading, and package audit. Do not block the review on optional SAST tooling.

## Review Process

1. Identify changed files and security-relevant surfaces.
2. Run lightweight discovery searches before deep reading.
3. For each candidate, trace data flow from source to sink:
   - Source: route params, query strings, request body, headers, cookies, env vars, uploaded/imported content, external URLs, Markdown/HTML content.
   - Sink: database query, file path, rendered HTML, redirects, fetch targets, shell/process calls, logs, cookies, auth checks, publish output.
4. Prefer proving exploitability or non-exploitability from code. Do not report a pattern match as a vulnerability without a plausible path.
5. Map real findings to OWASP categories when useful, but keep the output tied to H-Log code.
6. If no issue is found, say so clearly and list residual risk or checks that could not be run.

## H-Log Specific Checks

- Public content must not expose phone number, birth date, private URLs, server IP, API keys, private repository names, or customer-confidential data.
- `NEXT_PUBLIC_*` variables are browser-exposed; treat them as public.
- Blog generated HTML/Markdown must avoid unsafe raw HTML rendering unless sanitized.
- Future admin preview/save/publish routes must enforce authentication, authorization, CSRF/session protections as applicable, and ownership/role checks.
- File compatibility loaders must prevent path traversal and avoid reading outside intended content roots.
- External URL fetching for publishing, scraping, images, or metadata must guard against SSRF and internal network access.
- SQL must use parameterized queries or safe query builders once PostgreSQL integration exists.
- Docker, Compose, Nginx, and CI/CD docs/config must not commit host IPs, private keys, tokens, or production secrets.
- Security-sensitive logs must avoid tokens, cookies, credentials, full request bodies, and personal data.

## Severity

- `P0 Critical`: likely data leak, credential exposure, remote code execution, auth bypass, destructive public action.
- `P1 High`: plausible privilege escalation, IDOR, stored XSS, SQL/command injection, production secret risk.
- `P2 Medium`: information disclosure, weak security config, missing rate limiting on sensitive operations, incomplete validation.
- `P3 Low`: hardening, defense-in-depth, or maintainability issue with limited immediate exploitability.

## Output Format

Return findings first:

```markdown
## Findings

### P1 High - Stored XSS in generated blog HTML
- File: app/blog/[slug]/page.tsx:42
- Evidence: `dangerouslySetInnerHTML` renders unsanitized generated content.
- Attack scenario: an imported post source can include `<script>` or event handlers that run for visitors.
- Fix: sanitize generated HTML before persistence or render a safe Markdown AST allowlist.
- Verification: add a test with script/event-handler payload and confirm it is stripped or escaped.

## Open Questions
- Confirm whether admin publish routes are intended to be public, session-gated, or behind deployment-only access.

## Checks Run
- `npm audit --audit-level=moderate`
- `npm run lint`
```

If there are no findings:

```markdown
## Findings
No security findings in the reviewed scope.

## Residual Risk
- Optional SAST tooling was not available.
- Runtime auth behavior was not exercised.

## Checks Run
- `rg ...`
- `npm audit --audit-level=moderate`
```
