# SPEC-09 Delivery Plan

## DLV-001 Implementation Order

1. Settings refactor
2. Execution PoC
3. Snippets + preview
4. Streaming + UX polish
5. Council modes

## DLV-001A Delivery Gates

- Gate A (Settings-First): complete settings schema, validation, and policy enforcement before execution UI changes.
- Gate B (PoC Integration): complete execute flow end-to-end with logging and fallback visibility.

## DLV-002 Atomic Steps (P1)

- STEP-001: Add new settings keys for function defaults.
- STEP-002: Extend settings UI tabs and forms.
- STEP-003: Implement model resolution utility.
- STEP-004: Add execute API endpoint.
- STEP-005: Add execution log persistence.
- STEP-006: Add test runner UI.
- STEP-007: Add snippet render service.
- STEP-008: Add preview panel in editor.

## DLV-003 Dependencies

- STEP-004 depends on STEP-003.
- STEP-006 depends on STEP-004 and STEP-005.
- STEP-008 depends on STEP-007.

## DLV-004 Definition Of Done Per Step

- Code implemented with tests.
- Error paths covered.
- Docs updated for changed behavior.
- No regression in existing prompt CRUD.

## DLV-005 Phase Exit Criteria

- P1 exits only when AC-001..AC-008 pass.
- P2 starts after P1 green + review approval.

## DLV-005A Expanded Exit Criteria

- P1 also requires AC-011, AC-012, and contract tests from `TST-008`.
- No unresolved `high` severity errors in error-catalog mapping (`SPEC-11-error-catalog.md`).
- Settings schema and API validation must match `SPEC-10-settings-schema.md`.

## DLV-006 PoC Demo Script

1. Configure function defaults in Settings.
2. Open prompt with placeholders.
3. Fill variables and inspect preview.
4. Run execution and show metrics/log.
5. Force one invalid model and show fallback/error behavior.
