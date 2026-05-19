# SPEC-05 UI UX Flows

## UX-001 Information Architecture

Settings page tabs:

1. Connection
2. Models
3. Functions
4. Council
5. Presets
6. Advanced

## UX-002 Settings Save Flow

1. User edits values.
2. Dirty state indicator appears.
3. User saves section.
4. API validates and persists.
5. Toast success with saved timestamp.

## UX-003 Prompt Test Flow

1. User opens prompt editor.
2. User fills snippet values.
3. Preview updates.
4. User clicks Run Test.
5. Result panel shows output + metrics.

## UX-004 UI States (Required)

- `loading`: spinner + disabled inputs.
- `empty`: explicit no-data messages.
- `success`: result and metadata visible.
- `error`: inline message + retry action.

## UX-005 Override Behavior Display

- Show active model source badge: `default | prompt override | run override`.
- Show fallback badge when fallback used.

## UX-006 Error UX

- Connection failure -> show `Check OpenCode URL` CTA.
- Model resolution failure -> show `Choose allowed model` CTA.
- Snippet validation failure -> focus first unresolved placeholder.

## UX-007 Accessibility Rules

- Form controls have labels.
- Errors announced in aria-live region.
- Keyboard flow works for all primary actions.
