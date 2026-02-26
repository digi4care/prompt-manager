# Test Workflow Command-Agent-Skill Bundle

Portable standalone bundle with everything related to the test-workflow logic.

This README is standalone and path-agnostic.

## What this bundle contains

- `.opencode/command/test-workflow.md`
- `.opencode/agents/test-workflow-orchestrator.md`
- `.opencode/skills/test-workflow-generator/` (blueprint, skill, router, validator, templates, schemas)
- `docs/spec/SPEC-15-docs-testing-execution-blueprint.md`
- `docs/spec/SPEC-INDEX.md`
- `docs/plans/ai-settings-architecture/test/` (project test strategy/matrices)
- `AGENTS.md` (repo testing pattern references)

## Prerequisites

- You are in the root of a target project repository.
- `bash` is available.
- OpenCode is installed if you want to run slash commands.

## Install into another project (path-agnostic)

Run these commands from the target project root.

```bash
BUNDLE_DIR="/absolute/path/to/test-workflow-command-agent-skill-bundle"
cp -r "$BUNDLE_DIR/." .
```

Notes:

- `BUNDLE_DIR` can be any location on any VPS.
- This copies the complete test-workflow package (command, agent, skill, docs).

## Normal usage flow

1. Plan-only run:

```text
/test-workflow --mode auto --out docs/testing --plan-only
```

2. Review plan artifacts (`ANALYSIS_*`, `IMPLEMENTATION_PLAN.md`, `TODO.md`).

3. Apply run:

```text
/test-workflow --mode auto --out docs/testing --apply
```

## Fallback if slash command is unavailable

Start a new chat and paste:

```text
Lees eerst:
- .opencode/skills/test-workflow-generator/TEST-WORKFLOW_BLUEPRINT.md
- .opencode/skills/test-workflow-generator/SKILL.md
- .opencode/agents/test-workflow-orchestrator.md
- .opencode/command/test-workflow.md

Volg de Mandatory Phase Order en gates exact.
Voer eerst plan-only fases uit (P0..P10), genereer docs/testing artifacts,
wacht op "approve apply", voer daarna P11..P12 uit.
```

## Operational policy

- Supports `greenfield`, `brownfield`, and `hybrid`.
- Brownfield default: `assimilate + upgrade`.
- Use replacement only when faster or lower risk.
- Keep outputs under `docs/testing/` for reproducible onboarding.
