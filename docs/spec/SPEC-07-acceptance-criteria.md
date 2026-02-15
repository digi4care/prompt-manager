# SPEC-07 Acceptance Criteria

## AC-001 Settings Roundtrip

Given admin opens Settings
When admin updates executor default model and saves
Then value persists and appears after reload.

## AC-002 Model Policy Enforcement

Given policy mode is restricted
When user selects disallowed model
Then API rejects with `MODEL_RESOLUTION_FAILED`.

## AC-003 Prompt Execution Success

Given valid prompt and valid model
When user runs test
Then response and metrics are shown and execution log is stored.

## AC-004 Prompt Execution Failure

Given OpenCode server is unreachable
When user runs test
Then user sees actionable error and no app crash occurs.

## AC-005 Snippet Preview

Given prompt includes `{{CONTEXT}}` and `{{TASK}}`
When user enters values
Then preview renders resolved text immediately.

## AC-006 Strict Snippet Validation

Given strict mode enabled
When unresolved placeholder exists
Then execution is blocked with `SNIPPET_VALUE_MISSING`.

## AC-007 Override Precedence

Given function default, prompt override, and run override are set
When execution starts
Then run override is used if allowed.

## AC-008 Fallback Behavior

Given run override is invalid and prompt override is valid
When execution starts
Then prompt override is used and UI indicates fallback.

## AC-009 Council Correct Mode

Given valid council correct config
When user runs correct mode
Then system executes producer/reviewer/fix steps and stores step logs.

## AC-010 Accessibility Baseline

Given keyboard-only usage
When navigating settings and test runner
Then all primary actions are reachable and usable.

## AC-011 Settings Type Validation

Given admin submits wrong type for a settings key
When backend validates payload
Then request fails with `SETTINGS_VALUE_INVALID` and no data is changed.

## AC-012 Retryable Error Metadata

Given execution fails with transient upstream issue
When API returns error
Then payload includes `retryable=true` and UI shows retry action.
