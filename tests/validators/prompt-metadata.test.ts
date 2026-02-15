// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
	promptMetadataSchema,
	validatePromptMetadata,
	validateField,
	type PromptMetadataData
} from '$lib/validators/prompt-metadata';

describe('promptMetadataSchema', () => {
	describe('title validation', () => {
		it('should accept valid title', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should reject empty title', () => {
			const result = promptMetadataSchema.safeParse({
				title: '',
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('title');
			}
		});

		it('should reject title over 100 characters', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'a'.repeat(101),
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(false);
		});

		it('should accept title at max length', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'a'.repeat(100),
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should trim whitespace from title', () => {
			const result = promptMetadataSchema.safeParse({
				title: '  My Prompt  ',
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe('My Prompt');
			}
		});
	});

	describe('description validation', () => {
		it('should accept empty description', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should reject description over 500 characters', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: 'b'.repeat(501),
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(false);
		});

		it('should accept description at max length', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: 'b'.repeat(500),
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
		});
	});

	describe('purpose validation', () => {
		it('should accept valid purpose values', () => {
			const validPurposes = ['development', 'writing', 'analysis', 'creative', 'general', ''];

			for (const purpose of validPurposes) {
				const result = promptMetadataSchema.safeParse({
					title: 'My Prompt',
					description: '',
					purpose,
					tags: [],
					platform: ''
				});
				expect(result.success).toBe(true);
			}
		});

		it('should reject invalid purpose value', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				purpose: 'invalid-purpose',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(false);
		});
	});

	describe('tags validation', () => {
		it('should accept empty tags array', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: [],
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should accept valid tags', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: ['javascript', 'typescript', 'react'],
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should reject more than 20 tags', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: Array(21).fill('tag'),
				platform: ''
			});
			expect(result.success).toBe(false);
		});

		it('should accept exactly 20 tags', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: Array(20).fill('tag'),
				platform: ''
			});
			expect(result.success).toBe(true);
		});

		it('should reject tag over 50 characters', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: ['c'.repeat(51)],
				platform: ''
			});
			expect(result.success).toBe(false);
		});
	});

	describe('platform validation', () => {
		it('should accept valid platform values', () => {
			const validPlatforms = ['claude', 'gpt-4', 'gpt-3.5', 'gemini', 'llama', 'other', ''];

			for (const platform of validPlatforms) {
				const result = promptMetadataSchema.safeParse({
					title: 'My Prompt',
					description: '',
					tags: [],
					platform
				});
				expect(result.success).toBe(true);
			}
		});

		it('should reject invalid platform value', () => {
			const result = promptMetadataSchema.safeParse({
				title: 'My Prompt',
				description: '',
				tags: [],
				platform: 'invalid-platform'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('complete valid object', () => {
		it('should accept complete valid metadata', () => {
			const validData: PromptMetadataData = {
				title: 'My AI Prompt',
				description: 'A comprehensive prompt for AI interactions',
				purpose: 'development',
				tags: ['javascript', 'api', 'claude'],
				platform: 'claude'
			};

			const result = promptMetadataSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});
	});
});

describe('validatePromptMetadata', () => {
	it('should return success for valid data', () => {
		const result = validatePromptMetadata({
			title: 'My Prompt',
			description: 'Description',
			tags: [],
			platform: ''
		});

		expect(result.success).toBe(true);
		expect(result.errors).toEqual({});
		expect(result.data).not.toBeNull();
	});

	it('should return errors for invalid data', () => {
		const result = validatePromptMetadata({
			title: '',
			description: '',
			tags: [],
			platform: ''
		});

		expect(result.success).toBe(false);
		expect(result.errors.title).toBeDefined();
		expect(result.data).toBeNull();
	});

	it('should collect all validation errors', () => {
		const result = validatePromptMetadata({
			title: '',
			description: 'c'.repeat(600), // Over 500 chars
			tags: Array(25).fill('tag'), // Over 20 tags
			platform: 'invalid'
		});

		expect(result.success).toBe(false);
		// Should have multiple errors
		expect(Object.keys(result.errors).length).toBeGreaterThan(0);
	});
});

describe('validateField', () => {
	it('should return null for valid title', () => {
		const error = validateField('title', 'Valid Title');
		expect(error).toBeNull();
	});

	it('should return error for empty title', () => {
		const error = validateField('title', '');
		expect(error).not.toBeNull();
	});

	it('should return null for valid description', () => {
		const error = validateField('description', 'A short description');
		expect(error).toBeNull();
	});

	it('should return error for description over 500 chars', () => {
		const error = validateField('description', 'd'.repeat(501));
		expect(error).not.toBeNull();
	});

	it('should return null for valid tags array', () => {
		const error = validateField('tags', ['tag1', 'tag2']);
		expect(error).toBeNull();
	});

	it('should return error for tags over limit', () => {
		const error = validateField('tags', Array(25).fill('tag'));
		expect(error).not.toBeNull();
	});

	it('should return null for valid purpose', () => {
		const error = validateField('purpose', 'development');
		expect(error).toBeNull();
	});

	it('should return error for invalid purpose', () => {
		const error = validateField('purpose', 'invalid');
		expect(error).not.toBeNull();
	});

	it('should return null for valid platform', () => {
		const error = validateField('platform', 'claude');
		expect(error).toBeNull();
	});

	it('should return error for invalid platform', () => {
		const error = validateField('platform', 'invalid');
		expect(error).not.toBeNull();
	});

	it('should return null for unknown field', () => {
		const error = validateField('unknown' as keyof PromptMetadataData, 'value');
		expect(error).toBeNull();
	});
});
