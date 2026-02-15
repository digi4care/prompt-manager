# SPEC Index

## IDX-001 Purpose

Provide a single entrypoint for spec-driven execution with canonical ownership of rules, IDs, and cross-references.

## IDX-002 Spec Catalog

| File | Core Domain | Primary IDs |
|---|---|---|
| `SPEC-00-vision.md` | Product intent and outcomes | `VSN-*`, `SC-*` |
| `SPEC-01-scope.md` | Scope, priorities, phases | `SCP-*`, `PH-*` |
| `SPEC-02-architecture.md` | System modules and flows | `ARC-*`, `MOD-*` |
| `SPEC-03-data-model.md` | DB entities and migration rules | `DB-*` |
| `SPEC-04-api-contracts.md` | API contracts and payloads | `API-*` |
| `SPEC-05-ui-ux-flows.md` | UI states and interaction flows | `UX-*` |
| `SPEC-06-rules-and-policies.md` | Canonical policy source | `POL-*` |
| `SPEC-07-acceptance-criteria.md` | Functional acceptance criteria | `AC-*` |
| `SPEC-08-test-strategy.md` | Test layering and coverage mapping | `TST-*` |
| `SPEC-09-delivery-plan.md` | Implementation sequencing and gates | `DLV-*`, `STEP-*` |
| `SPEC-10-settings-schema.md` | Settings key registry and validation | `SET-*` |
| `SPEC-11-error-catalog.md` | Error taxonomy and retry behavior | `ERR-*` |
| `SPEC-12-templating-grammar.md` | Placeholder grammar and render rules | `TMP-*` |
| `SPEC-13-nfr-and-observability.md` | NFR targets and telemetry requirements | `NFR-*`, `OBS-*` |

## IDX-003 Canonical Source Map

- Model precedence and fallback: `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).
- Settings key/type/default/limits: `SPEC-10-settings-schema.md` (`SET-003`, `SET-004`).
- Error code to HTTP/retry/action mapping: `SPEC-11-error-catalog.md` (`ERR-002`, `ERR-003`, `ERR-004`).
- Template parsing and strictness: `SPEC-12-templating-grammar.md` (`TMP-002`, `TMP-005`).

## IDX-004 Cross-Reference Rules

- Specs that need precedence behavior must reference `POL-*` IDs, not restate logic.
- API and UI error behavior must reference `ERR-*` IDs.
- Settings validation references `SET-*` IDs.
- Delivery exit criteria references `AC-*` and `TST-*` IDs.

## IDX-005 Consistency Check Result

- All referenced spec files found.
- Canonical precedence references aligned to `SPEC-06` in scope, architecture, and API specs.
- Added Gate criteria alignment for `AC-012` in `SPEC-09`.
- No unresolved high-level ID reference conflicts detected in current spec set.

## IDX-006 Execution Order For Framework

1. Read `SPEC-INDEX.md`.
2. Load canonical rules: `SPEC-06`, `SPEC-10`, `SPEC-11`, `SPEC-12`.
3. Load build path: `SPEC-09`.
4. Enforce acceptance and test mapping: `SPEC-07` + `SPEC-08`.
