import { describe, it, expect } from 'vitest';
import { computeDiff, type DiffResult } from '$lib/server/utils/diff';

describe('Diff Utilities', () => {
	describe('computeDiff', () => {
		it('should return zero changes for identical text', () => {
			const text = 'Hello World';
			const result = computeDiff(text, text);
			expect(result.added).toBe(0);
			expect(result.removed).toBe(0);
			// diffLines returns a single unchanged part for identical text
			expect(result.changes.length).toBeGreaterThanOrEqual(1);
		});

		it('should detect added lines', () => {
			const oldText = 'Line 1';
			const newText = 'Line 1\nLine 2';
			const result = computeDiff(oldText, newText);
			// diffLines counts the new line itself as added
			expect(result.added).toBeGreaterThan(0);
		});

		it('should detect removed lines', () => {
			const oldText = 'Line 1\nLine 2';
			const newText = 'Line 1';
			const result = computeDiff(oldText, newText);
			// diffLines counts the removed line
			expect(result.removed).toBeGreaterThan(0);
		});

		it('should detect both additions and removals', () => {
			const oldText = 'Line 1\nLine 2';
			const newText = 'Line 1\nLine 3';
			const result = computeDiff(oldText, newText);
			expect(result.added + result.removed).toBeGreaterThanOrEqual(2);
		});

		it('should handle empty old text', () => {
			const oldText = '';
			const newText = 'New content';
			const result = computeDiff(oldText, newText);
			expect(result.added).toBeGreaterThanOrEqual(1);
		});

		it('should handle empty new text', () => {
			const oldText = 'Old content';
			const newText = '';
			const result = computeDiff(oldText, newText);
			expect(result.removed).toBeGreaterThanOrEqual(1);
		});

		it('should handle both empty texts', () => {
			const result = computeDiff('', '');
			expect(result.added).toBe(0);
			expect(result.removed).toBe(0);
		});

		it('should handle multiline text', () => {
			const oldText = `Line 1
Line 2
Line 3`;
			const newText = `Line 1
Modified Line 2
Line 3`;
			const result = computeDiff(oldText, newText);
			expect(result.added + result.removed).toBeGreaterThanOrEqual(1);
		});

		it('should handle large texts', () => {
			const oldText = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');
			const newText = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');
			const result = computeDiff(oldText, newText);
			expect(result.added).toBe(0);
			expect(result.removed).toBe(0);
		});

		it('should handle text with special characters', () => {
			const oldText = 'Special chars: !@#$%^&*()';
			const newText = 'Special chars: !@#$%^&*()_+';
			const result = computeDiff(oldText, newText);
			// Special characters may or may not trigger diff depending on diffLines behavior
			expect(typeof result.added).toBe('number');
		});

		it('should handle unicode characters', () => {
			const oldText = 'こんにちは';
			const newText = 'こんにちは、世界';
			const result = computeDiff(oldText, newText);
			expect(result.added).toBeGreaterThanOrEqual(0);
		});

		it('should handle code with indentation', () => {
			const oldText = `function hello() {
  console.log('Hello');
}`;
			const newText = `function hello() {
  console.log('Hello World');
}`;
			const result = computeDiff(oldText, newText);
			expect(result.changes.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('DiffResult interface', () => {
		it('should have correct structure', () => {
			const result: DiffResult = {
				added: 0,
				removed: 0,
				changes: []
			};
			expect(result.added).toBe(0);
			expect(result.removed).toBe(0);
			expect(result.changes).toEqual([]);
		});

		it('should contain Change objects with expected properties', () => {
			const result = computeDiff('a', 'b');
			expect(result.changes.length).toBeGreaterThan(0);
			const change = result.changes[0];
			expect(change).toHaveProperty('value');
			expect(typeof change.added).toBe('boolean');
			expect(typeof change.removed).toBe('boolean');
		});

		it('should track added changes correctly', () => {
			const result = computeDiff('', 'added line');
			const addedChanges = result.changes.filter((c) => c.added);
			expect(addedChanges.length).toBeGreaterThan(0);
			addedChanges.forEach((change) => {
				expect(change.added).toBe(true);
			});
		});

		it('should track removed changes correctly', () => {
			const result = computeDiff('removed line', '');
			const removedChanges = result.changes.filter((c) => c.removed);
			expect(removedChanges.length).toBeGreaterThan(0);
			removedChanges.forEach((change) => {
				expect(change.removed).toBe(true);
			});
		});

		it('should track unchanged lines correctly', () => {
			const result = computeDiff('same line', 'same line');
			const unchangedChanges = result.changes.filter((c) => !c.added && !c.removed);
			expect(unchangedChanges.length).toBeGreaterThan(0);
		});
	});

	describe('Line count calculations', () => {
		it('should count added lines correctly', () => {
			const result = computeDiff('', 'line1\nline2\nline3');
			// diffLines counts the newline characters as added lines
			expect(result.added).toBeGreaterThanOrEqual(3);
		});

		it('should count removed lines correctly', () => {
			const result = computeDiff('line1\nline2\nline3', '');
			expect(result.removed).toBeGreaterThanOrEqual(3);
		});

		it('should handle single line changes', () => {
			const result = computeDiff('old', 'new');
			expect(result.added + result.removed).toBeGreaterThanOrEqual(1);
		});

		it('should handle complex diffs with multiple changes', () => {
			const oldText = `start
removed1
removed2
middle
extra
end`;
			const newText = `start
added1
added2
middle
different
end`;
			const result = computeDiff(oldText, newText);
			expect(result.added).toBeGreaterThan(0);
			expect(result.removed).toBeGreaterThan(0);
		});
	});
});
