# Context Localization Bundle

This folder is a flattened export of the repo-local context logic.
All files are intentionally at one level (no nested directories).

## Files in this bundle

- `command-add-context.md`
- `command-context.md`
- `command-build-context-system.md`
- `command-validate-repo.md`
- `command-analyze-patterns.md`
- `command-check-context-deps.md`
- `context-paths-config.json`
- `context-paths-policy.md`
- `project-technical-domain.md`

## Restore mapping (copy into another repo)

- `command-add-context.md` -> `.opencode/command/add-context.md`
- `command-context.md` -> `.opencode/command/context.md`
- `command-build-context-system.md` -> `.opencode/command/build-context-system.md`
- `command-validate-repo.md` -> `.opencode/command/validate-repo.md`
- `command-analyze-patterns.md` -> `.opencode/command/analyze-patterns.md`
- `command-check-context-deps.md` -> `.opencode/command/openagents/check-context-deps.md`
- `context-paths-config.json` -> `.opencode/context/core/config/paths.json`
- `context-paths-policy.md` -> `.opencode/context/core/system/context-paths.md`
- `project-technical-domain.md` -> `.opencode/context/project-intelligence/technical-domain.md`

## Important

- This bundle is local-first (repo scoped).
- The included context path config expects local-only behavior (`"global": false`).
