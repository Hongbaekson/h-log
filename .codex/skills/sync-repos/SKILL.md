---
name: sync-repos
description: "Use for H-Log work that must keep plans, harness docs, app code, phases, deployment docs, and generated outputs synchronized."
---

# H-Log Sync Workflow

The original dogfood `sync-repos` skill coordinated proto/schema/backend repositories. In this repository, use this skill to keep H-Log plans, harness docs, app code, phase files, and deployment documents aligned.

## When To Use

- A change affects both `plans/` and `apps/h-log/`.
- A Harness phase changes PRD/ADR/ARCHITECTURE assumptions.
- Blog automation work changes DB, worker, SEO, or public route behavior.
- Deployment changes affect Docker, Nginx, OCI, or CI/CD docs.
- Generated or derived outputs must match source files.

## Sync Order

1. Identify the source of truth.
   - Product direction: `apps/h-log/.codex/docs/harness/PRD.md`
   - Decisions: `apps/h-log/.codex/docs/harness/ADR.md`
   - Runtime shape: `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
   - Step execution: `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
   - Long-form automated blog plan: `plans/automated-blog-publishing-plan.md`
2. Check the app-specific rules in `apps/h-log/AGENTS.md`.
3. Inspect the actual code before changing docs that claim implementation status.
4. Update the smallest set of documents needed to keep decisions consistent.
5. If code changed, run the closest verification from `apps/h-log`.
6. If phase files changed, update `apps/h-log/phases/{task}/index.json`.

## Checks

- [ ] PRD describes the product behavior being implemented.
- [ ] ADR explains any new technical decision.
- [ ] ARCHITECTURE reflects actual files and runtime boundaries.
- [ ] IMPLEMENTATION_PLAN or phase step points to the next action.
- [ ] `plans/automated-blog-publishing-plan.md` and harness docs do not contradict each other.
- [ ] Visitor chatbot remains out of scope.
- [ ] Public privacy rules are preserved.
- [ ] Verification command was run or the blocker was reported.

## Do Not

- Do not claim a feature is implemented from a plan alone. Inspect code first.
- Do not move MVP from file-based content to DB automation without an explicit phase decision.
- Do not update generated or derived files by hand when a generation command exists.
- Do not synchronize by broad formatting unrelated files.
