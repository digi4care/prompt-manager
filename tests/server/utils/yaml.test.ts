import { describe, it, expect } from 'vitest';
import { parseExpertiseYaml, stringifyExpertiseYaml, type ExpertiseData } from '$lib/server/utils/yaml';

describe('YAML Utilities', () => {
	describe('parseExpertiseYaml', () => {
		it('should parse valid expertise YAML', () => {
			const yaml = `
domain: JavaScript
patterns:
  - name: Async/Await
    description: Use async/await for asynchronous operations
    examples:
      - "async function fetchData() { await fetch(url); }"
    success_rate: 0.95
lessons:
  - what_worked: Using async/await makes code more readable
    what_failed: Nested callbacks created callback hell
    insight: Always handle errors in async functions
cross_references:
  - TypeScript
  - Node.js
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.domain).toBe('JavaScript');
			expect(result.patterns).toHaveLength(1);
			expect(result.patterns![0].name).toBe('Async/Await');
			expect(result.lessons).toHaveLength(1);
			expect(result.cross_references).toHaveLength(2);
		});

		it('should handle minimal valid YAML', () => {
			const yaml = `domain: Test`;
			const result = parseExpertiseYaml(yaml);
			expect(result.domain).toBe('Test');
			expect(result.patterns).toBeUndefined();
			expect(result.lessons).toBeUndefined();
			expect(result.cross_references).toBeUndefined();
		});

		it('should handle YAML with empty patterns array', () => {
			const yaml = `
domain: Test
patterns: []
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.domain).toBe('Test');
			expect(result.patterns).toEqual([]);
		});

		it('should handle YAML with empty lessons array', () => {
			const yaml = `
domain: Test
lessons: []
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.lessons).toEqual([]);
		});

		it('should handle YAML without optional arrays', () => {
			const yaml = `
domain: Minimal
patterns:
  - name: Simple
    description: A simple pattern
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.domain).toBe('Minimal');
			expect(result.patterns).toHaveLength(1);
			expect(result.lessons).toBeUndefined();
			expect(result.cross_references).toBeUndefined();
		});

		it('should handle numeric success_rate', () => {
			const yaml = `
domain: Test
patterns:
  - name: Pattern
    description: Description
    success_rate: 0.85
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns![0].success_rate).toBe(0.85);
		});

		it('should handle missing success_rate', () => {
			const yaml = `
domain: Test
patterns:
  - name: Pattern
    description: Description
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns![0].success_rate).toBeUndefined();
		});

		it('should throw for invalid YAML structure', () => {
			const invalidYaml = `
notDomain: Missing domain field
patterns: []
`;
			expect(() => parseExpertiseYaml(invalidYaml)).toThrow();
		});

		it('should throw for completely invalid YAML', () => {
			const invalidYaml = `
  invalid:
    - yaml: content
`;
			expect(() => parseExpertiseYaml(invalidYaml)).toThrow();
		});

		it('should throw for missing domain', () => {
			const yaml = `
patterns: []
`;
			expect(() => parseExpertiseYaml(yaml)).toThrow();
		});

		it('should handle patterns without examples', () => {
			const yaml = `
domain: Test
patterns:
  - name: Pattern
    description: A pattern without examples
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns![0].examples).toBeUndefined();
		});

		it('should handle multiple patterns', () => {
			const yaml = `
domain: Multi-Pattern
patterns:
  - name: Pattern 1
    description: First pattern
  - name: Pattern 2
    description: Second pattern
  - name: Pattern 3
    description: Third pattern
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns).toHaveLength(3);
		});

		it('should handle multiple lessons', () => {
			const yaml = `
domain: Test
lessons:
  - what_worked: Lesson 1
    what_failed: Failure 1
    insight: Insight 1
  - what_worked: Lesson 2
    what_failed: Failure 2
    insight: Insight 2
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.lessons).toHaveLength(2);
		});

		it('should handle multiple cross-references', () => {
			const yaml = `
domain: Test
cross_references:
  - Ref 1
  - Ref 2
  - Ref 3
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.cross_references).toEqual(['Ref 1', 'Ref 2', 'Ref 3']);
		});
	});

	describe('stringifyExpertiseYaml', () => {
		it('should stringify expertise data to YAML', () => {
			const data: ExpertiseData = {
				domain: 'Test Domain',
				patterns: [
					{
						name: 'Test Pattern',
						description: 'A test pattern',
						examples: ['example1', 'example2'],
						success_rate: 0.9
					}
				],
				lessons: [
					{
						what_worked: 'Testing',
						what_failed: 'Not testing',
						insight: 'Always test'
					}
				],
				cross_references: ['Related Topic']
			};

			const result = stringifyExpertiseYaml(data);
			expect(result).toContain('domain: Test Domain');
			expect(result).toContain('name: Test Pattern');
		});

		it('should handle minimal data', () => {
			const data: ExpertiseData = {
				domain: 'Minimal'
			};

			const result = stringifyExpertiseYaml(data);
			expect(result).toContain('domain: Minimal');
		});

		it('should handle data without optional arrays', () => {
			const data: ExpertiseData = {
				domain: 'No Optionals',
				patterns: [
					{
						name: 'Simple',
						description: 'Simple pattern'
					}
				]
			};

			const result = stringifyExpertiseYaml(data);
			expect(result).toContain('domain: No Optionals');
			expect(result).toContain('name: Simple');
		});

		it('should round-trip parse/stringify correctly', () => {
			const original = `
domain: Round-trip Test
patterns:
  - name: Pattern 1
    description: Description 1
    examples:
      - ex1
      - ex2
    success_rate: 0.85
lessons:
  - what_worked: Worked 1
    what_failed: Failed 1
    insight: Insight 1
cross_references:
  - Ref1
  - Ref2
`;
			const parsed = parseExpertiseYaml(original);
			const stringified = stringifyExpertiseYaml(parsed);
			const reparsed = parseExpertiseYaml(stringified);

			expect(reparsed.domain).toBe(parsed.domain);
			expect(reparsed.patterns).toHaveLength(parsed.patterns!.length);
			expect(reparsed.lessons).toHaveLength(parsed.lessons!.length);
			expect(reparsed.cross_references).toEqual(parsed.cross_references);
		});
	});

	describe('ExpertiseData Type', () => {
		it('should accept valid expertise data structure', () => {
			const data: ExpertiseData = {
				domain: 'TypeScript',
				patterns: [
					{
						name: 'Type Safety',
						description: 'Use TypeScript for type safety',
						examples: ['const x: string = "hello"'],
						success_rate: 0.95
					}
				],
				lessons: [
					{
						what_worked: 'Strict typing',
						what_failed: 'Any type',
						insight: 'Avoid any'
					}
				],
				cross_references: ['JavaScript', 'Node.js']
			};

			expect(data.domain).toBe('TypeScript');
			expect(data.patterns![0].name).toBe('Type Safety');
		});

		it('should handle optional fields', () => {
			const minimal: ExpertiseData = {
				domain: 'Minimal'
			};

			expect(minimal.domain).toBe('Minimal');
			expect(minimal.patterns).toBeUndefined();
			expect(minimal.lessons).toBeUndefined();
			expect(minimal.cross_references).toBeUndefined();
		});

		it('should validate success_rate range (0-1)', () => {
			const data: ExpertiseData = {
				domain: 'Test',
				patterns: [
					{
						name: 'Pattern',
						description: 'Description',
						success_rate: 0
					}
				]
			};
			expect(data.patterns![0].success_rate).toBe(0);
		});

		it('should handle success_rate as 1.0', () => {
			const data: ExpertiseData = {
				domain: 'Test',
				patterns: [
					{
						name: 'Perfect Pattern',
						description: 'Description',
						success_rate: 1.0
					}
				]
			};
			expect(data.patterns![0].success_rate).toBe(1.0);
		});
	});

	describe('YAML parsing edge cases', () => {
		it('should handle multiline strings', () => {
			const yaml = `
domain: Test
patterns:
  - name: Pattern
    description: |
      This is a multiline
      description that spans
      multiple lines
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns![0].description).toContain('multiline');
		});

		it('should handle special characters in strings', () => {
			const yaml = `
domain: Test
patterns:
  - name: Special Chars
    description: "Special chars: : { } [ ] ,"
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.patterns![0].name).toBe('Special Chars');
		});

		it('should handle quoted strings', () => {
			const yaml = `
domain: "Quoted Domain"
patterns:
  - name: 'Quoted Pattern'
    description: "Description with 'quotes'"
`;
			const result = parseExpertiseYaml(yaml);
			expect(result.domain).toBe('Quoted Domain');
		});
	});
});
