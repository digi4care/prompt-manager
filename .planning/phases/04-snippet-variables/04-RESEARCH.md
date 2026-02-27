# Phase 4: Snippet Variables - Research

**Researched:** 2026-02-26
**Domain:** Variable templating, reactive preview, security escaping
**Confidence:** HIGH

## Summary

Snippet variables enable reusable prompt templates using `{{VAR}}` placeholder syntax. The project already uses this syntax in `improvePresets` (schema.ts:177) and has placeholder definitions in tests (prompts.test.ts:1252-1256). Implementation requires: (1) extracting variables from content via regex, (2) parsing variable definitions from frontmatter YAML, (3) a reactive preview service that escapes `{{` and `}}` in user values, and (4) a Svelte 5 live preview component using `$derived`.

**Primary recommendation:** Use `{{VAR}}` syntax with regex `/{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g` for extraction, escape `{{` → `\{\{` and `}}` → `\}\}` in values, and implement preview as a pure `$derived` from variable values.

## Standard Stack

### Core (Existing - Use These)

| Library     | Version | Purpose                     | Why Standard                   |
| ----------- | ------- | --------------------------- | ------------------------------ |
| yaml        | 2.8.2   | Parse variable definitions  | Already used in frontmatter.ts |
| Svelte 5    | ^5.x    | Reactive preview with runes | Project standard               |
| Zod         | ^3.24.x | Variable schema validation  | Used in all services           |
| Drizzle ORM | ^0.45.x | Store snippet definitions   | Existing database layer        |

### Supporting (Existing)

| Library       | Version | Purpose                 | When to Use              |
| ------------- | ------- | ----------------------- | ------------------------ |
| shadcn-svelte | latest  | Input, Card, Badge      | Variable input form      |
| lucide-svelte | latest  | AlertCircle, Info icons | Error/warning indicators |

### No New Dependencies Required

All functionality exists in current stack.

## Architecture Patterns

### Variable Extraction Pattern

```typescript
// src/lib/server/services/snippet-variables.service.ts

const VARIABLE_REGEX = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g;

export interface ExtractedVariable {
	name: string;
	startIndex: number;
	endIndex: number;
}

export function extractVariables(content: string): ExtractedVariable[] {
	const variables: ExtractedVariable[] = [];
	let match: RegExpExecArray | null;

	while ((match = VARIABLE_REGEX.exec(content)) !== null) {
		const existing = variables.find((v) => v.name === match![1]);
		if (!existing) {
			variables.push({
				name: match[1],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}
	}

	VARIABLE_REGEX.lastIndex = 0; // Reset for reuse
	return variables;
}
```

### Frontmatter Variable Definition Schema

```typescript
// Extend existing frontmatter.ts or create separate schema

import { z } from 'zod';

export const snippetVariableSchema = z.object({
	name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Invalid variable name'),
	description: z.string().optional(),
	default: z.string().optional(),
	required: z.boolean().default(true)
});

export const snippetFrontmatterSchema = z.object({
	variables: z.array(snippetVariableSchema).optional()
});

export type SnippetVariable = z.infer<typeof snippetVariableSchema>;
```

### Variable Replacement with Security Escaping

```typescript
// src/lib/server/services/snippet-variables.service.ts

const VARIABLE_REGEX = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g;

export interface VariableValues {
	[name: string]: string;
}

export interface ResolveResult {
	content: string;
	missingVariables: string[];
	hasErrors: boolean;
}

/**
 * Escape {{ and }} in user-provided values to prevent injection
 * Mustache-style security: prevent users from creating new placeholders
 */
export function escapeVariableValue(value: string): string {
	return value.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

/**
 * Replace {{VAR}} placeholders with values
 * - Escapes {{ and }} in values to prevent injection
 * - Returns list of missing required variables
 * - Returns escaped placeholders for missing vars
 */
export function resolveVariables(
	template: string,
	values: VariableValues,
	definitions?: SnippetVariable[]
): ResolveResult {
	const missingVariables: string[] = [];
	const requiredVars = new Set(
		definitions?.filter((v) => v.required !== false).map((v) => v.name) || []
	);

	// First, collect all variable names in template
	const templateVars = new Set<string>();
	let match: RegExpExecArray | null;
	const regex = new RegExp(VARIABLE_REGEX.source, 'g');

	while ((match = regex.exec(template)) !== null) {
		templateVars.add(match[1]);
	}

	// Check for missing required variables
	for (const varName of templateVars) {
		if (requiredVars.has(varName) && !(varName in values)) {
			missingVariables.push(varName);
		}
	}

	// Replace variables (escape values for security)
	let resolved = template;
	for (const [name, value] of Object.entries(values)) {
		const escaped = escapeVariableValue(value);
		const varRegex = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
		resolved = resolved.replace(varRegex, escaped);
	}

	return {
		content: resolved,
		missingVariables,
		hasErrors: missingVariables.length > 0
	};
}
```

### Svelte 5 Reactive Preview Component

```svelte
<!-- src/lib/components/prompts/snippet-preview.svelte -->
<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import {
		extractVariables,
		resolveVariables
	} from '$lib/server/services/snippet-variables.service';
	import type { SnippetVariable } from '$lib/server/services/snippet-variables.service';

	interface Props {
		template: string;
		variables?: SnippetVariable[];
		class?: string;
	}

	let { template, variables = [], class: className }: Props = $props();

	// Extract variables from template
	let templateVars = $derived(extractVariables(template).map((v) => v.name));

	// Build unique variable list (template + definitions)
	let allVarNames = $derived(() => {
		const defined = new Set(variables.map((v) => v.name));
		const inTemplate = new Set(templateVars);
		return [...new Set([...inTemplate, ...defined])];
	});

	// Variable input values (reactive state)
	let values = $state<Record<string, string>>({});

	// Initialize defaults from definitions
	$effect(() => {
		for (const v of variables) {
			if (v.default && !(v.name in values)) {
				values[v.name] = v.default;
			}
		}
	});

	// Reactive preview - updates on every keystroke
	let preview = $derived(resolveVariables(template, values, variables));

	// Missing required variables for error display
	let requiredVarNames = $derived(
		new Set(variables.filter((v) => v.required !== false).map((v) => v.name))
	);
	let missingRequired = $derived(
		preview.missingVariables.filter((name) => requiredVarNames.has(name))
	);
</script>

<div class={className}>
	<!-- Variable Inputs -->
	{#if allVarNames().length > 0}
		<Card class="mb-4 p-4">
			<h3 class="mb-3 text-sm font-medium">Variables</h3>
			<div class="grid gap-3">
				{#each allVarNames() as varName (varName)}
					{@const definition = variables.find((v) => v.name === varName)}
					<div>
						<label class="mb-1 block text-xs text-muted-foreground">
							{varName}
							{#if definition?.required !== false}
								<span class="text-red-500">*</span>
							{/if}
						</label>
						<Input
							bind:value={values[varName]}
							placeholder={definition?.description || `Enter ${varName}`}
						/>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Preview Output -->
	<Card class="p-4">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-medium">Preview</h3>
			{#if missingRequired.length > 0}
				<Badge variant="destructive" class="flex items-center gap-1">
					<AlertCircle class="h-3 w-3" />
					{missingRequired.length} missing
				</Badge>
			{:else if allVarNames().length > 0}
				<Badge variant="success">Resolved</Badge>
			{/if}
		</div>

		{#if missingRequired.length > 0}
			<div class="mb-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
				Missing required variables: {missingRequired.join(', ')}
			</div>
		{/if}

		<pre class="text-sm whitespace-pre-wrap">{preview.content}</pre>
	</Card>
</div>
```

### Integration with Existing Frontmatter

```yaml
# Example prompt with snippet variables in frontmatter
temperature: 0.7
variables:
  - name: CONTEXT
    description: User context or background
    required: true
  - name: TASK
    description: The task to perform
    required: true
  - name: OUTPUT_FORMAT
    description: Desired output format
    default: markdown
    required: false
```

### Anti-Patterns to Avoid

- **Using `eval()` or `Function()` for templating** - Security nightmare
- **Unescaped variable values** - Allows users to inject new placeholders
- **Blocking UI during preview** - Must be instant via `$derived`
- **Server-side preview for every keystroke** - Do it client-side

## Don't Hand-Roll

| Problem             | Don't Build           | Use Instead                         | Why                                |
| ------------------- | --------------------- | ----------------------------------- | ---------------------------------- |
| Variable extraction | Custom string parsing | Regex `/{{\s*([A-Za-z_]\w*)\s*}}/g` | Handles edge cases, whitespace     |
| Variable validation | Custom validation     | Zod schema with regex               | Consistent error messages          |
| YAML parsing        | Custom parser         | Existing `yaml` package             | Already in use, handles edge cases |
| Reactive preview    | Manual state sync     | Svelte 5 `$derived`                 | Automatic, performant              |
| HTML escaping       | Custom escaping       | Svelte auto-escapes in templates    | Built-in XSS protection            |

**Key insight:** Variable injection security is about preventing `{{` and `}}` in values from being interpreted as new placeholders. Escape them or the preview will show malformed content.

## Common Pitfalls

### Pitfall 1: Variable Injection Attacks

**What goes wrong:** User enters `{{MALICIOUS}}` as variable value, which gets processed as a new placeholder
**Why it happens:** Not escaping curly braces in user input
**How to avoid:** Always call `escapeVariableValue()` before insertion
**Warning signs:** Preview shows unexpected `{{...}}` patterns

### Pitfall 2: Stale Preview on Rapid Typing

**What goes wrong:** Preview lags behind input, shows wrong values
**Why it happens:** Using async/debounced preview instead of reactive
**How to avoid:** Use `$derived` for instant synchronous preview
**Warning signs:** Typing feels sluggish, preview doesn't match inputs

### Pitfall 3: Missing Variables Not Highlighted

**What goes wrong:** User executes with missing required variables
**Why it happens:** Not checking required flag, or unclear error display
**How to avoid:** Show clear error badge and list of missing vars
**Warning signs:** Users confused why preview looks wrong

### Pitfall 4: Inconsistent Variable Names

**What goes wrong:** `{{TASK}}` in template, `task` in frontmatter definition
**Why it happens:** Case sensitivity not enforced
**How to avoid:** Use uppercase convention, validate at parse time
**Warning signs:** "Variable not found" despite being defined

### Pitfall 5: Regex Reset Bug

**What goes wrong:** Second call to extractVariables returns empty array
**Why it happens:** Not resetting `lastIndex` on global regex
**How to avoid:** Set `regex.lastIndex = 0` before each use, or create new regex
**Warning signs:** Intermittent failures in extraction

## Code Examples

### Variable Extraction with Deduplication

```typescript
// Source: Standard mustache pattern
const VARIABLE_REGEX = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g;

function extractUniqueVariables(content: string): string[] {
	const seen = new Set<string>();
	let match: RegExpExecArray | null;
	const regex = new RegExp(VARIABLE_REGEX.source, 'g');

	while ((match = regex.exec(content)) !== null) {
		seen.add(match[1]);
	}

	return [...seen];
}
```

### Client-Side Preview Function

```typescript
// Pure function for client-side preview (no server calls)
export function createPreview(template: string, values: Record<string, string>): string {
	return template.replace(/{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g, (_, name) => {
		if (name in values) {
			// Escape braces in value to prevent injection
			return values[name].replace(/\{/g, '\\{').replace(/\}/g, '\\}');
		}
		// Return placeholder as-is for missing vars
		return `{{${name}}}`;
	});
}
```

### Frontmatter Integration Pattern

```typescript
// Extend existing parseFrontmatterYaml in frontmatter.ts
export interface SnippetConfig {
	variables?: SnippetVariable[];
}

export function parseSnippetFrontmatter(
	frontmatterYaml: string | null | undefined
): FrontmatterParseResult & { snippet: SnippetConfig } {
	const base = parseFrontmatterYaml(frontmatterYaml);
	const snippet: SnippetConfig = {};

	if (base.extras.variables && Array.isArray(base.extras.variables)) {
		const result = snippetFrontmatterSchema.safeParse({ variables: base.extras.variables });
		if (result.success) {
			snippet.variables = result.data.variables;
		}
		delete base.extras.variables;
	}

	return { ...base, snippet };
}
```

## State of the Art

| Old Approach           | Current Approach             | When Changed   | Impact                    |
| ---------------------- | ---------------------------- | -------------- | ------------------------- |
| Server-side templating | Client-side reactive preview | Svelte 5 runes | Instant feedback          |
| Custom template syntax | Mustache `{{VAR}}` standard  | Widely adopted | Familiar, well-documented |
| Debounced preview      | Real-time `$derived`         | Svelte 5       | No typing lag             |
| Manual regex escaping  | Built-in value escaping      | Security best  | Prevents injection        |

**Deprecated/outdated:**

- Handlebars/Nunjucks for simple variables: Overkill, adds complexity
- Server-side preview API: Unnecessary latency
- Custom template syntax: Use established `{{VAR}}` convention

## Open Questions

1. **Variable storage location?**
   - What we know: Variables can be in frontmatter YAML or deduced from template
   - What's unclear: Should we store extracted vars separately for faster lookup?
   - Recommendation: Extract on-demand from template + frontmatter. Cache in memory if performance issue.

2. **Default value precedence?**
   - What we know: Variables can have defaults in frontmatter
   - What's unclear: Should there be a global defaults source?
   - Recommendation: Use frontmatter defaults only. Keep it simple.

3. **Variable type coercion?**
   - What we know: All values are strings currently
   - What's unclear: Should we support numbers, booleans in variable values?
   - Recommendation: Keep as strings. Convert at execution time if needed.

4. **Nested variable references?**
   - What we know: `{{VAR}}` gets replaced with value
   - What's unclear: Should `{{VAR1_{{VAR2}}}}` be supported?
   - Recommendation: No nested variables. Too complex, security risk.

## Key Decisions for Planner

1. **Variable syntax** - Use `{{VAR_NAME}}` (uppercase convention)
2. **Variable name pattern** - `[A-Za-z_][A-Za-z0-9_]*` (alphanumeric + underscore)
3. **Escaping strategy** - Escape `{` → `\{` and `}` → `\}` in values
4. **Preview location** - Client-side only, no server round-trip
5. **Missing var display** - Keep `{{VAR}}` in output, show error badge
6. **Storage** - Variables defined in frontmatter `variables:` array

## Implementation Notes

### Plan 04-01: Snippet Variable Syntax and Frontmatter Parsing

1. Add `SnippetVariable` type and Zod schema
2. Extend `parseFrontmatterYaml` to extract `variables:` section
3. Create `extractVariables()` function with regex
4. Add unit tests for extraction and edge cases
5. Document variable naming conventions

### Plan 04-02: Variable Replacement Service with Escaping

1. Create `escapeVariableValue()` for security
2. Create `resolveVariables()` for replacement
3. Handle missing variables (return placeholder, track missing list)
4. Add unit tests for:
   - Basic replacement
   - Value escaping (`{{` in values)
   - Missing required variables
   - Empty/whitespace handling

### Plan 04-03: Live Preview Component

1. Create `snippet-preview.svelte` component
2. Use `$derived` for instant preview
3. Show variable inputs for each detected var
4. Display error badge for missing required vars
5. Integrate with existing prompt editor
6. Add E2E tests for:
   - Typing updates preview instantly
   - Missing vars show error
   - Injection attempts are escaped

## Sources

### Primary (HIGH confidence)

- Context7 `/websites/svelte_dev` - Svelte 5 runes ($state, $derived, $effect)
- Context7 `/eemeli/yaml` - YAML parsing API
- Existing codebase - frontmatter.ts, yaml.ts patterns

### Secondary (MEDIUM confidence)

- WebSearch verified: Mustache template injection prevention patterns
- WebSearch verified: JavaScript regex for variable extraction

### Tertiary (LOW confidence)

- None required - patterns well-established

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing libraries (yaml, Svelte 5, Zod)
- Architecture: HIGH - Mustache pattern is industry standard
- Security: HIGH - Escaping pattern well-documented
- Pitfalls: HIGH - Common issues well-known in templating

**Research date:** 2026-02-26
**Valid until:** 30 days (stable patterns)
