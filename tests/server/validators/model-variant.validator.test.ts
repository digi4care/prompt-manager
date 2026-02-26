import { describe, expect, it } from 'vitest';

import {
	validateModelVariantScope,
	validateModelVariantScopeOrThrow,
	type CatalogData,
	type PolicyData,
	ModelVariantValidationError
} from '$lib/server/validators/model-variant.validator';

const catalog: CatalogData = {
	providers: [
		{
			id: 'openai',
			name: 'OpenAI',
			connected: true,
			models: [
				{
					id: 'gpt-4o-mini',
					name: 'GPT-4o mini',
					providerId: 'openai',
					variants: [{ id: 'low' }, { id: 'high' }]
				}
			]
		}
	]
};

const basePolicy: PolicyData = {
	allowedModels: ['openai/gpt-4o-mini'],
	allowedVariants: {
		'openai/gpt-4o-mini': ['low', 'high']
	}
};

describe('model-variant.validator', () => {
	it('returns VARIANT_REQUIRED when multiple variants are allowed and none is provided', () => {
		const result = validateModelVariantScope({
			modelId: 'openai/gpt-4o-mini',
			scope: 'improve',
			policy: basePolicy,
			catalog
		});

		expect(result.valid).toBe(false);
		expect(result.error?.code).toBe('VARIANT_REQUIRED');
		expect(result.resolved?.availableVariants).toEqual(['low', 'high']);
	});

	it('returns VARIANT_NOT_ALLOWED when provided variant is outside policy allowlist', () => {
		const restrictivePolicy: PolicyData = {
			allowedModels: ['openai/gpt-4o-mini'],
			allowedVariants: {
				'openai/gpt-4o-mini': ['low']
			}
		};

		const result = validateModelVariantScope({
			modelId: 'openai/gpt-4o-mini',
			modelVariant: 'high',
			scope: 'executor',
			policy: restrictivePolicy,
			catalog
		});

		expect(result.valid).toBe(false);
		expect(result.error?.code).toBe('VARIANT_NOT_ALLOWED');
	});

	it('returns VARIANT_NOT_AVAILABLE when variant is not present in catalog', () => {
		const result = validateModelVariantScope({
			modelId: 'openai/gpt-4o-mini',
			modelVariant: 'ultra',
			scope: 'judge',
			policy: basePolicy,
			catalog
		});

		expect(result.valid).toBe(false);
		expect(result.error?.code).toBe('VARIANT_NOT_AVAILABLE');
	});

	it('returns MODEL_NOT_ALLOWED when model is outside policy allowlist', () => {
		const disallowPolicy: PolicyData = {
			allowedModels: ['anthropic/claude-3-5-sonnet'],
			allowedVariants: {}
		};

		const result = validateModelVariantScope({
			modelId: 'openai/gpt-4o-mini',
			modelVariant: 'low',
			scope: 'council',
			policy: disallowPolicy,
			catalog
		});

		expect(result.valid).toBe(false);
		expect(result.error?.code).toBe('MODEL_NOT_ALLOWED');
	});

	it('throws ModelVariantValidationError with code and details in throw wrapper', () => {
		try {
			validateModelVariantScopeOrThrow({
				modelId: 'openai/gpt-4o-mini',
				scope: 'improve',
				policy: basePolicy,
				catalog
			});
			expect.fail('Expected validation to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(ModelVariantValidationError);
			const typed = error as ModelVariantValidationError;
			expect(typed.code).toBe('VARIANT_REQUIRED');
			expect(typed.details?.availableVariants).toEqual(['low', 'high']);
		}
	});
});
