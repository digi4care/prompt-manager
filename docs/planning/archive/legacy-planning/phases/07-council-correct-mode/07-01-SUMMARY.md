---
phase: 07-council-correct-mode
plan: 01
subsystem: api
tags: [council, streaming, sse, workflow, orchestration]

requires:
  - phase: 06-streaming-execution
    provides: streamPromptExecution() for real-time AI output streaming

provides:
  - councilRuns table for council workflow state persistence
  - council-correct.service.ts orchestrator for producer→reviewer→fixer workflow
  - SSE streaming endpoint at POST /api/council/correct

affects:
  - 07-02 (council correct UI)
  - future phases using council patterns

tech-stack:
  added: []
  patterns:
    - AsyncGenerator streaming pattern from streaming.service.ts
    - Settings cascade resolution per step (executor/judge/improve)
    - SSE via sveltekit-sse produce()
    - JSON parsing for reviewer output with fallback

key-files:
  created:
    - src/lib/server/services/council-correct.service.ts
    - src/routes/api/council/correct/+server.ts
  modified:
    - src/lib/server/db/schema.ts

key-decisions:
  - 'Steps stored as JSON text in councilRuns table for simplicity (not separate stepResults table)'
  - "Producer uses 'executor' function type, Reviewer uses 'judge', Fixer uses 'improve'"
  - 'Max rounds hardcoded to 3 to prevent infinite loops'
  - 'Reviewer output parsed as JSON with fallback regex for non-deterministic LLM output'

patterns-established:
  - 'Council step to function type mapping: producer→executor, reviewer→judge, fixer→improve'
  - 'State machine: idle → producing → reviewing → fixing → [producing | complete | error]'
  - 'Event emission pattern: step_start, step_delta, step_complete, round_complete, council_complete'

duration: 9min
completed: 2026-02-27
---

# Phase 7 Plan 01: Council Correct Orchestrator Summary

**Council correct workflow with producer→reviewer→fixer orchestration, database persistence, and SSE streaming**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-27T15:37:04Z
- **Completed:** 2026-02-27T15:46:22Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- CouncilRuns table for workflow state persistence with step history as JSON
- council-correct.service.ts orchestrator with AsyncGenerator streaming pattern
- SSE endpoint for real-time council execution events

## Task Commits

Each task was committed atomically:

1. **Task 1: Add councilRuns table to schema** - `39db164` (feat)
2. **Task 2: Create council-correct.service.ts orchestrator** - `ac3780b` (feat)
3. **Task 3: Create SSE streaming API endpoint** - `522367f` (feat)

## Files Created/Modified

- `src/lib/server/db/schema.ts` - Added councilRuns table with state/round tracking, relations, and types
- `src/lib/server/services/council-correct.service.ts` - Orchestrator with executeCouncilCorrect generator, step builders, reviewer parser
- `src/routes/api/council/correct/+server.ts` - SSE endpoint with validation, authentication, heartbeat

## Decisions Made

1. **Steps as JSON text** - Embedded CouncilStepResult array in councilRuns.steps column rather than separate stepResults table for simplicity
2. **Function type mapping** - Each council step uses appropriate function defaults: producer→executor, reviewer→judge, fixer→improve
3. **Max 3 rounds** - Hardcoded to prevent infinite loops while allowing iterative refinement
4. **JSON reviewer output** - Structured prompt with JSON response format, parsed with fallback regex for LLM variability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without blocking issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Council correct backend complete: schema, service, API endpoint
- Ready for 07-02: Council correct UI components
- Can test API endpoint via curl or SSE client

---

_Phase: 07-council-correct-mode_
_Completed: 2026-02-27_

## Self-Check: PASSED

All files verified on disk. All commits present in git history.
