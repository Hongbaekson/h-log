---
name: tdd
description: "Use when implementing or changing production behavior, bug fixes, refactors, or Harness steps that touch code. Enforces test-first RED -> GREEN -> REFACTOR."
---

# Test-Driven Development

## Core Rule

```text
No production behavior change without a failing test first.
```

For H-Log, production behavior includes:

- route rendering behavior
- content loaders
- filtering/search utilities
- metadata/sitemap/feed generation
- API route behavior
- future DB/worker state transitions
- privacy or publication gate logic

## Cycle

1. RED
   - Write one minimal test for the desired behavior.
   - Run the focused test.
   - Confirm it fails for the expected reason.
2. GREEN
   - Write the smallest implementation that passes the test.
   - Run the focused test again.
3. REFACTOR
   - Clean only the code touched by this behavior.
   - Keep the focused test green.
4. BROADER CHECK
   - Run the closest broader command needed for the change.

## H-Log Commands

From `apps/h-log`:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Prefer a focused test first when possible.

## Exceptions

Ask or clearly state the exception before skipping TDD.

- Documentation-only changes
- Generated files
- Configuration-only changes
- Throwaway exploration that will be discarded before implementation

Even exceptions need a verification command such as `git diff --check`, `npm run build`, or a manual file/path check.

## Good Test Rules

- One behavior per test.
- Test real code, not only mocks.
- Name the behavior clearly.
- If the test passes immediately, it did not prove the missing behavior. Fix the test or write a characterization test.
- If the test fails because of a typo/setup issue, fix the setup and rerun until the failure proves the behavior gap.

## Bug Fix Rule

Reproduce the bug with a failing test first. The fix is not complete until that test passes and the nearby suite is green.

## Refactor Rule

If behavior should not change, add or confirm characterization tests before refactoring. Refactor only while tests stay green.

## Stop Signals

- Code was written before the test.
- The test was added after the implementation.
- The test never failed.
- The failure reason was not checked.
- The implementation expanded beyond the tested behavior.

If any stop signal happens, restart the behavior with a proper RED step.
