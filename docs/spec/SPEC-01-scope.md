# SPEC-01 Scope

## SCP-001 In Scope (P1)

- Settings-first PoC for OpenCode integration.
- Function defaults for `executor`, `judge`, `improve`, `council`.
- Prompt execution endpoint and UI test runner.
- Snippet variable replacement (`{{VAR}}`) and preview panel.
- Execution logging.

## SCP-002 In Scope (P2)

- Council mode `correct` (producer -> reviewer -> fix).
- Streaming execution (SSE).
- Snippet library CRUD.

## SCP-003 In Scope (P3)

- Council `debate` and `consensus` modes.
- JavaScript snippet type with sandbox.

## SCP-004 Out Of Scope (Current Cycle)

- Cost optimization engine across providers.
- Full enterprise RBAC redesign.
- Background queue workers and distributed execution.

## SCP-005 Delivery Phases

- PH-001: Settings refactor.
- PH-002: Prompt execute PoC.
- PH-003: Snippets + preview.
- PH-004: Streaming + logs UX.
- PH-005: Council modes.

## SCP-006 Priority Rules

- P1 blockers pause lower-priority work.
- No P2 feature ships before P1 acceptance criteria pass.

## SCP-007 Resolution Source Of Truth

- Canonical resolution rules live in `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).
- Other specs must reference policy IDs and must not redefine precedence logic.
- Any policy change requires updating `SPEC-06` first, then dependent specs.
