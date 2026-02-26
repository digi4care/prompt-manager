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
