// Model configurations
// Uses Claude Code Mux router by default (see ANTHROPIC_BASE_URL env var)
// CCM default routing: default=background=think=websearch=MiniMax-M2.1
export const JUDGE_MODEL = process.env.JUDGE_MODEL || 'MiniMax-M2.1';

// Temperature settings for AI operations
// JUDGE_TEMPERATURE: 0.0 for consistent, deterministic evaluations
// IMPROVEMENT_TEMPERATURE: 0.7 for creative but controlled improvements
export const JUDGE_TEMPERATURE = parseFloat(process.env.JUDGE_TEMPERATURE || '0.0');
export const IMPROVEMENT_TEMPERATURE = parseFloat(process.env.IMPROVEMENT_TEMPERATURE || '0.7');

// API configurations
export const API_RATE_LIMITS = {
	judgeEvaluation: 10, // requests per minute
	improvementLoop: 5, // requests per minute
};

// Validation limits
export const CONTENT_LIMITS = {
	maxPromptLength: 50000,
	maxTitleLength: 200,
};
