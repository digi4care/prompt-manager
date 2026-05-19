# Phase 9: Council Debate Mode - Research

**Researched:** 2026-02-28
**Domain:** Multi-perspective AI debate with synthesis (iterative debate + parallel execution + synthesis)
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Debate Format

- **Rounds:** Fixed 3 rounds (same as Council Correct max rounds)
- **Execution:** Simultaneous per round — all 3 agents respond at once, each sees arguments from previous rounds only
- **Context per round:** Full history — agents receive ALL arguments from ALL previous rounds each round
- **Termination:** Always complete 3 rounds (no early termination/consensus detection)

#### Synthesis Method

- **Who synthesizes:** Dedicated 4th agent (neutral, not a debater) using `judge` function type settings
- **Output format:** Structured report with sections:
  - Summary (2-3 sentences)
  - Key Arguments For (bullet points)
  - Key Arguments Against (bullet points)
  - Points of Agreement (where agents converged)
  - Final Recommendation (actionable conclusion)
- **Consensus indicator:** Qualitative only — "Strong consensus" / "Moderate consensus" / "Mixed views"
- **Regenerate:** No — debate + synthesis are atomic. To get different synthesis, re-run debate with adjusted parameters.

#### Agent Perspectives

- **Archetypes:** Position-based — Proponent, Skeptic, Pragmatist
  - Proponent: Argues for the proposal, highlights benefits, opportunities
  - Skeptic: Challenges assumptions, surfaces risks, plays devil's advocate
  - Pragmatist: Balances both sides, focuses on feasibility, tradeoffs
- **Customization:** Per-session prompt override (Phase 7 pattern with override modal)
- **Agent count:** Fixed 3 agents (no variable count)
- **UI Labels:** Archetype names ("Proponent", "Skeptic", "Pragmatist"), color-coded like Phase 7

#### History Display

- **Layout:** Timeline view — vertical timeline with Round 1 → Round 2 → Round 3 → Synthesis
- **Rounds:** Collapsible sections for scannability
- **Agent cards per round:** 3-column grid on desktop, stacked on mobile (Phase 7 pattern)
- **Card content:** Compact cards with 2-line preview + expand to full markdown-rendered argument
- **Synthesis display:** Prominent conclusion card — distinct styling (gradient border, star/checkmark icon), clearly THE answer
- **Export:** Copy as markdown button — copies full debate (rounds + synthesis) to clipboard

### Claude's Discretion

- Exact gradient/visual styling for synthesis card
- Timeline connector styling
- Copy markdown formatting details
- Animation for round expansion

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 9 implements a multi-perspective AI debate mode where three agents with distinct perspectives (Proponent, Skeptic, Pragmatist) debate a topic across three rounds, followed by a dedicated synthesizer that produces a structured conclusion.

This is a **hybrid architecture** combining:

1. **Council Review's parallel execution** — All 3 agents respond simultaneously per round (no anchoring bias)
2. **Council Correct's round-based workflow** — 3 rounds with state persistence
3. **New synthesis phase** — A 4th agent using `judge` function type produces structured output

Key differentiators from existing council modes:

- **vs Council Review (Phase 7):** Review runs agents once in parallel; Debate runs 3 rounds with cumulative context
- **vs Council Correct (Phase 7):** Correct is sequential (producer→reviewer→fixer); Debate is parallel-per-round with synthesis

**Primary recommendation:** Create `council-debate.service.ts` that orchestrates 3 rounds of parallel agent execution, persists full history, then runs synthesis. Build `council-debate-panel.svelte` with timeline UI using existing Accordion and VersionTimeline patterns.

---

## Standard Stack

### Core (Existing - Reused)

| Library            | Version | Purpose                           | Why Standard                           |
| ------------------ | ------- | --------------------------------- | -------------------------------------- |
| `@opencode-ai/sdk` | 1.2.1+  | AI execution via session.prompt() | Already integrated, tested pattern     |
| `sveltekit-sse`    | 0.14.3  | SSE streaming for real-time UI    | Proven in Phase 6, 7 streaming         |
| `marked`           | ^17.0.3 | Markdown rendering for arguments  | Existing `MarkdownRenderer` component  |
| `zod`              | ^3.0.0  | Request/response validation       | Existing pattern across all API routes |
| `drizzle-orm`      | Latest  | Debate run state persistence      | Existing `councilRuns` table pattern   |

### Supporting (Existing Components)

| Component                     | Purpose                                       | When to Use                      |
| ----------------------------- | --------------------------------------------- | -------------------------------- |
| `MarkdownRenderer`            | Render agent arguments with proper formatting | Argument cards, synthesis output |
| `Accordion` / `AccordionItem` | Collapsible round sections                    | Timeline round expansion         |
| `VersionTimeline` pattern     | Vertical timeline with dots                   | Debate timeline layout           |
| `copyToClipboard`             | Export debate as markdown                     | Copy button functionality        |
| `Badge`                       | Agent archetype labels                        | Color-coded agent identification |

### Installation

No new packages needed — all dependencies already installed from prior phases.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/server/services/
│   ├── council-debate.service.ts     # NEW: Orchestrator for 3-round debate + synthesis
│   ├── council-review.service.ts     # EXISTING: Reuse parallel agent execution pattern
│   └── streaming.service.ts          # EXISTING: Reuse for SSE streaming
├── routes/api/council/
│   └── debate/+server.ts             # NEW: Debate API endpoint
└── lib/components/council/
    ├── council-debate-panel.svelte   # NEW: Timeline UI with collapsible rounds
    └── debate-synthesis-card.svelte  # NEW: Prominent synthesis display
```

### Pattern 1: Round-Based Parallel Execution

**What:** Each round, all 3 agents execute simultaneously (like `council-review.service.ts`), but across multiple rounds with cumulative history.

**Workflow:**

```
Round 1: [Proponent, Skeptic, Pragmatist] → all run in parallel, no prior context
         ↓ Persist outputs
Round 2: [Proponent, Skeptic, Pragmatist] → all run in parallel, receive Round 1 context
         ↓ Persist outputs
Round 3: [Proponent, Skeptic, Pragmatist] → all run in parallel, receive Round 1+2 context
         ↓ Persist outputs
Synthesis: [Synthesizer] → receives ALL arguments from ALL rounds, produces structured output
```

**State transitions:**

```
idle → debating_round_1 → debating_round_2 → debating_round_3 → synthesizing → complete
                                                                   ↓
                                                                  error
```

**Example service structure:**

```typescript
// src/lib/server/services/council-debate.service.ts

export type DebateArchetype = 'proponent' | 'skeptic' | 'pragmatist';
export type DebateState =
	| 'idle'
	| 'debating_round_1'
	| 'debating_round_2'
	| 'debating_round_3'
	| 'synthesizing'
	| 'complete'
	| 'error';

export interface DebateAgentConfig {
	id: number;
	archetype: DebateArchetype;
	name: string;
	systemPrompt: string; // Position-specific prompt
	modelId: string;
	providerId: string;
}

export interface DebateRoundResult {
	round: number;
	agentResults: DebateAgentResult[]; // 3 agent outputs per round
}

export interface DebateAgentResult {
	archetype: DebateArchetype;
	agentName: string;
	output: string;
	model: ModelInfo;
	usage: TokenUsage;
}

export interface DebateSynthesis {
	summary: string;
	keyArgumentsFor: string[];
	keyArgumentsAgainst: string[];
	pointsOfAgreement: string[];
	finalRecommendation: string;
	consensusLevel: 'Strong consensus' | 'Moderate consensus' | 'Mixed views';
}

export interface DebateRun {
	id: number;
	promptId: number;
	topicContent: string;
	currentRound: number;
	state: DebateState;
	rounds: DebateRoundResult[];
	synthesis?: DebateSynthesis;
	createdAt: Date;
	updatedAt: Date;
}

const MAX_ROUNDS = 3;

// Default archetype prompts
const ARCHETYPE_PROMPTS: Record<DebateArchetype, string> = {
	proponent: `You are the Proponent in a structured debate. Your role is to argue IN FAVOR of the topic.

Guidelines:
- Present strong arguments supporting the proposal
- Highlight benefits, opportunities, and positive outcomes
- Use evidence and logical reasoning
- Acknowledge counterarguments but explain why your position is stronger
- Be persuasive but intellectually honest

Format your arguments clearly with supporting points.`,

	skeptic: `You are the Skeptic in a structured debate. Your role is to argue AGAINST the topic.

Guidelines:
- Challenge assumptions and premises
- Surface risks, drawbacks, and potential negative outcomes
- Play devil's advocate to ensure all concerns are considered
- Use evidence and logical reasoning
- Be critical but fair - acknowledge valid points from the other side

Format your arguments clearly with specific concerns.`,

	pragmatist: `You are the Pragmatist in a structured debate. Your role is to balance both perspectives.

Guidelines:
- Evaluate both pros and cons objectively
- Focus on practical feasibility and real-world constraints
- Identify tradeoffs and conditions for success
- Seek middle ground where possible
- Consider implementation challenges and mitigation strategies

Format your arguments with balanced analysis.`
};
```

### Pattern 2: History Context Building

**What:** Each round, agents receive the full history of ALL previous arguments from ALL agents.

**Context construction:**

```typescript
function buildDebateContextForRound(
	topic: string,
	previousRounds: DebateRoundResult[],
	currentRound: number
): string {
	let context = `## Topic for Debate\n\n${topic}\n\n`;

	if (previousRounds.length > 0) {
		context += `## Previous Rounds\n\n`;
		for (const round of previousRounds) {
			context += `### Round ${round.round}\n\n`;
			for (const agent of round.agentResults) {
				context += `**${agent.agentName} (${agent.archetype}):**\n${agent.output}\n\n`;
			}
		}
		context += `---\n\n## Your Response (Round ${currentRound})\n\n`;
		context += `Consider the arguments above and provide your ${currentRound === 3 ? 'final' : ''} response. `;
		context +=
			currentRound === 3
				? 'This is the final round - summarize your position.'
				: 'Build on or respond to the arguments presented.';
	}

	return context;
}
```

### Pattern 3: Synthesis Prompt Construction

**What:** The synthesizer (4th agent using `judge` function type) produces structured output.

**Synthesis prompt:**

```typescript
function buildSynthesisPrompt(topic: string, rounds: DebateRoundResult[]): string {
	let prompt = `You are a neutral synthesizer analyzing a multi-perspective debate.

## Topic
${topic}

## Debate History
`;
	for (const round of rounds) {
		prompt += `\n### Round ${round.round}\n`;
		for (const agent of round.agentResults) {
			prompt += `\n**${agent.agentName}:**\n${agent.output}\n`;
		}
	}

	prompt += `
## Your Task
Analyze the debate above and produce a structured synthesis in this exact JSON format:
{
	"summary": "2-3 sentence overview of the key points",
	"keyArgumentsFor": ["argument 1", "argument 2", ...],
	"keyArgumentsAgainst": ["argument 1", "argument 2", ...],
	"pointsOfAgreement": ["where agents agreed", ...],
	"finalRecommendation": "actionable conclusion based on the debate",
	"consensusLevel": "Strong consensus" | "Moderate consensus" | "Mixed views"
}

Respond ONLY with valid JSON.`;

	return prompt;
}
```

### Pattern 4: Timeline UI with Collapsible Rounds

**What:** Vertical timeline with round markers, collapsible sections for each round, and prominent synthesis card.

**Component structure:**

```svelte
<!-- council-debate-panel.svelte -->
<script lang="ts">
	import { source, type Source } from 'sveltekit-sse';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import MarkdownRenderer from '$lib/components/prompts/markdown-renderer.svelte';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { Badge } from '$lib/components/ui/badge';

	// ... (similar state management as council-review-panel.svelte)

	// Timeline structure
	let rounds = $state<DebateRoundResult[]>([]);
	let synthesis = $state<DebateSynthesis | null>(null);

	// Derived: all rounds complete?
	let allRoundsComplete = $derived(rounds.length === 3);

	// Export as markdown
	async function exportAsMarkdown() {
		let md = `# Debate: ${topicContent}\n\n`;
		for (const round of rounds) {
			md += `## Round ${round.round}\n\n`;
			for (const agent of round.agentResults) {
				md += `### ${agent.agentName} (${agent.archetype})\n\n${agent.output}\n\n`;
			}
		}
		if (synthesis) {
			md += `## Synthesis\n\n`;
			md += `**Summary:** ${synthesis.summary}\n\n`;
			md += `**Arguments For:**\n${synthesis.keyArgumentsFor.map((a) => `- ${a}`).join('\n')}\n\n`;
			md += `**Arguments Against:**\n${synthesis.keyArgumentsAgainst.map((a) => `- ${a}`).join('\n')}\n\n`;
			md += `**Final Recommendation:** ${synthesis.finalRecommendation}\n`;
		}
		await copyToClipboard(md);
	}
</script>

<div class="debate-panel">
	<!-- Timeline line -->
	{#if rounds.length > 0}
		<div class="absolute top-3 bottom-3 left-4 w-0.5 bg-border"></div>
	{/if}

	<!-- Rounds -->
	{#each rounds as round, i (round.round)}
		<div class="relative pl-10">
			<!-- Timeline dot -->
			<div
				class="absolute top-3 left-2 h-4 w-4 rounded-full border-2 border-primary bg-primary ring-4 ring-primary/20"
			></div>

			<!-- Collapsible round section -->
			<Accordion type="single" collapsible>
				<AccordionItem value="round-{round.round}">
					<AccordionTrigger>
						Round {round.round}
					</AccordionTrigger>
					<AccordionContent>
						<!-- 3-column grid for agent cards -->
						<div class="grid gap-4 md:grid-cols-3">
							{#each round.agentResults as agent (agent.archetype)}
								<!-- Agent card with color coding -->
							{/each}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	{/each}

	<!-- Synthesis card (distinct styling) -->
	{#if synthesis}
		<div class="relative mt-6 pl-10">
			<!-- Synthesis timeline marker (star icon) -->
			<div class="absolute top-3 left-1 h-6 w-6 text-primary">
				<Star class="h-6 w-6 fill-primary" />
			</div>

			<!-- Prominent synthesis card with gradient border -->
			<Card class="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
				<!-- Synthesis content -->
			</Card>
		</div>
	{/if}
</div>
```

### Pattern 5: Agent Archetype Color Coding

**What:** Consistent color scheme for the three archetypes across the UI.

```typescript
// Archetype colors (matching Phase 7 pattern)
const ARCHETYPE_COLORS: Record<
	DebateArchetype,
	{ bg: string; border: string; dark: { bg: string; border: string } }
> = {
	proponent: {
		bg: 'bg-blue-50',
		border: 'border-blue-200',
		dark: { bg: 'dark:bg-blue-950', border: 'dark:border-blue-800' }
	},
	skeptic: {
		bg: 'bg-red-50',
		border: 'border-red-200',
		dark: { bg: 'dark:bg-red-950', border: 'dark:border-red-800' }
	},
	pragmatist: {
		bg: 'bg-amber-50',
		border: 'border-amber-200',
		dark: { bg: 'dark:bg-amber-950', border: 'dark:border-amber-800' }
	}
};
```

### Anti-Patterns to Avoid

- **Sequential agent execution per round:** Defeats the purpose of simultaneous debate (causes anchoring bias)
- **Limited history context:** Agents need full previous rounds to build coherent debate
- **Early termination:** Always run 3 rounds for complete debate record
- **Synthesizer as 5th debater:** Synthesizer must be neutral, not present arguments
- **Storing state in memory only:** Persist to database for history and recovery
- **Coupling debate to specific domain prompts:** Use position-based archetypes (universal) not domain-specific

---

## Don't Hand-Roll

| Problem                  | Don't Build                  | Use Instead                               | Why                                            |
| ------------------------ | ---------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Parallel agent execution | Custom parallel coordination | `council-review.service.ts` pattern       | Already handles round-robin parallel streaming |
| SSE streaming            | Custom SSE implementation    | `streaming.service.ts` / `sveltekit-sse`  | Proven event filtering, heartbeat, cleanup     |
| Markdown rendering       | Custom parser                | `MarkdownRenderer` component              | Handles GFM, XSS protection, styling           |
| Collapsible sections     | Custom accordion             | `Accordion` components from shadcn-svelte | Accessible, animated, consistent styling       |
| Timeline layout          | Custom CSS timeline          | `VersionTimeline` pattern                 | Proven responsive design                       |
| Clipboard copy           | Manual navigator.clipboard   | `copyToClipboard` utility                 | Fallback support for older browsers            |
| Agent state management   | Complex state machine        | Svelte 5 runes ($state, $derived)         | Reactive by design                             |

**Key insight:** 80% of infrastructure exists. New code is primarily the debate orchestrator and timeline UI.

---

## Common Pitfalls

### Pitfall 1: Race Condition in Parallel Round Execution

**What goes wrong:** Round 2 starts before all Round 1 agents complete.

**Why it happens:** Parallel execution not properly awaited.

**How to avoid:** Use the same round-robin generator pattern from `council-review.service.ts`. Track completion of all 3 agents before proceeding to next round.

**Warning signs:** Agents in Round 2 reference incomplete Round 1 arguments.

### Pitfall 2: Context Truncation

**What goes wrong:** Full history exceeds context window, arguments get truncated.

**Why it happens:** 3 rounds × 3 agents × long arguments = large context.

**How to avoid:**

1. Set reasonable max output tokens per agent (e.g., 1024)
2. Consider summarization prompt for long arguments
3. Monitor token usage and warn if approaching limits

**Warning signs:** Later round arguments seem disconnected from earlier points.

### Pitfall 3: Synthesis JSON Parse Failure

**What goes wrong:** Synthesizer produces invalid JSON, UI breaks.

**Why it happens:** LLM output is non-deterministic.

**How to avoid:**

1. Use structured prompt with explicit JSON format
2. Implement robust parsing with fallback (same pattern as reviewer parsing in council-correct.service.ts)
3. Log unparsed outputs for analysis

**Warning signs:** Synthesis card shows empty or error state.

### Pitfall 4: State Loss on Page Refresh

**What goes wrong:** User refreshes during debate, all progress lost.

**Why it happens:** State only stored in client memory.

**How to avoid:** Persist each round result to database immediately after completion. Store in `councilRuns` table with new `mode` column or create `debateRuns` table.

**Warning signs:** No database writes during debate execution.

### Pitfall 5: Inconsistent Agent Responses

**What goes wrong:** Agents drift from their archetype over rounds.

**Why it happens:** Context history overwhelms the system prompt.

**How to avoid:**

1. Include archetype reminder in each round's prompt
2. Keep system prompt prominent (at start of context)
3. Use temperature ~0.3 for consistency

**Warning signs:** Proponent starts arguing against, Skeptic becomes supportive.

---

## Code Examples

### Debate Orchestrator Service Pattern

```typescript
// src/lib/server/services/council-debate.service.ts

import { db } from '../db/client';
import { councilRuns } from '../db/schema';
import { getOpencodeClient } from './opencode.service';
import { eq } from 'drizzle-orm';

const MAX_ROUNDS = 3;

export type DebateEventType =
	| 'debate_start'
	| 'round_start'
	| 'agent_start'
	| 'agent_delta'
	| 'agent_complete'
	| 'round_complete'
	| 'synthesis_start'
	| 'synthesis_delta'
	| 'synthesis_complete'
	| 'debate_complete'
	| 'error';

export interface DebateEvent {
	type: DebateEventType;
	round?: number;
	archetype?: DebateArchetype;
	data: unknown;
}

export async function* executeDebate(options: {
	promptId: number;
	topic: string;
}): AsyncGenerator<DebateEvent, DebateRun, unknown> {
	const { promptId, topic } = options;

	// Create debate run record
	let runId: number;
	try {
		const result = await db
			.insert(councilRuns)
			.values({
				promptId,
				inputContent: topic,
				currentRound: 0,
				maxRounds: MAX_ROUNDS,
				state: 'idle',
				steps: '[]', // Will store rounds as JSON
				finalOutput: null
			})
			.returning({ id: councilRuns.id });
		runId = result[0].id;
	} catch (error) {
		yield { type: 'error', data: { message: 'Failed to create debate run' } };
		throw error;
	}

	// Yield debate start
	yield {
		type: 'debate_start',
		data: { topic, maxRounds: MAX_ROUNDS }
	};

	const rounds: DebateRoundResult[] = [];

	// Execute 3 rounds
	for (let roundNum = 1; roundNum <= MAX_ROUNDS; roundNum++) {
		await db
			.update(councilRuns)
			.set({ state: `debating_round_${roundNum}` as DebateState, currentRound: roundNum })
			.where(eq(councilRuns.id, runId));

		yield { type: 'round_start', round: roundNum, data: { round: roundNum } };

		// Build context with previous rounds
		const context = buildDebateContextForRound(topic, rounds, roundNum);

		// Run all 3 agents in parallel (similar to council-review.service.ts)
		const agentResults: DebateAgentResult[] = [];
		const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];

		// Create generators for all agents
		const generators = archetypes.map((archetype) => runDebateAgent(archetype, context, roundNum));

		// Round-robin process all agents
		const pendingGenerators = new Map(generators.map((g, i) => [archetypes[i], g]));
		const completedResults = new Map<DebateArchetype, DebateAgentResult>();

		while (pendingGenerators.size > 0) {
			for (const [archetype, generator] of pendingGenerators) {
				const result = await generator.next();

				if (result.done) {
					completedResults.set(archetype, result.value!);
					pendingGenerators.delete(archetype);
					yield {
						type: 'agent_complete',
						round: roundNum,
						archetype,
						data: result.value
					};
				} else {
					yield result.value;
				}
			}
		}

		// Store round results in order
		for (const archetype of archetypes) {
			agentResults.push(completedResults.get(archetype)!);
		}

		rounds.push({ round: roundNum, agentResults });

		// Persist to database
		await db
			.update(councilRuns)
			.set({ steps: JSON.stringify(rounds) })
			.where(eq(councilRuns.id, runId));

		yield { type: 'round_complete', round: roundNum, data: { round: roundNum } };
	}

	// Synthesis phase
	await db.update(councilRuns).set({ state: 'synthesizing' }).where(eq(councilRuns.id, runId));

	yield { type: 'synthesis_start', data: {} };

	const synthesisPrompt = buildSynthesisPrompt(topic, rounds);
	const synthesisResult = await runSynthesizer(synthesisPrompt);

	// Yield synthesis deltas and completion
	yield { type: 'synthesis_complete', data: synthesisResult };

	// Final update
	await db
		.update(councilRuns)
		.set({
			state: 'complete',
			finalOutput: JSON.stringify(synthesisResult)
		})
		.where(eq(councilRuns.id, runId));

	yield {
		type: 'debate_complete',
		data: { rounds, synthesis: synthesisResult }
	};

	// Return final run
	return {
		id: runId,
		promptId,
		topicContent: topic,
		currentRound: MAX_ROUNDS,
		state: 'complete',
		rounds,
		synthesis: synthesisResult,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}
```

### Synthesis Card Component Pattern

```svelte
<!-- debate-synthesis-card.svelte -->
<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import MarkdownRenderer from '$lib/components/prompts/markdown-renderer.svelte';
	import Star from 'lucide-svelte/icons/star';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import XCircle from 'lucide-svelte/icons/x-circle';
	import MinusCircle from 'lucide-svelte/icons/minus-circle';
	import Lightbulb from 'lucide-svelte/icons/lightbulb';

	interface Props {
		synthesis: DebateSynthesis;
		class?: string;
	}

	let { synthesis, class: className = '' }: Props = $props();

	function getConsensusBadgeVariant(level: string): 'default' | 'secondary' | 'outline' {
		if (level === 'Strong consensus') return 'default';
		if (level === 'Moderate consensus') return 'secondary';
		return 'outline';
	}
</script>

<Card
	class="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background {className}"
>
	<!-- Gradient accent line at top -->
	<div
		class="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-primary"
	></div>

	<div class="p-6">
		<!-- Header -->
		<div class="mb-4 flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
				<Star class="h-5 w-5 text-primary" />
			</div>
			<div>
				<h3 class="text-lg font-semibold">Synthesis</h3>
				<Badge variant={getConsensusBadgeVariant(synthesis.consensusLevel)}>
					{synthesis.consensusLevel}
				</Badge>
			</div>
		</div>

		<!-- Summary -->
		<div class="mb-4 rounded-lg bg-muted/50 p-4">
			<p class="text-sm font-medium">{synthesis.summary}</p>
		</div>

		<!-- Arguments grid -->
		<div class="mb-4 grid gap-4 md:grid-cols-2">
			<!-- Arguments For -->
			<div
				class="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/50"
			>
				<div class="mb-2 flex items-center gap-2">
					<CheckCircle class="h-4 w-4 text-green-600" />
					<span class="font-medium text-green-700 dark:text-green-300">Key Arguments For</span>
				</div>
				<ul class="space-y-1 text-sm">
					{#each synthesis.keyArgumentsFor as arg (arg)}
						<li class="flex gap-2"><span class="text-green-500">•</span> {arg}</li>
					{/each}
				</ul>
			</div>

			<!-- Arguments Against -->
			<div
				class="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/50"
			>
				<div class="mb-2 flex items-center gap-2">
					<XCircle class="h-4 w-4 text-red-600" />
					<span class="font-medium text-red-700 dark:text-red-300">Key Arguments Against</span>
				</div>
				<ul class="space-y-1 text-sm">
					{#each synthesis.keyArgumentsAgainst as arg (arg)}
						<li class="flex gap-2"><span class="text-red-500">•</span> {arg}</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Points of Agreement -->
		{#if synthesis.pointsOfAgreement.length > 0}
			<div
				class="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/50"
			>
				<div class="mb-2 flex items-center gap-2">
					<MinusCircle class="h-4 w-4 text-amber-600" />
					<span class="font-medium text-amber-700 dark:text-amber-300">Points of Agreement</span>
				</div>
				<ul class="space-y-1 text-sm">
					{#each synthesis.pointsOfAgreement as point (point)}
						<li class="flex gap-2"><span class="text-amber-500">•</span> {point}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Final Recommendation -->
		<div class="rounded-lg border border-primary/30 bg-primary/5 p-4">
			<div class="mb-2 flex items-center gap-2">
				<Lightbulb class="h-4 w-4 text-primary" />
				<span class="font-medium">Final Recommendation</span>
			</div>
			<p class="text-sm">{synthesis.finalRecommendation}</p>
		</div>
	</div>
</Card>
```

---

## State of the Art

| Old Approach         | Current Approach                    | When Changed   | Impact                                                 |
| -------------------- | ----------------------------------- | -------------- | ------------------------------------------------------ |
| Single AI analysis   | Multi-perspective debate            | 2024+          | Higher quality decisions through adversarial reasoning |
| Sequential debate    | Simultaneous per round              | Phase 9 design | Eliminates anchoring bias                              |
| Manual synthesis     | Dedicated synthesizer agent         | Phase 9 design | Consistent structured output                           |
| Basic output display | Timeline UI with collapsible rounds | Phase 9 design | Better UX for complex debates                          |

**Deprecated/outdated:**

- Single-agent decision making (misses perspectives)
- Consensus voting (different from synthesis)
- Early termination (incomplete debate record)

---

## Open Questions

1. **Should debate runs be resumable?**
   - What we know: State persists to database
   - What's unclear: Whether to allow reconnecting to in-progress debates
   - Recommendation: MVP: no resume support. Future: add resume via run ID lookup.

2. **How to handle context window limits for long debates?**
   - What we know: 3 rounds × 3 agents can exceed context limits
   - What's unclear: Best summarization strategy
   - Recommendation: Set max output tokens per agent (1024), monitor usage, implement warning.

3. **Should synthesis be regeneratable?**
   - What we know: User decided "no" - debate + synthesis are atomic
   - What's unclear: If users will want different synthesis without re-running debate
   - Recommendation: Honor decision. If demand arises, add "re-synthesize" feature later.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/lib/server/services/council-review.service.ts` - Parallel agent execution pattern
- Existing codebase: `src/lib/server/services/council-correct.service.ts` - Round-based workflow pattern
- Existing codebase: `src/lib/components/council/council-review-panel.svelte` - Parallel agent UI pattern
- Existing codebase: `src/lib/components/versions/version-timeline.svelte` - Timeline UI pattern
- Existing codebase: `src/lib/components/prompts/markdown-renderer.svelte` - Markdown rendering
- Existing codebase: `src/lib/utils/clipboard.ts` - Copy to clipboard utility

### Secondary (MEDIUM confidence)

- AI debate methodology research (multi-perspective analysis patterns)
- Context.md decisions (user-locked constraints)

### Tertiary (LOW confidence)

- None - all core patterns verified against existing codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already in project from Phases 1-7
- Architecture: HIGH - Clear patterns established by existing services (parallel execution, round-based workflow)
- Pitfalls: HIGH - Well-documented from existing council service implementations

**Research date:** 2026-02-28
**Valid until:** 30 days (stable patterns, but AI debate methodologies evolve)
