---
name: harness
description: "Use for H-Log phase planning/execution, PRD/ADR/ARCHITECTURE-based development, apps/h-log/phases/* step files, or when the user mentions harness."
---

# Harness Workflow

This repository uses a Harness-style workflow for H-Log work. The goal is to turn a broad request into small, independently verifiable steps.

## Required Reading

Before proposing or executing a step, read the relevant project documents.

For H-Log app work:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`

For automated blog platform work, also read:

- `plans/automated-blog-publishing-plan.md`

## TDD Binding

If a Harness step adds, changes, refactors, or fixes production behavior, also read `.codex/skills/tdd/SKILL.md` and follow RED -> expected failure -> GREEN -> REFACTOR.

Exceptions:

- Documentation-only changes
- Generated output
- Configuration-only changes
- Mechanical dependency sync

Even for exceptions, run the closest verification command.

## Step Design Rules

1. Keep the scope small.
2. Make each step independently executable in a fresh Codex session.
3. List every file that must be read before editing.
4. Specify interfaces and constraints, not unnecessary implementation detail.
5. Use executable acceptance criteria such as `npm run test` or `npm run build`.
6. Write concrete warnings in the form "Do not X. Reason: Y."
7. Use kebab-case step names.

## Phase Files

Use this structure for H-Log phases:

```text
apps/h-log/phases/
├── index.json
└── {task-name}/
    ├── index.json
    ├── step0.md
    ├── step1.md
    └── ...
```

Top-level index:

```json
{
  "phases": [
    {
      "dir": "blog-content-mvp",
      "status": "pending"
    }
  ]
}
```

Task index:

```json
{
  "project": "h-log",
  "phase": "blog-content-mvp",
  "steps": [
    { "step": 0, "name": "content-model", "status": "pending" }
  ]
}
```

Allowed status values:

- `pending`
- `completed`
- `error`
- `blocked`

When completing a step, add a concise `summary`. When failing, add `error_message`. When blocked, add `blocked_reason`.

## Step Template

````markdown
# Step {N}: {name}

## 읽을 파일

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md` (production code step only)
- {related existing files}

## 작업

{Concrete task instructions}

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. Run the closest focused command first.
2. If production code changed, prove the TDD RED and GREEN steps.
3. Confirm architecture and privacy guardrails.
4. Update the phase index status and summary.

## 하지 말 것

- Do not change production behavior without a failing test first. Reason: Harness steps must be verifiable.
- Do not expose private data, internal URLs, tokens, or private repo names. Reason: H-Log is public.
````

## Stop Rules

- PRD/ADR/ARCHITECTURE are missing or still templates.
- Documents and code conflict and the latest source of truth is unclear.
- A production behavior change cannot be tested first.
- A step risks exposing private content.
- Automated blog work may expose non-`published` content publicly.
- The user requested one small unit but the step requires unrelated refactors.

## Terminal States

- `done`: acceptance criteria passed; record `completed` and a concise `summary`.
- `clean-no-op`: current files already satisfy the request; record the evidence and leave files unchanged.
- `blocked`: user input, private data confirmation, external credentials, or environment access is required; record `blocked_reason`.
- `approval-required`: deployment, public publishing, external messaging, destructive changes, or DB platform transition needs explicit approval.
- `error`: the step failed within scope; record the command and `error_message`.
- `no-progress`: repeated attempts do not change the result; stop with the latest evidence instead of looping indefinitely.
