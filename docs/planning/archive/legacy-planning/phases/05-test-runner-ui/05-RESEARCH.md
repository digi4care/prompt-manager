# Phase 5: Test Runner UI - Research

**Researched:** 2026-02-27
**Domain:** Unified testing interface combining variable preview + execution
**Confidence:** HIGH

## Summary

Phase 5 creates a unified test runner interface that combines existing Phase 2 (execution) and Phase 4 (snippet variables) components into a single cohesive experience. The research reveals significant component reuse opportunity - `SnippetPreview` already handles variable inputs and preview, while `ExecutionPanel` handles execution with overrides. The key integration challenge is combining these in the prompt editor context where users will primarily test prompts.

**Primary recommendation:** Create a `TestRunnerPanel` component that composes `SnippetPreview` + `ExecutionPanel` + `ExecutionResult` with a unified state flow, then integrate into the edit page as a side panel or collapsible section.

## Standard Stack

### Core (Existing - Reuse)

| Library/Component | Version | Purpose                         | Why Standard                                                   |
| ----------------- | ------- | ------------------------------- | -------------------------------------------------------------- |
| svelte            | 5.x     | Framework with runes reactivity | Project standard, $state/$derived/$effect patterns established |
| bits-ui           | latest  | Tabs, Accordion primitives      | Already used in UI components                                  |
| lucide-svelte     | latest  | Icons                           | Consistent iconography                                         |
| SnippetPreview    | Phase 4 | Variable inputs + live preview  | Already implements reactive preview                            |
| ExecutionPanel    | Phase 2 | Execution with overrides        | Already implements state machine                               |
| ExecutionResult   | Phase 2 | Result display with metrics     | Already implements metrics display                             |

### Supporting (New - May Need)

| Library                     | Purpose                                   | When to Use                          |
| --------------------------- | ----------------------------------------- | ------------------------------------ |
| Resizable panels (optional) | Split view between editor and test runner | If panel layout requires user resize |

### Alternatives Considered

| Instead of                  | Could Use                   | Tradeoff                                        |
| --------------------------- | --------------------------- | ----------------------------------------------- |
| Compose existing components | Build monolithic TestRunner | Composition is more maintainable, follows SOLID |
| Side panel in editor        | Modal dialog                | Side panel keeps context visible, better UX     |
| Collapsible section         | Separate tab                | Collapsible keeps editor + test adjacent        |

## Architecture Patterns

### Recommended Project Structure

```
src/lib/components/prompts/
├── test-runner-panel.svelte     # NEW: Composes preview + execution
├── snippet-preview.svelte       # EXISTING: Variable inputs + preview
├── execution-panel.svelte       # EXISTING: Execution with overrides
├── execution-result.svelte      # EXISTING: Result display
└── index.ts                     # Export TestRunnerPanel
```

### Pattern 1: Composition over Inheritance

**What:** `TestRunnerPanel` composes existing components rather than duplicating logic
**When to use:** Always - this is the primary architectural pattern
**Example:**

```svelte
<!-- test-runner-panel.svelte -->
<script lang="ts">
	import SnippetPreview from './snippet-preview.svelte';
	import ExecutionPanel from './execution-panel.svelte';
	import ExecutionResult from './execution-result.svelte';

	let { template, variables, promptId } = $props();
	let resolvedContent = $state('');
	let values = $state<Record<string, string>>({});

	// Flow: values -> preview -> resolvedContent -> execution
</script>

<div class="test-runner">
	<SnippetPreview {template} {variables} bind:values />
	<div class="preview">{resolvedContent}</div>
	<ExecutionPanel {promptId} content={resolvedContent} />
</div>
```

### Pattern 2: State Machine for Test Flow

**What:** Use the existing 'idle' | 'loading' | 'success' | 'error' pattern
**When to use:** Test runner execution states
**Example:** Already implemented in `ExecutionPanel` - reuse as-is

### Anti-Patterns to Avoid

- **Duplicating variable logic:** Don't rebuild `extractVariables`/`resolveVariables` - use `snippet-variables.ts`
- **Monolithic component:** Don't create one giant TestRunner - compose existing components
- **Separate execution flow:** Don't create a new execution endpoint - use existing `/api/prompts/[id]/execute`

## Don't Hand-Roll

| Problem                        | Don't Build           | Use Instead                      | Why                             |
| ------------------------------ | --------------------- | -------------------------------- | ------------------------------- |
| Variable extraction/resolution | Custom regex logic    | `snippet-variables.ts` utilities | Edge cases already handled      |
| Variable input form            | Custom form component | `SnippetPreview` component       | Reactive preview already works  |
| Execution state machine        | Custom state logic    | `ExecutionPanel` patterns        | State machine already tested    |
| Result display                 | Custom metrics UI     | `ExecutionResult` component      | Metrics formatting already done |

**Key insight:** Phase 5 is primarily integration work, not new capability building. The heavy lifting exists in Phase 2 (execution) and Phase 4 (variables).

## Common Pitfalls

### Pitfall 1: Stale Content After Edit

**What goes wrong:** Test runner uses old template content after user edits
**Why it happens:** Not reacting to template changes from parent
**How to avoid:** Use `$derived` for reactive content from parent, or `$effect` to sync
**Warning signs:** Preview shows old content after edit

### Pitfall 2: Variable State Lost on Tab Switch

**What goes wrong:** User fills variables, switches tab, returns to empty form
**Why it happens:** Component unmounts and state is lost
**How to avoid:** Lift variable state to parent component or persist in URL/localStorage
**Warning signs:** Variables reset when switching between tabs

### Pitfall 3: Execution Without Resolved Content

**What goes wrong:** Execution sent with unresolved {{VAR}} placeholders
**Why it happens:** Not using resolved preview content for execution
**How to avoid:** Pass `resolvedContent` from preview to execution panel, not raw template
**Warning signs:** API receives {{VAR}} instead of actual values

### Pitfall 4: Missing Metrics Display

**What goes wrong:** Execution completes but no metrics shown
**Why it happens:** Not using `ExecutionResult` component or API response format changed
**How to avoid:** Reuse `ExecutionResult` as-is, ensure API contract matches
**Warning signs:** Result shows content but no model/tokens/duration

## Code Examples

### TestRunnerPanel Composition (Conceptual)

```svelte
<script lang="ts">
	import SnippetPreview from './snippet-preview.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import Play from '@lucide/svelte/icons/play';
	import {
		extractVariables,
		resolveVariables,
		type SnippetVariable
	} from '$lib/utils/snippet-variables';

	interface Props {
		promptId: number;
		template: string;
		variables?: SnippetVariable[];
		onexecute?: (result: ExecutionResult) => void;
	}

	let { promptId, template, variables = [], onexecute }: Props = $props();

	// Variable input state
	let values = $state<Record<string, string>>({});

	// Initialize defaults from variable definitions
	$effect(() => {
		for (const v of variables) {
			if (v.default && !(v.name in values)) {
				values[v.name] = v.default;
			}
		}
	});

	// Reactive resolved content
	let preview = $derived(resolveVariables(template, values, variables));

	// Execution state
	let executionState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let result = $state(null);

	async function handleExecute() {
		if (preview.hasErrors) return;

		executionState = 'loading';
		try {
			const response = await fetch(`/api/prompts/${promptId}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: preview.content })
			});
			result = await response.json();
			executionState = 'success';
			onexecute?.(result);
		} catch (e) {
			executionState = 'error';
		}
	}
</script>

<Card class="p-4">
	<h3 class="mb-4 font-semibold">Test Runner</h3>

	<!-- Variable inputs -->
	<SnippetPreview {template} {variables} bind:values />

	<!-- Execute button -->
	<Button onclick={handleExecute} disabled={executionState === 'loading' || preview.hasErrors}>
		<Play class="mr-2 h-4 w-4" />
		Execute
	</Button>

	<!-- Results -->
	{#if executionState === 'success' && result}
		<ExecutionResult {result} />
	{/if}
</Card>
```

### Integration in Edit Page (Conceptual)

```svelte
<!-- In /routes/prompts/[id]/edit/+page.svelte -->
<script lang="ts">
	import TestRunnerPanel from '$lib/components/prompts/test-runner-panel.svelte';
	import { parseSnippetFrontmatter } from '$lib/opencode/frontmatter';

	// Extract variables from frontmatter
	let parsedFrontmatter = $derived(parseSnippetFrontmatter(frontmatterYaml));
	let variables = $derived(parsedFrontmatter.variables);

	// Track if test runner is open
	let showTestRunner = $state(false);
</script>

<div class="grid lg:grid-cols-3">
	<div class="lg:col-span-2">
		<!-- Editor content -->
		<PromptEditor bind:value={content} />
	</div>
	<aside>
		<!-- Test runner toggle -->
		<Button onclick={() => (showTestRunner = !showTestRunner)}>Test Runner</Button>

		{#if showTestRunner}
			<TestRunnerPanel promptId={data.prompt.id} template={content} {variables} />
		{/if}
	</aside>
</div>
```

## State of the Art

| Old Approach                      | Current Approach                  | When Changed       | Impact                   |
| --------------------------------- | --------------------------------- | ------------------ | ------------------------ |
| Svelte 4 reactive statements ($:) | Svelte 5 runes ($state, $derived) | Svelte 5 release   | More explicit reactivity |
| Monolithic components             | Composition with slots/props      | Phase 2-4 patterns | Better testability       |
| Custom execution UI per page      | Unified ExecutionPanel            | Phase 2            | Consistent UX            |

**Deprecated/outdated:**

- Svelte 4 `export let` props → Use `$props()` rune
- Reactive declarations `$:` → Use `$derived` or `$effect`
- Two-way binding via `bind:value` → Use `$bindable()` in child

## Open Questions

1. **Panel Layout in Edit Page**
   - What we know: Edit page has 3-column grid (editor + sidebar)
   - What's unclear: Should test runner be a collapsible section in sidebar, or a side panel?
   - Recommendation: Start with collapsible section in sidebar for simplicity; can evolve to resizable panel later

2. **Variable Persistence**
   - What we know: Users may test multiple times with same variable values
   - What's unclear: Should variable values persist across sessions?
   - Recommendation: In-memory persistence only (state survives tab switches but not page reload) for MVP

3. **Integration Point**
   - What we know: UI-01 says "access from prompt editor"
   - What's unclear: Should this also appear on prompt detail page (where ExecutionPanel already exists)?
   - Recommendation: Add to edit page; detail page already has ExecutionPanel which can be enhanced later

## Sources

### Primary (HIGH confidence)

- `/websites/svelte_dev` - Svelte 5 runes documentation ($state, $derived, $effect, $props, $bindable)
- Project codebase - Existing components: ExecutionPanel, SnippetPreview, ExecutionResult
- `.planning/STATE.md` - Established patterns and prior decisions

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` - Phase 5 requirements UI-01 to UI-04
- `.planning/REQUIREMENTS.md` - Detailed requirement descriptions

### Tertiary (LOW confidence)

- N/A - All critical information from project sources

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All components exist in project, Svelte 5 patterns well-established
- Architecture: HIGH - Composition pattern is straightforward, existing components provide clear model
- Pitfalls: HIGH - Based on actual implementation experience from Phase 2-4

**Research date:** 2026-02-27
**Valid until:** 30 days (stable patterns)
