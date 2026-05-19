# Phase 7: Council Correct Mode - Research

**Researched:** 2026-02-27
**Domain:** Iterative AI workflows (Producer → Reviewer → Fixer pattern)
**Confidence:** HIGH

## Summary

This phase implements the "Correct" council mode, an iterative AI workflow pattern where a producer generates initial output, a reviewer evaluates it for issues, and a fixer resolves identified problems. This is also known as the "Generator-Critic" or "Reflection" pattern in AI agent design.

The pattern is well-established in AI agent architecture with proven effectiveness for quality-sensitive outputs. The key insight is **separation of concerns**: each step has a focused role, and the workflow continues until either (a) the reviewer finds no issues, or (b) a round limit is reached (max 3 rounds to prevent infinite loops).

The implementation will reuse existing services (`execution.service.ts`, `streaming.service.ts`, `settings-cascade.service.ts`) with a new orchestrator service that manages sequential step execution with state persistence.

**Primary recommendation:** Create a `council-correct.service.ts` orchestrator that sequences executor → judge → improve steps, persists intermediate state to database, and enforces max 3 rounds. Build UI by extending existing execution patterns.

---

## Standard Stack

### Core

| Library            | Version | Purpose                           | Why Standard                               |
| ------------------ | ------- | --------------------------------- | ------------------------------------------ |
| `@opencode-ai/sdk` | 1.2.1+  | AI execution via session.prompt() | Already integrated, tested pattern         |
| `sveltekit-sse`    | 0.14.3  | SSE streaming for real-time UI    | Proven in Phase 6 streaming implementation |
| `zod`              | ^3.0.0  | Request/response validation       | Existing pattern across all API routes     |

### Supporting (Existing)

| Library       | Version | Purpose                       | When to Use                             |
| ------------- | ------- | ----------------------------- | --------------------------------------- |
| `drizzle-orm` | Latest  | Council run state persistence | Storing step outputs and round tracking |

### Installation

No new packages needed - all dependencies already installed from prior phases.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/server/services/
│   ├── council-correct.service.ts     # NEW: Orchestrator for producer→reviewer→fix workflow
│   ├── execution.service.ts           # EXISTING: Reuse for each step execution
│   ├── streaming.service.ts           # EXISTING: Reuse for streaming each step
│   └── settings-cascade.service.ts    # EXISTING: Reuse for function defaults resolution
├── lib/server/db/
│   └── schema.ts                      # ADD: councilRuns table for state persistence
├── routes/api/council/
│   └── correct/+server.ts             # NEW: Council correct API endpoint
├── routes/api/council/[id]/
│   └── +server.ts                     # NEW: Get council run state
└── lib/components/council/
    └── council-correct-panel.svelte   # NEW: UI with step progression display
```

### Pattern 1: Sequential Step Execution with State Machine

**What:** The council correct workflow follows a deterministic state machine:

```
idle → producing → reviewing → fixing → [producing | complete | error]
```

Each step:

1. Resolves settings via cascade for its function type
2. Executes with streaming (reuse streaming.service.ts patterns)
3. Persists output to database
4. Transitions to next step

**State transitions:**

- `producing` → `reviewing` (always after producer completes)
- `reviewing` → `fixing` (if issues found AND rounds < 3)
- `reviewing` → `complete` (if no issues found)
- `fixing` → `producing` (start next round with fixed content)
- `fixing` → `complete` (if rounds >= 3)
- Any step → `error` (on execution failure)

**Example service structure:**

```typescript
// src/lib/server/services/council-correct.service.ts

export type CouncilStep = 'producer' | 'reviewer' | 'fixer';
export type CouncilState = 'idle' | 'producing' | 'reviewing' | 'fixing' | 'complete' | 'error';

export interface CouncilRun {
	id: number;
	promptId: number;
	inputContent: string;
	currentRound: number;
	maxRounds: number; // Always 3
	state: CouncilState;
	steps: CouncilStepResult[];
	finalOutput?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CouncilStepResult {
	step: CouncilStep;
	round: number;
	functionType: 'executor' | 'judge' | 'improve';
	input: string;
	output: string;
	issues?: string[]; // For reviewer step
	model: ModelInfo;
	usage: TokenUsage;
	duration: Duration;
	executedAt: Date;
}

export async function startCouncilCorrect(options: {
	promptId: number;
	content: string;
}): Promise<CouncilRun> {
	// Create run record
	// Start producer step
}

export async function* streamCouncilCorrect(options: {
	promptId: number;
	content: string;
}): AsyncGenerator<CouncilEvent, CouncilRun, unknown> {
	// Yield step events as they happen
	// Handle round progression
	// Enforce max 3 rounds
}
```

### Pattern 2: Step-to-FunctionType Mapping

**What:** Each council step uses a specific function type from the settings cascade:

| Council Step | Function Type | Settings Source              |
| ------------ | ------------- | ---------------------------- |
| Producer     | `executor`    | `function_defaults.executor` |
| Reviewer     | `judge`       | `function_defaults.judge`    |
| Fixer        | `improve`     | `function_defaults.improve`  |

**Why:** This allows users to configure different models/temperatures for each role:

- Executor: Higher temperature (0.7) for creative generation
- Judge: Lower temperature (0.3) for consistent evaluation
- Improve: Medium temperature (0.7) for targeted fixes

**Example:**

```typescript
// Resolve settings for each step
const producerSettings = await resolveFunctionSettings({
	functionType: 'executor', // Producer uses executor defaults
	promptId
});

const reviewerSettings = await resolveFunctionSettings({
	functionType: 'judge', // Reviewer uses judge defaults
	promptId
});

const fixerSettings = await resolveFunctionSettings({
	functionType: 'improve', // Fixer uses improve defaults
	promptId
});
```

### Pattern 3: Reviewer Output Parsing

**What:** The reviewer step must identify issues in a structured format that the fixer can consume.

**Approach:** Reuse existing judge service patterns. The reviewer output should include:

1. A pass/fail determination
2. A list of specific issues (if any)
3. Recommendations for fixes

**Example prompt construction for reviewer:**

```typescript
const reviewerPrompt = `
You are a reviewer evaluating the following output for quality issues.

Original Input:
${inputContent}

Generated Output:
${producerOutput}

Evaluate the output and respond with:
1. PASS or FAIL
2. If FAIL, list specific issues that need to be fixed
3. Provide recommendations for improvement

Format your response as JSON:
{
  "status": "pass" | "fail",
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
`;
```

### Pattern 4: Round Limit Enforcement

**What:** Prevent infinite loops by enforcing a maximum of 3 rounds.

**Implementation:**

```typescript
const MAX_ROUNDS = 3;

function shouldContinueRound(run: CouncilRun, reviewerResult: ReviewerResult): boolean {
	// Stop if no issues found
	if (reviewerResult.status === 'pass') {
		return false;
	}

	// Stop if max rounds reached
	if (run.currentRound >= MAX_ROUNDS) {
		return false;
	}

	// Continue to fixer and next round
	return true;
}
```

### Anti-Patterns to Avoid

- **Blocking on each step:** Use streaming (AsyncGenerator) so UI updates in real-time
- **Storing state in memory only:** Persist to database for recovery and history
- **Coupling step execution:** Each step should be independently executable
- **Hardcoding model configs:** Use settings cascade for flexibility
- **Infinite loops:** Always enforce max rounds

---

## Don't Hand-Roll

| Problem              | Don't Build               | Use Instead                                                  | Why                                                        |
| -------------------- | ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| AI execution         | Custom fetch to OpenCode  | `executePrompt()` from execution.service.ts                  | Handles session lifecycle, error mapping, settings cascade |
| Streaming            | Custom SSE implementation | `streamPromptExecution()` from streaming.service.ts          | Proven event filtering, heartbeat, cleanup                 |
| Settings resolution  | Manual cascade logic      | `resolveFunctionSettings()` from settings-cascade.service.ts | 3-level cascade already implemented                        |
| State machine        | Complex state management  | Svelte 5 runes ($state, $derived)                            | Reactive by design, already used in execution-panel        |
| Token usage tracking | Manual parsing            | `ExecutionResult.usage` from execute endpoint                | SDK already provides token counts                          |

**Key insight:** 90% of the infrastructure exists. The new code is primarily orchestration logic.

---

## Common Pitfalls

### Pitfall 1: Race Condition Between Steps

**What goes wrong:** Producer output not fully received before reviewer starts processing.

**Why it happens:** Async streaming with multiple consumers.

**How to avoid:** Each step must fully complete (receive `complete` event) before starting next step. Use sequential async/await, not parallel execution.

**Warning signs:** Reviewer receives partial/truncated producer output.

### Pitfall 2: State Loss on Page Refresh

**What goes wrong:** User refreshes page during council run, all progress lost.

**Why it happens:** State only stored in client memory.

**How to avoid:** Persist each step result to database immediately after completion. UI can reconnect to in-progress run via API.

**Warning signs:** Council run data only exists in component state.

### Pitfall 3: Reviewer Parses Unstructured Output

**What goes wrong:** Reviewer output varies in format, fixer can't reliably extract issues.

**Why it happens:** LLM output is non-deterministic.

**How to avoid:** Use structured prompts with JSON output format. Add response parsing with fallback handling. Consider using tool calling if supported.

**Warning signs:** Fixer step fails to apply corrections based on reviewer feedback.

### Pitfall 4: Infinite Loop on Persistent Issues

**What goes wrong:** Council keeps running because reviewer always finds issues.

**Why it happens:** No round limit or limit not enforced.

**How to avoid:** Hard-coded MAX_ROUNDS = 3. Check before starting fixer step. Return best-effort result when limit reached.

**Warning signs:** Council run continues past 3 rounds, usage costs spike.

### Pitfall 5: Session Cleanup Failure

**What goes wrong:** OpenCode sessions not deleted, resource leak.

**Why it happens:** Each step creates a session; cleanup may fail if error occurs mid-workflow.

**How to avoid:** Use try/finally pattern from execution.service.ts. Track session IDs in council run record for recovery cleanup.

**Warning signs:** Accumulating sessions in OpenCode backend.

---

## Code Examples

### Council Orchestrator Service Pattern

```typescript
// src/lib/server/services/council-correct.service.ts
import { executePrompt } from './execution.service';
import { resolveFunctionSettings } from './settings-cascade.service';
import { db } from '../db/client';
import { councilRuns } from '../db/schema';

const MAX_ROUNDS = 3;

export type CouncilEventType =
	| 'step_start'
	| 'step_delta'
	| 'step_complete'
	| 'round_complete'
	| 'council_complete'
	| 'error';

export interface CouncilEvent {
	type: CouncilEventType;
	step: 'producer' | 'reviewer' | 'fixer';
	round: number;
	data: unknown;
}

export async function* executeCouncilCorrect(options: {
	promptId: number;
	content: string;
}): AsyncGenerator<CouncilEvent, CouncilRun, unknown> {
	let currentRound = 1;
	let currentContent = options.content;

	while (currentRound <= MAX_ROUNDS) {
		// Step 1: Producer (uses executor defaults)
		yield {
			type: 'step_start',
			step: 'producer',
			round: currentRound,
			data: { input: currentContent }
		};

		const producerResult = await executePrompt({
			promptId: options.promptId,
			content: currentContent,
			functionType: 'executor'
		});

		yield { type: 'step_complete', step: 'producer', round: currentRound, data: producerResult };

		// Step 2: Reviewer (uses judge defaults)
		yield {
			type: 'step_start',
			step: 'reviewer',
			round: currentRound,
			data: { input: producerResult.content }
		};

		const reviewerResult = await executePrompt({
			promptId: options.promptId,
			content: buildReviewerPrompt(producerResult.content),
			functionType: 'judge'
		});

		const review = parseReviewerOutput(reviewerResult.content);
		yield { type: 'step_complete', step: 'reviewer', round: currentRound, data: review };

		// Check if passed or max rounds reached
		if (review.status === 'pass' || currentRound >= MAX_ROUNDS) {
			yield {
				type: 'council_complete',
				step: 'reviewer',
				round: currentRound,
				data: { finalOutput: producerResult.content }
			};
			return buildFinalRun(producerResult.content);
		}

		// Step 3: Fixer (uses improve defaults)
		yield {
			type: 'step_start',
			step: 'fixer',
			round: currentRound,
			data: { issues: review.issues }
		};

		const fixerResult = await executePrompt({
			promptId: options.promptId,
			content: buildFixerPrompt(producerResult.content, review.issues),
			functionType: 'improve'
		});

		yield { type: 'step_complete', step: 'fixer', round: currentRound, data: fixerResult };

		// Update for next round
		currentContent = fixerResult.content;
		currentRound++;

		yield { type: 'round_complete', step: 'fixer', round: currentRound - 1, data: {} };
	}

	// Should not reach here, but safety fallback
	yield {
		type: 'council_complete',
		step: 'fixer',
		round: MAX_ROUNDS,
		data: { finalOutput: currentContent }
	};
	return buildFinalRun(currentContent);
}
```

### UI State Machine Pattern (Svelte 5)

```svelte
<!-- src/lib/components/council/council-correct-panel.svelte -->
<script lang="ts">
	type CouncilUIState = 'idle' | 'running' | 'complete' | 'error';
	type ActiveStep = 'producer' | 'reviewer' | 'fixer' | null;

	let uiState = $state<CouncilUIState>('idle');
	let activeStep = $state<ActiveStep>(null);
	let currentRound = $state(1);
	let stepResults = $state<StepResult[]>([]);
	let finalOutput = $state<string | null>(null);

	// Derived progress indicator
	let progress = $derived(
		uiState === 'complete'
			? 100
			: uiState === 'idle'
				? 0
				: (((currentRound - 1) * 3 + stepIndex(activeStep)) / 9) * 100
	);

	async function startCouncil() {
		uiState = 'running';
		stepResults = [];
		currentRound = 1;

		// SSE connection to /api/council/correct
		const eventSource = new EventSource(`/api/council/correct?promptId=${promptId}`);

		eventSource.onmessage = (event) => {
			const data = JSON.parse(event.data);

			if (data.type === 'step_start') {
				activeStep = data.step;
			}

			if (data.type === 'step_complete') {
				stepResults = [...stepResults, data];
			}

			if (data.type === 'round_complete') {
				currentRound++;
			}

			if (data.type === 'council_complete') {
				finalOutput = data.data.finalOutput;
				uiState = 'complete';
				activeStep = null;
				eventSource.close();
			}
		};
	}
</script>

<div class="council-panel">
	<div class="progress-bar" style="width: {progress}%"></div>

	{#each stepResults as result, i}
		<div class="step-result" class:active={activeStep === result.step}>
			<span class="badge">Round {result.round}</span>
			<span class="step-name">{result.step}</span>
			<!-- Step output display -->
		</div>
	{/each}

	{#if uiState === 'complete' && finalOutput}
		<div class="final-output">
			<h3>Final Output</h3>
			{finalOutput}
		</div>
	{/if}
</div>
```

---

## State of the Art

| Old Approach     | Current Approach    | When Changed | Impact                                              |
| ---------------- | ------------------- | ------------ | --------------------------------------------------- |
| Single LLM call  | Multi-step workflow | 2024+        | Higher quality outputs through iterative refinement |
| Sync execution   | Streaming SSE       | Phase 6      | Real-time UX, ability to show progress              |
| Hardcoded models | Settings cascade    | Phase 1      | Per-function model customization                    |

**Deprecated/outdated:**

- `session.chat()` in favor of `session.prompt()` (OpenCode SDK 1.2.1+)
- Blocking execution without progress feedback

---

## Open Questions

1. **Should each council step be streamable?**
   - What we know: Phase 6 implemented streaming execution
   - What's unclear: Whether to stream each step's output or batch them
   - Recommendation: Stream each step for consistent UX - reuse streaming.service.ts patterns

2. **How to handle reviewer output format variations?**
   - What we know: LLM output is non-deterministic
   - What's unclear: Robust parsing strategy
   - Recommendation: Use JSON-structured prompt with fallback regex parsing. Log unparsed outputs for improvement.

3. **Should council runs be resumable?**
   - What we know: State persists to database
   - What's unclear: Whether to allow reconnecting to in-progress runs
   - Recommendation: MVP: no resume support. Future: add resume via run ID lookup.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/lib/server/services/execution.service.ts` - Execution patterns
- Existing codebase: `src/lib/server/services/streaming.service.ts` - SSE streaming patterns
- Existing codebase: `src/lib/server/services/settings-cascade.service.ts` - Settings resolution
- Svelte 5 runes documentation - $state, $derived, $effect patterns

### Secondary (MEDIUM confidence)

- AI Agent design patterns research (2024-2025) - Producer-Reviewer-Fixer pattern validation
- Web search results confirming "Generator-Critic" and "Reflection" patterns as standard approaches

### Tertiary (LOW confidence)

- None - all core patterns verified against existing codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already in project from Phases 1-6
- Architecture: HIGH - Clear patterns established by existing services
- Pitfalls: HIGH - Well-documented in AI workflow literature and prior phase learnings

**Research date:** 2026-02-27
**Valid until:** 30 days (stable patterns, but AI agent patterns evolve)
