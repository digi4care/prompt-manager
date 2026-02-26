---
id: context-paths
name: Context File Path Resolution
---

# Context File Path Resolution

## Resolution Order

This repository is configured as **local-only** context.

1. **Local context** (`.opencode/context/` in project root)
2. **Global context disabled** (`"global": false` in `.opencode/context/core/config/paths.json`)

This mirrors OpenCode's own config merging behavior (see [OpenCode Config Docs](https://opencode.ai/docs/config/)).

## What Goes Where

| Content Type                                            | Recommended Location                            | Why                                                  |
| ------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| **Project Intelligence** (tech stack, patterns, naming) | Local `.opencode/context/project-intelligence/` | Project-specific, committed to git, shared with team |
| **Core Standards** (code-quality, docs, tests)          | Local `.opencode/context/core/`                 | Repo-scoped standards, deterministic behavior        |

## How Resolution Works (Local-Only)

- Files are loaded from local `.opencode/context/` only.
- Global fallback is disabled for this repo.
- Project context is fully repo-scoped and committed with the codebase.

## Path Configuration

```json
{
	"paths": {
		"local": ".opencode/context",
		"global": false
	}
}
```

This repository uses `"global": false` to enforce local-only context loading.

## Environment Variable Override

The installer supports `OPENCODE_INSTALL_DIR` to override the install location:

```bash
export OPENCODE_INSTALL_DIR=~/custom/path
bash install.sh developer
```

OpenCode itself supports `OPENCODE_CONFIG_DIR` for a custom config directory (see [OpenCode docs](https://opencode.ai/docs/config/)). For this repository, keep context resolution local-only.

## Migrating Global to Local

If global context was used previously, run `/context migrate` once to copy needed project-intelligence files into local `.opencode/context/`, then continue local-only.

## Common Scenario

### Everything Local (Development / Repo Maintainer)

- OAC command overrides live in `.opencode/command/`
- All context lives in `.opencode/context/`
- Context is committed to git and shared with the team
