# OpenCode Migration (Anthropic -> OpenCode)

## Decision: Provider Keys Not Managed By Web App (Choice 1)

This project will NOT store or manage LLM provider API keys (Anthropic/OpenAI/etc.) inside the SvelteKit application.

Instead:

- Provider keys/config live ONLY in the OpenCode server/container (env vars / config files / mounted volumes).
- The SvelteKit app talks to OpenCode over HTTP using the OpenCode SDK.

### What The Web App Manages

- OpenCode server URL (e.g. `http://opencode:4096` in Docker, `http://localhost:4096` in dev)
- Connection status (health check)
- Governance/policy:
  - allowed model IDs (opaque strings)
  - default model ID
  - default temperature
- Per prompt-version overrides via frontmatter (model, temperature, max tokens, etc.)

### What The Web App Does NOT Manage

- Provider API keys
- Provider connection/authentication
- Provider enable/disable toggles that require secrets

## Key Principles

- Model IDs are treated as opaque strings. The UI must not hardcode provider prefixes.
- Frontmatter is the primary way to configure model/runtime parameters on a per-version basis.
- Settings provide defaults + an allowlist; frontmatter can override within that allowlist.

## Frontmatter Storage

- `prompt_versions.frontmatter_yaml` stores the raw YAML frontmatter per version.

## Testing Protocol (TDD)

All migration work follows `/.opencode/context/development/guide/tdd-workflow.md`:

- Write tests first (expect fail)
- Implement minimal code (make tests pass)
- Run full regression via Docker utility:
  - `./scripts/run-tests-docker.sh bun run test`
  - UI changes require `./scripts/run-tests-docker.sh bun run test:e2e:all`
