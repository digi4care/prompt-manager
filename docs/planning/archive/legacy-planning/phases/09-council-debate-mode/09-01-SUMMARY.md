---
phase: 09-council-debate-mode
plan: 01
subsystem: council
tags: [debate, multi-agent, streaming, sse, synthesis, parallel-execution]

# Dependency graph
requires:
  - phase: 07-council-correct
    provides: councilRuns table, council-review.service.ts pattern, streaming.service.ts pattern
provides:
  - Debate orchestrator with 3-round parallel agent execution
  - SSE streaming endpoint for debate execution
  - Structured synthesis output with consensus analysis
affects: [council-ui, debate-visualization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Async generator pattern for parallel agent execution
    - Round-robin event processing for simultaneous streams
    - JSON parsing with fallback for LLM synthesis output
    - SSE streaming with sveltekit-sse produce()

key-files:
  created:
    - src/lib/server/services/council-debate.service.ts
    - src/routes/api/council/debate/+server.ts
  modified: []

key-decisions:
  - 'Reuse councilRuns table for debate persistence (no new table needed)'
  - '3 rounds always executed (no early termination per user decision)'
  - "Synthesis uses 'judge' function type for model configuration"
  - '3 locked archetype prompts: proponent, skeptic, pragmatist'
  - 'Cumulative context building across rounds'

patterns-established:
  - 'Pattern: Round-robin generator processing for parallel agent execution'
  - 'Pattern: buildDebateContextForRound() for cumulative context'
  - 'Pattern: parseSynthesisJson() with fallback for LLM JSON output'

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 9 Plan 01: Council Debate Backend Summary

**Multi-perspective debate orchestrator with 3-round parallel agent execution, cumulative context building, and structured synthesis output**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T19:34:41Z
- **Completed:** 2026-02-28T19:42:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created council-debate.service.ts with full debate orchestration (938 lines)
- Implemented 3 archetype agents (proponent, skeptic, pragmatist) with locked prompts
- Built parallel agent execution using round-robin generator pattern
- Added cumulative context building across 3 rounds of debate
- Implemented structured synthesis with JSON parsing and fallback
- Created SSE streaming API endpoint following existing council patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create council-debate.service.ts orchestrator** - `f22fb1d` (feat)
2. **Task 2: Create SSE streaming API endpoint** - `91964e7` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/lib/server/services/council-debate.service.ts` - Debate orchestrator with executeDebate generator, type definitions, helper functions
- `src/routes/api/council/debate/+server.ts` - POST endpoint with SSE streaming, Zod validation, authentication

## Decisions Made

- **Reuse councilRuns table**: Debate runs stored in existing councilRuns table with rounds serialized to JSON in steps column
- **Always 3 rounds**: No early termination - always complete 3 rounds per user decision
- **Judge function type**: Synthesizer uses 'judge' function defaults for model configuration
- **Locked archetype prompts**: 3 fixed perspectives (proponent, skeptic, pragmatist) with predefined prompts
- **Cumulative context**: Each round includes all previous arguments for context-aware responses

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed existing patterns from council-review.service.ts and council-correct.service.ts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Debate backend infrastructure complete
- Ready for 09-02: Debate UI component with SSE client integration
- SSE endpoint streams all debate events for real-time visualization

## Self-Check: PASSED

All files created and commits verified:

- council-debate.service.ts: FOUND
- +server.ts: FOUND
- Commits f22fb1d, 91964e7: FOUND
