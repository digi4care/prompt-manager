import { describe, it, expect } from 'vitest';
import { extractVariables } from '$lib/utils/snippet-variables';
import { parseSnippetFrontmatter } from '$lib/opencode/frontmatter';

describe('extractVariables', () => {
	it('extracts single variable', () => {
		const result = extractVariables('Hello {{NAME}}');
		expect(result).toEqual([{ name: 'NAME', startIndex: 6, endIndex: 14 }]);
	});

	it('extracts multiple variables', () => {
		const result = extractVariables('{{FIRST}} and {{SECOND}}');
		expect(result.map((v) => v.name)).toEqual(['FIRST', 'SECOND']);
	});

	it('handles whitespace around variable name', () => {
		const result = extractVariables('{{  SPACED  }}');
		expect(result).toEqual([{ name: 'SPACED', startIndex: 0, endIndex: 14 }]);
	});

	it('deduplicates variables', () => {
		const result = extractVariables('{{NAME}} {{NAME}}');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('NAME');
	});

	it('returns empty array for no variables', () => {
		expect(extractVariables('No variables here')).toEqual([]);
	});

	it('does not match invalid variable names', () => {
		expect(extractVariables('{{1INVALID}}')).toEqual([]);
		expect(extractVariables('{{}}')).toEqual([]);
	});
});

describe('parseSnippetFrontmatter', () => {
	it('parses variables section', () => {
		const yaml = `
variables:
  - name: CONTEXT
    description: User context
    required: true
  - name: FORMAT
    default: markdown
    required: false
`;
		const result = parseSnippetFrontmatter(yaml);
		expect(result.variables).toHaveLength(2);
		expect(result.variables[0].name).toBe('CONTEXT');
		expect(result.variables[1].default).toBe('markdown');
	});

	it('returns empty array when no variables', () => {
		const result = parseSnippetFrontmatter('temperature: 0.7');
		expect(result.variables).toEqual([]);
	});

	it('skips invalid variable definitions', () => {
		const yaml = `
variables:
  - name: VALID
    required: true
  - name: "1INVALID"
    required: true
`;
		const result = parseSnippetFrontmatter(yaml);
		expect(result.variables).toHaveLength(1);
		expect(result.variables[0].name).toBe('VALID');
	});
});
