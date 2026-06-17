---
name: git-safe-commit
description: "Safe Git commit and push workflow for Codex. Use when preparing, resolving conflicts for, creating, or pushing commits: always pull before committing, preserve incoming remote code during conflicts, resolve generated-artifact conflicts by taking the latest incoming artifact, inspect git diff before finalizing, write Conventional Commit messages, and push the completed commit unless local-only work is requested."
---

# Git Safe Commit

Use this skill when the user asks to commit, push, prepare a commit, resolve pull conflicts before committing, or write a commit message.

## Core Rules

- Always inspect the current repository root and branch before changing Git state.
- Always run `git pull --no-rebase` before creating the commit. Prefer merge-based pull so `ours` is local work and `theirs` is incoming remote work during conflicts.
- Stage only files directly related to the user-requested change.
- Never discard incoming remote code to make a conflict disappear.
- Never run destructive commands such as `git reset --hard`, `git checkout -- .`, or broad clean/delete commands unless the user explicitly asks.
- If the worktree contains unrelated user changes, preserve them and keep them out of the commit.
- After a successful commit, push the current branch to its upstream unless the user explicitly asks for a local-only commit.

## Commit Workflow

1. Confirm repository state.

   ```bash
   git status --short
   git branch --show-current
   git remote -v
   ```

2. If there are unstaged local changes, identify which files are intended for this commit. Do not stage unrelated files.

3. Pull before committing.

   ```bash
   git pull --no-rebase
   ```

   If Git refuses because local changes would be overwritten, pause and protect the local changes first. Use a targeted stash only when needed:

   ```bash
   git stash push -u -m "pre-pull: <short reason>" -- <paths>
   git pull --no-rebase
   git stash pop
   ```

   After `stash pop`, resolve any conflicts using the conflict rules below.

4. Resolve conflicts, if any.

   ```bash
   git status --short
   git diff --name-only --diff-filter=U
   ```

5. Inspect the final diff before staging.

   ```bash
   git diff
   git diff --check
   ```

6. Run the closest validation command available for the changed scope, such as lint, tests, typecheck, or build. If validation cannot be run, report why.

7. Stage intended files only.

   ```bash
   git add -- <paths>
   git diff --cached
   ```

8. Commit with a Conventional Commit message.

   ```bash
   git commit -m "type(scope): concise subject"
   ```

9. Push the committed branch unless local-only was requested.

   ```bash
   git push
   ```

   If the branch has no upstream, set it explicitly:

   ```bash
   git push -u origin <branch>
   ```

   If push is rejected because the remote moved, run `git pull --no-rebase`, resolve conflicts with the rules below, validate again, commit any merge resolution if needed, and push again.

## Conflict Rules

During `git pull --no-rebase` conflict resolution:

- Treat incoming remote code as the baseline that must remain represented in the final file.
- For logic conflicts, read both sides and merge intentionally. Preserve remote behavior first, then reapply the local intended change if it is still valid.
- Do not resolve by keeping only the local side unless the user explicitly approves and the remote change is clearly obsolete.
- After resolving each file, run `git diff` and verify that the result contains the intended local change plus the incoming remote change.

For generated artifacts or derived outputs:

- Prefer the latest incoming artifact from the pull.
- In merge conflicts, use `git checkout --theirs -- <path>` for generated artifacts when the source-of-truth file is not the artifact itself.
- If the project has a generation command, rerun it after taking the incoming artifact so outputs match source files.
- Examples of likely artifacts: generated clients, lockfiles, build outputs, compiled assets, generated schema snapshots. Confirm from project conventions before treating a file as generated.

For package lockfiles:

- If only dependency metadata conflicts and `package.json`/manifest is clear, prefer incoming lockfile, then run the package manager install command if appropriate.
- If both sides changed dependencies, merge the manifest first and regenerate the lockfile with the repo's package manager.

## Diff Review Checklist

Before committing, verify:

- `git status --short` has no unresolved conflict markers or unmerged files.
- `git diff --check` passes.
- `git diff --cached` contains only requested changes.
- No unrelated formatting churn, generated noise, or user changes are staged.
- Conflict markers such as `<<<<<<<`, `=======`, and `>>>>>>>` are absent.
- Validation command output is known and reported.
- After commit, `git push` succeeds or the exact push blocker is reported.

## Commit Message Convention

Use Conventional Commits:

- `feat`: new user-facing feature or capability
- `fix`: bug fix
- `docs`: documentation-only change
- `style`: formatting-only change with no behavior change
- `refactor`: code restructuring with no behavior change
- `perf`: performance improvement
- `test`: tests only
- `chore`: maintenance, tooling, dependency, or housekeeping
- `build`: build system or package changes
- `ci`: CI/CD workflow changes
- `revert`: revert a previous commit

Format:

```text
type(scope): subject
```

Rules:

- Keep the subject concise and imperative.
- Use a scope when it helps, for example `feat(home): ...`, `fix(theme): ...`, `docs(agents): ...`.
- Use Korean or English consistently with the repo's recent commit style.
- Add a body only when the change needs rationale, migration notes, or conflict-resolution context.
