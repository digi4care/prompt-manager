import { describe, it, expect } from 'vitest';
import {
	extractVariables,
	escapeVariableValue,
	resolveVariables,
	type SnippetVariable
} from '$lib/utils/snippet-variables';
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

describe('escapeVariableValue', () => {
	it('escapes opening braces', () => {
		expect(escapeVariableValue('{{DANGER}}')).toBe('\\{\\{DANGER\\}\\}');
	});

	it('escapes single braces', () => {
		expect(escapeVariableValue('a { b } c')).toBe('a \\{ b \\} c');
	});

	it('returns plain text unchanged', () => {
		expect(escapeVariableValue('normal text')).toBe('normal text');
	});

	it('handles empty string', () => {
		expect(escapeVariableValue('')).toBe('');
	});
});

describe('resolveVariables', () => {
	it('replaces single variable', () => {
		const result = resolveVariables('Hello {{NAME}}', { NAME: 'World' });
		expect(result.content).toBe('Hello World');
		expect(result.missingVariables).toEqual([]);
		expect(result.hasErrors).toBe(false);
	});

	it('replaces multiple variables', () => {
		const result = resolveVariables('{{A}} and {{B}}', { A: 'X', B: 'Y' });
		expect(result.content).toBe('X and Y');
	});

	it('keeps placeholder for missing variables', () => {
		const result = resolveVariables('Hello {{NAME}}', {});
		expect(result.content).toBe('Hello {{NAME}}');
	});

	it('tracks missing required variables', () => {
		const definitions: SnippetVariable[] = [{ name: 'NAME', required: true }];
		const result = resolveVariables('Hello {{NAME}}', {}, definitions);
		expect(result.missingVariables).toEqual(['NAME']);
		expect(result.hasErrors).toBe(true);
	});

	it('does not track missing optional variables', () => {
		const definitions: SnippetVariable[] = [{ name: 'NAME', required: false }];
		const result = resolveVariables('Hello {{NAME}}', {}, definitions);
		expect(result.missingVariables).toEqual([]);
		expect(result.hasErrors).toBe(false);
	});

	it('escapes injection attempts', () => {
		const result = resolveVariables('Value: {{X}}', { X: '{{INJECT}}' });
		expect(result.content).toBe('Value: \\{\\{INJECT\\}\\}');
		expect(result.content).not.toContain('{{INJECT}}');
	});

	it('handles variables with whitespace', () => {
		const result = resolveVariables('{{  NAME  }}', { NAME: 'value' });
		expect(result.content).toBe('value');
	});
});
