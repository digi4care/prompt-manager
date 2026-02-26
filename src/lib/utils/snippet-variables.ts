import { z } from 'zod';

/**
 * Regex pattern for matching {{VAR_NAME}} placeholders in content
 * - Allows whitespace around variable name: {{  NAME  }}
 * - Variable names must start with letter or underscore
 * - Followed by letters, numbers, or underscores
 */
export const VARIABLE_REGEX = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g;

/**
 * Zod schema for validating variable definitions
 */
export const SnippetVariableSchema = z.object({
	name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Invalid variable name'),
	description: z.string().optional(),
	default: z.string().optional(),
	required: z.boolean().default(true)
});

/**
 * Type for a snippet variable definition from frontmatter
 */
export type SnippetVariable = z.infer<typeof SnippetVariableSchema>;

/**
 * Type for an extracted variable from template content
 */
export interface ExtractedVariable {
	/** Variable name without {{ }} */
	name: string;
	/** Start index in original content */
	startIndex: number;
	/** End index in original content (exclusive) */
	endIndex: number;
}

/**
 * Extract all unique {{VAR}} placeholders from content
 *
 * @param content - Template content containing {{VAR}} placeholders
 * @returns Array of extracted variables with positions (deduplicated by name)
 *
 * @example
 * extractVariables('Hello {{NAME}}') // [{ name: 'NAME', startIndex: 6, endIndex: 14 }]
 * extractVariables('{{FIRST}} and {{SECOND}}') // [{ name: 'FIRST', ... }, { name: 'SECOND', ... }]
 * extractVariables('{{  SPACED  }}') // [{ name: 'SPACED', startIndex: 0, endIndex: 14 }]
 * extractVariables('{{NAME}} {{NAME}}') // [{ name: 'NAME', ... }] (deduplicated)
 * extractVariables('{{1INVALID}}') // [] (invalid name)
 */
export function extractVariables(content: string): ExtractedVariable[] {
	const variables: ExtractedVariable[] = [];
	const seen = new Set<string>();
	const regex = new RegExp(VARIABLE_REGEX.source, 'g');

	let match = regex.exec(content);
	while (match !== null) {
		if (!seen.has(match[1])) {
			seen.add(match[1]);
			variables.push({
				name: match[1],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}
		match = regex.exec(content);
	}

	return variables;
}

/**
 * Escape {{ and }} in user-provided values to prevent injection
 * Mustache-style security: prevent users from creating new placeholders
 *
 * @param value - User input that may contain {{ or }} characters
 * @returns Escaped string with braces neutralized
 *
 * @example
 * escapeVariableValue('{{DANGER}}') // '\\{\\{DANGER\\}\\}'
 * escapeVariableValue('normal text') // 'normal text'
 */
export function escapeVariableValue(value: string): string {
	return value.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

/**
 * Result of variable resolution
 */
export interface ResolveResult {
	/** Content with variables replaced */
	content: string;
	/** Names of required variables that were missing */
	missingVariables: string[];
	/** True if any required variables were missing */
	hasErrors: boolean;
}

/**
 * Variable values map (name -> value)
 */
export interface VariableValues {
	[name: string]: string;
}

/**
 * Replace {{VAR}} placeholders with values
 * - Escapes {{ and }} in values to prevent injection
 * - Returns list of missing required variables
 * - Keeps original placeholders for missing vars in output
 *
 * @param template - Template content with {{VAR}} placeholders
 * @param values - Map of variable names to their values
 * @param definitions - Optional variable definitions for required/optional status
 * @returns Resolution result with content and missing variable info
 *
 * @example
 * resolveVariables('Hello {{NAME}}', { NAME: 'World' })
 * // { content: 'Hello World', missingVariables: [], hasErrors: false }
 *
 * resolveVariables('Hello {{NAME}}', {}, [{ name: 'NAME', required: true }])
 * // { content: 'Hello {{NAME}}', missingVariables: ['NAME'], hasErrors: true }
 */
export function resolveVariables(
	template: string,
	values: VariableValues,
	definitions?: SnippetVariable[]
): ResolveResult {
	const missingVariables: string[] = [];

	// Build set of required variable names from definitions
	const requiredVars = new Set(
		definitions?.filter((v) => v.required !== false).map((v) => v.name) || []
	);

	// Collect all variable names in template
	const templateVars = new Set<string>();
	const regex = new RegExp(VARIABLE_REGEX.source, 'g');

	let match = regex.exec(template);
	while (match !== null) {
		templateVars.add(match[1]);
		match = regex.exec(template);
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
