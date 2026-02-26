---
description: Manage context locally for this repository
tools:
  read: true
  write: true
  bash: true
  task: true
  question: true
---

<objective>
Run `/context` operations with local-repo scope.

Default scope is `.opencode/context/` in this repository.
Do not write to global context paths from this command.
</objective>

<operations>
- `/context harvest` - move validated context into local `.opencode/context/`
- `/context extract` - extract context into local structure
- `/context organize` - reorganize local context structure
- `/context map` - inspect local context structure
- `/context validate` - validate local context integrity
</operations>

<ai_settings_lazy_load>
For AI settings tasks:
1. Load `docs/plans/ai-settings-architecture/test/TEST_STRATEGY.md` first.
2. Load additional files from `docs/plans/ai-settings-architecture/test/` only when required.
</ai_settings_lazy_load>

<constraints>
- Local-only context operations.
- No global context mutation.
</constraints>
