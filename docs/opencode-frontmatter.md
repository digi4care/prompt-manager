# OpenCode Frontmatter (Prompt Versions)

This project uses OpenCode as the only AI runtime. Prompt runtime configuration is expressed via frontmatter.

## Goals

- Store AI runtime config per prompt version (model/temperature/etc.)
- Keep model IDs as opaque strings (no hardcoded provider logic in UI)
- Keep provider API keys out of the web app (keys live only in the OpenCode server/container)

## Storage Decision

Frontmatter is stored per prompt version:

- Table: `prompt_versions`
- Column: `frontmatter_yaml` (TEXT, nullable)

Rationale:

- Frontmatter belongs to the version (not the prompt), because changing model/temp is a versioned change.
- YAML is the authoring format; storing the raw YAML preserves intent and is easy to diff/version.

We can optionally add `frontmatter_json` later if we need indexing or fast filtering.

## Supported Keys (Initial)

The UI and parser will support (initially):

- `model`: string (opaque model id)
- `temperature`: number
- `max_tokens`: number

Unknown keys are allowed but ignored by the application layer unless explicitly supported later.

## Merge Rules (Defaults + Overrides)

1. Start from Settings defaults (default model, default temperature)
2. Apply version frontmatter overrides (if provided)
3. Enforce allowlist:
   - if `model` is set in frontmatter, it must be present in Settings `allowed_models`

If an override is invalid, the UI should show validation errors and block saving.

## Example

```yaml
---
model: openai/gpt-4o-mini
temperature: 0.7
max_tokens: 2048
---
```
