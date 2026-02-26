import * as YAML from 'yaml';
import { SnippetVariableSchema, type SnippetVariable } from '$lib/utils/snippet-variables';

export class FrontmatterError extends Error {
	name = 'FrontmatterError';
}

export type FrontmatterConfig = {
	model?: string;
	temperature?: number;
	max_tokens?: number;
};

export type FrontmatterParseResult = {
	config: FrontmatterConfig;
	extras: Record<string, unknown>;
};

export type FrontmatterDefaults = {
	model?: string;
	temperature?: number;
	max_tokens?: number;
};

/**
 * Workflow type for default selection
 */
export type WorkflowType = 'improve' | 'judge' | 'default';

/**
 * Policy validation options for frontmatter
 */
export type FrontmatterPolicyOptions = {
	allowedModels?: string[];
	defaults?: FrontmatterDefaults;
	workflow?: WorkflowType;
};

/**
 * OpenCode Policy interface (same as in admin-settings.service.ts)
 */
export interface OpenCodePolicy {
	allowedModels: string[];
	improveDefaultModel: string;
	judgeDefaultModel: string;
	improveTemperature: number;
	judgeTemperature: number;
}

/**
 * Get default model for a specific workflow based on policy
 */
export function getDefaultModelForWorkflow(policy: OpenCodePolicy, workflow: WorkflowType): string {
	switch (workflow) {
		case 'improve':
			return policy.improveDefaultModel;
		case 'judge':
			return policy.judgeDefaultModel;
		default:
			return policy.improveDefaultModel; // Fallback to improve
	}
}

/**
 * Get default temperature for a specific workflow based on policy
 */
export function getDefaultTemperatureForWorkflow(
	policy: OpenCodePolicy,
	workflow: WorkflowType
): number {
	switch (workflow) {
		case 'improve':
			return policy.improveTemperature;
		case 'judge':
			return policy.judgeTemperature;
		default:
			return policy.improveTemperature; // Fallback to improve
	}
}

/**
 * Compute effective defaults from frontmatter extras and policy
 * Supports optional per-workflow allowedModels subset from frontmatter
 */
export function computePolicyDefaults(
	policy: OpenCodePolicy,
	extras: Record<string, unknown>,
	workflow: WorkflowType = 'improve'
): FrontmatterDefaults {
	const result: FrontmatterDefaults = {
		model: (extras.model as string) || getDefaultModelForWorkflow(policy, workflow),
		temperature:
			(extras.temperature as number) || getDefaultTemperatureForWorkflow(policy, workflow)
	};

	// Check for per-workflow model override in extras
	const workflowModelKey = `${workflow}_model`;
	if (extras[workflowModelKey] && typeof extras[workflowModelKey] === 'string') {
		result.model = extras[workflowModelKey] as string;
	}

	// Check for per-workflow temperature override in extras
	const workflowTempKey = `${workflow}_temperature`;
	if (extras[workflowTempKey] && typeof extras[workflowTempKey] === 'number') {
		result.temperature = extras[workflowTempKey] as number;
	}

	return result;
}

export type FrontmatterValidateOptions = {
	allowedModels?: string[];
	defaults?: FrontmatterDefaults;
};

export type FrontmatterValidation = {
	ok: boolean;
	errors: string[];
	config: FrontmatterConfig;
	extras: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asNumber(v: unknown): number | undefined {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}

export function parseFrontmatterYaml(
	frontmatterYaml: string | null | undefined
): FrontmatterParseResult {
	const src = (frontmatterYaml || '').trim();
	if (!src) return { config: {}, extras: {} };

	let parsed: unknown;
	try {
		parsed = YAML.parse(src);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new FrontmatterError(`Invalid frontmatter YAML: ${msg}`);
	}

	if (parsed === null || parsed === undefined) return { config: {}, extras: {} };
	if (!isRecord(parsed)) {
		throw new FrontmatterError('Frontmatter must be a YAML mapping (object)');
	}

	const cfg: FrontmatterConfig = {};
	const extras: Record<string, unknown> = { ...parsed };

	if (parsed.model !== undefined) {
		if (typeof parsed.model !== 'string' || parsed.model.trim() === '') {
			throw new FrontmatterError('Frontmatter model must be a non-empty string');
		}
		cfg.model = parsed.model;
		delete extras.model;
	}

	if (parsed.temperature !== undefined) {
		const n = asNumber(parsed.temperature);
		if (n === undefined) {
			throw new FrontmatterError('Frontmatter temperature must be a number');
		}
		cfg.temperature = n;
		delete extras.temperature;
	}

	if (parsed.max_tokens !== undefined) {
		const n = asNumber(parsed.max_tokens);
		if (n === undefined) {
			throw new FrontmatterError('Frontmatter max_tokens must be a number');
		}
		cfg.max_tokens = n;
		delete extras.max_tokens;
	}

	return { config: cfg, extras };
}

export function validateFrontmatter(
	frontmatterYaml: string | null | undefined,
	options: FrontmatterValidateOptions = {}
): FrontmatterValidation {
	const errors: string[] = [];
	let parsed: FrontmatterParseResult;

	try {
		parsed = parseFrontmatterYaml(frontmatterYaml);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, errors: [msg], config: {}, extras: {} };
	}

	const defaults = options.defaults || {};
	const merged: FrontmatterConfig = {
		model: parsed.config.model ?? defaults.model,
		temperature: parsed.config.temperature ?? defaults.temperature,
		max_tokens: parsed.config.max_tokens ?? defaults.max_tokens
	};

	if (merged.temperature !== undefined) {
		if (!Number.isFinite(merged.temperature)) {
			errors.push('temperature must be a finite number');
		} else if (merged.temperature < 0 || merged.temperature > 2) {
			errors.push('temperature must be between 0 and 2');
		}
	}

	if (merged.max_tokens !== undefined) {
		if (!Number.isFinite(merged.max_tokens)) {
			errors.push('max_tokens must be a finite number');
		} else if (merged.max_tokens <= 0) {
			errors.push('max_tokens must be > 0');
		}
	}

	if (merged.model !== undefined) {
		if (typeof merged.model !== 'string' || merged.model.trim() === '') {
			errors.push('model must be a non-empty string');
		} else if (options.allowedModels && options.allowedModels.length > 0) {
			if (!options.allowedModels.includes(merged.model)) {
				errors.push('model is not allowed by settings');
			}
		}
	}

	return { ok: errors.length === 0, errors, config: merged, extras: parsed.extras };
}

/**
 * Validate frontmatter with full OpenCode policy support
 * This is the recommended validation method for Improve and Judge workflows
 */
export function validateFrontmatterWithPolicy(
	frontmatterYaml: string | null | undefined,
	policy: OpenCodePolicy,
	workflow: WorkflowType = 'improve'
): FrontmatterValidation {
	const errors: string[] = [];
	let parsed: FrontmatterParseResult;

	try {
		parsed = parseFrontmatterYaml(frontmatterYaml);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, errors: [msg], config: {}, extras: {} };
	}

	// Compute effective defaults from policy and frontmatter extras
	const defaults = computePolicyDefaults(policy, parsed.extras, workflow);

	// Merge config with defaults
	const merged: FrontmatterConfig = {
		model: parsed.config.model ?? defaults.model,
		temperature: parsed.config.temperature ?? defaults.temperature,
		max_tokens: parsed.config.max_tokens ?? defaults.max_tokens
	};

	// Validate temperature
	if (merged.temperature !== undefined) {
		if (!Number.isFinite(merged.temperature)) {
			errors.push('temperature must be a finite number');
		} else if (merged.temperature < 0 || merged.temperature > 2) {
			errors.push('temperature must be between 0 and 2');
		}
	}

	// Validate max_tokens
	if (merged.max_tokens !== undefined) {
		if (!Number.isFinite(merged.max_tokens)) {
			errors.push('max_tokens must be a finite number');
		} else if (merged.max_tokens <= 0) {
			errors.push('max_tokens must be > 0');
		}
	}

	// Validate model
	if (merged.model !== undefined) {
		if (typeof merged.model !== 'string' || merged.model.trim() === '') {
			errors.push('model must be a non-empty string');
		} else {
			// Check global allowlist first
			let allowedModels = policy.allowedModels;

			// Check for prompt-specific allowlist in extras
			if (parsed.extras.allowedModels && Array.isArray(parsed.extras.allowedModels)) {
				const promptAllowedModels = parsed.extras.allowedModels as string[];
				// If prompt has its own allowlist, it must be a subset of the global allowlist
				if (allowedModels.length > 0) {
					// Filter prompt allowlist to only include globally allowed models
					allowedModels = promptAllowedModels.filter((m) => allowedModels.includes(m));
					// If no models remain after filtering, this is an error
					if (allowedModels.length === 0) {
						errors.push('prompt allowedModels must be a subset of globally allowed models');
					}
				} else {
					// No global allowlist, use prompt-specific allowlist
					allowedModels = promptAllowedModels;
				}
			}

			// Validate model is in the effective allowlist
			if (allowedModels.length > 0 && !allowedModels.includes(merged.model)) {
				errors.push(`model "${merged.model}" is not in the allowed list`);
			}
		}
	}

	return { ok: errors.length === 0, errors, config: merged, extras: parsed.extras };
}

/**
 * Result of parsing snippet frontmatter with variables section
 */
export type SnippetParseResult = FrontmatterParseResult & {
	variables: SnippetVariable[];
};

/**
 * Parse frontmatter YAML with snippet variable extraction
 *
 * Extracts and validates a `variables:` section from frontmatter YAML.
 * Invalid variable definitions are silently skipped.
 *
 * @param frontmatterYaml - Raw YAML frontmatter string
 * @returns Parsed result with variables array
 *
 * @example
 * const yaml = `
 * temperature: 0.7
 * variables:
 *   - name: CONTEXT
 *     description: User context
 *     required: true
 * `;
 * const result = parseSnippetFrontmatter(yaml);
 * // result.variables = [{ name: 'CONTEXT', description: 'User context', required: true }]
 */
export function parseSnippetFrontmatter(
	frontmatterYaml: string | null | undefined
): SnippetParseResult {
	const base = parseFrontmatterYaml(frontmatterYaml);
	const variables: SnippetVariable[] = [];

	if (base.extras.variables && Array.isArray(base.extras.variables)) {
		for (const v of base.extras.variables) {
			const result = SnippetVariableSchema.safeParse(v);
			if (result.success) {
				variables.push(result.data);
			}
		}
	}

	return { ...base, variables };
}
