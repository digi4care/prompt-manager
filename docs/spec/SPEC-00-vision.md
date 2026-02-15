# SPEC-00 Vision

## VSN-001 Product Goal

Build a prompt-management platform where teams can create, version, test, evaluate, and improve prompts using OpenCode SDK as execution engine.

## VSN-002 PoC Goal

Deliver a working website flow where a user configures AI defaults in Settings, opens a prompt, fills variables/snippets, runs execution, and sees result + metrics.

## VSN-003 Primary User Outcomes

- Users can set provider/model defaults per function (executor, judge, improve, council).
- Users can override model per prompt and per run.
- Users can test prompts safely and repeatedly.

## VSN-004 Non-Goals For PoC

- No production-grade billing dashboard.
- No multi-tenant org permissions redesign.
- No full workflow automation engine.

## VSN-005 Measurable Success Criteria

- SC-001: Settings save/load roundtrip works for all function defaults.
- SC-002: Prompt execution from UI returns response within 30s in normal conditions.
- SC-003: Snippet replacement works for at least 5 placeholders in one prompt.
- SC-004: Execution log is persisted with model, duration, token counts.
- SC-005: Error states are visible and actionable (connection/model/validation).

## VSN-006 Key Constraints

- Use Bun tooling and scripts only.
- Keep existing DB data compatible; additive migrations only.
- Reuse existing project conventions and component patterns.
