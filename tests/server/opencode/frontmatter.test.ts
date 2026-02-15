import { describe, it, expect } from 'vitest';
import {
	parseFrontmatterYaml,
	validateFrontmatter,
	validateFrontmatterWithPolicy,
	computePolicyDefaults,
	getDefaultModelForWorkflow,
	getDefaultTemperatureForWorkflow,
	FrontmatterError,
	type OpenCodePolicy,
	type WorkflowType
} from '$lib/server/opencode/frontmatter';

describe('frontmatter', () => {
	it('parses empty YAML as empty config', () => {
		expect(parseFrontmatterYaml('')).toEqual({ config: {}, extras: {} });
	});

	it('parses supported keys and collects extras', () => {
		const res = parseFrontmatterYaml(
			'model: openai/gpt-4o\ntemperature: 0.7\nmax_tokens: 123\nfoo: bar\n'
		);
		expect(res.config).toEqual({ model: 'openai/gpt-4o', temperature: 0.7, max_tokens: 123 });
		expect(res.extras).toEqual({ foo: 'bar' });
	});

	it('rejects non-mapping YAML', () => {
		expect(() => parseFrontmatterYaml('- a\n- b\n')).toThrow(FrontmatterError);
	});

	it('validates temperature range', () => {
		const v = validateFrontmatter('temperature: 3');
		expect(v.ok).toBe(false);
		expect(v.errors.join(' ')).toMatch(/between 0 and 2/i);
	});

	it('enforces allowed model list when provided', () => {
		const v = validateFrontmatter('model: openai/gpt-4o', {
			allowedModels: ['openai/gpt-4o-mini']
		});
		expect(v.ok).toBe(false);
		expect(v.errors.join(' ')).toMatch(/not allowed/i);
	});

	it('merges defaults when keys are missing', () => {
		const v = validateFrontmatter('', { defaults: { model: 'x', temperature: 0.2 } });
		expect(v.ok).toBe(true);
		expect(v.config).toEqual({ model: 'x', temperature: 0.2, max_tokens: undefined });
	});

	describe('Policy-based validation', () => {
		const mockPolicy: OpenCodePolicy = {
			allowedModels: ['anthropic/claude-3-5-sonnet', 'openai/gpt-4'],
			improveDefaultModel: 'anthropic/claude-3-5-sonnet',
			judgeDefaultModel: 'openai/gpt-4',
			improveTemperature: 0.7,
			judgeTemperature: 0.0
		};

		it('validates frontmatter with policy defaults', () => {
			const v = validateFrontmatterWithPolicy('', mockPolicy, 'improve');
			expect(v.ok).toBe(true);
			expect(v.config.model).toBe('anthropic/claude-3-5-sonnet');
			expect(v.config.temperature).toBe(0.7);
		});

		it('rejects model not in global allowlist', () => {
			const v = validateFrontmatterWithPolicy('model: not-allowed-model', mockPolicy, 'improve');
			expect(v.ok).toBe(false);
			expect(v.errors.some((e) => e.includes('not in the allowed list'))).toBe(true);
		});

		it('respects prompt-specific allowedModels if subset of global', () => {
			const v = validateFrontmatterWithPolicy(
				'model: anthropic/claude-3-5-sonnet\nallowedModels:\n  - anthropic/claude-3-5-sonnet',
				mockPolicy,
				'improve'
			);
			expect(v.ok).toBe(true);
			expect(v.config.model).toBe('anthropic/claude-3-5-sonnet');
		});

		it('rejects if prompt allowedModels not subset of global', () => {
			const v = validateFrontmatterWithPolicy(
				'model: some-other-model\nallowedModels:\n  - some-other-model',
				mockPolicy,
				'improve'
			);
			expect(v.ok).toBe(false);
			expect(v.errors.some((e) => e.includes('must be a subset'))).toBe(true);
		});

		it('allows any model if global allowlist is empty', () => {
			const emptyPolicy: OpenCodePolicy = {
				...mockPolicy,
				allowedModels: []
			};
			const v = validateFrontmatterWithPolicy('model: any-model', emptyPolicy, 'improve');
			expect(v.ok).toBe(true);
			expect(v.config.model).toBe('any-model');
		});

		it('uses prompt-specific allowedModels when no global allowlist', () => {
			const emptyPolicy: OpenCodePolicy = {
				...mockPolicy,
				allowedModels: []
			};
			const v = validateFrontmatterWithPolicy(
				'model: custom-model\nallowedModels:\n  - custom-model',
				emptyPolicy,
				'improve'
			);
			expect(v.ok).toBe(true);
			expect(v.config.model).toBe('custom-model');
		});
	});

	describe('Workflow defaults', () => {
		const mockPolicy: OpenCodePolicy = {
			allowedModels: ['anthropic/claude-3-5-sonnet'],
			improveDefaultModel: 'anthropic/claude-3-5-sonnet',
			judgeDefaultModel: 'openai/gpt-4',
			improveTemperature: 0.7,
			judgeTemperature: 0.0
		};

		it('returns correct default model for improve workflow', () => {
			expect(getDefaultModelForWorkflow(mockPolicy, 'improve')).toBe('anthropic/claude-3-5-sonnet');
		});

		it('returns correct default model for judge workflow', () => {
			expect(getDefaultModelForWorkflow(mockPolicy, 'judge')).toBe('openai/gpt-4');
		});

		it('returns correct default temperature for improve workflow', () => {
			expect(getDefaultTemperatureForWorkflow(mockPolicy, 'improve')).toBe(0.7);
		});

		it('returns correct default temperature for judge workflow', () => {
			expect(getDefaultTemperatureForWorkflow(mockPolicy, 'judge')).toBe(0.0);
		});

		it('falls back to improve defaults for unknown workflow', () => {
			expect(getDefaultModelForWorkflow(mockPolicy, 'unknown' as WorkflowType)).toBe(
				'anthropic/claude-3-5-sonnet'
			);
			expect(getDefaultTemperatureForWorkflow(mockPolicy, 'unknown' as WorkflowType)).toBe(0.7);
		});

		it('computes defaults from policy', () => {
			const defaults = computePolicyDefaults(mockPolicy, {}, 'improve');
			expect(defaults.model).toBe('anthropic/claude-3-5-sonnet');
			expect(defaults.temperature).toBe(0.7);
		});

		it('respects workflow-specific overrides in extras', () => {
			const extras = {
				improve_model: 'custom-improve-model',
				improve_temperature: 0.5
			};
			const defaults = computePolicyDefaults(mockPolicy, extras, 'improve');
			expect(defaults.model).toBe('custom-improve-model');
			expect(defaults.temperature).toBe(0.5);
		});

		it('ignores other workflow overrides in extras', () => {
			const extras = {
				judge_model: 'custom-judge-model',
				judge_temperature: 0.2
			};
			const defaults = computePolicyDefaults(mockPolicy, extras, 'improve');
			// Should use improve defaults, not judge overrides
			expect(defaults.model).toBe('anthropic/claude-3-5-sonnet');
			expect(defaults.temperature).toBe(0.7);
		});
	});
});
