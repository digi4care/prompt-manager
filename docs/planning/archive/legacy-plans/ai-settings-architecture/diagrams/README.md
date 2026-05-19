# AI Settings Diagrams (draw.io)

This folder contains `.drawio` XML diagrams you can import directly in draw.io.

## Files

- `ai-settings-system-context.drawio`
- `ai-settings-resolution-flow.drawio`
- `ai-settings-db-erd.drawio`

## Import Steps

1. Open draw.io (diagrams.net)
2. File -> Import From -> Device
3. Select one of the `.drawio` files
4. Save as your own working copy

## Notes

- These diagrams are intentionally compact and editable.
- IDs and labels map to the architecture docs in this folder.
- They include the updated variant-aware design:
  - policy-scoped variant selection
  - hard-fail validation for invalid variants
  - DB columns for variant persistence in defaults/council/overrides
