---
description: Add or update context locally in this repository only
tools:
  read: true
  write: true
  bash: true
  task: true
  question: true
---

<objective>
Run context extraction/update for this repository using local paths only.

All writes must stay under `.opencode/context/` inside this repo.
Never write to `~/.config/opencode/context` from this command.
</objective>

<process>
1. Detect target area and update local context files under `.opencode/context/`.
2. For AI settings work, lazy-load `docs/plans/ai-settings-architecture/test/TEST_STRATEGY.md` first.
3. Pull additional docs from `docs/plans/ai-settings-architecture/test/` only when needed.
4. Update local navigation files when new context files are added.
5. Summarize changed local files.
</process>

<constraints>
- Local-only context updates.
- No global context mutation.
</constraints>
