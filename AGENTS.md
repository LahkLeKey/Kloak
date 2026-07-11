## Agent skills

### Issue tracker

GitHub Issues is the repo’s issue tracker, and external PRs are also triaged as request items. See `docs/agents/issue-tracker.md`.

### Pull requests

Use `gh` for PR work as well as issues. Read PRs with `gh pr view <number> --comments`, inspect diffs with `gh pr diff <number>`, comment with `gh pr comment <number> --body "..."`, and update PR metadata with `gh pr edit`. If a Copilot review comment or review thread needs to be patched, use `gh api` against the PR review/comment endpoint rather than editing it by hand in the UI.

### Triage labels

Uses the default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.