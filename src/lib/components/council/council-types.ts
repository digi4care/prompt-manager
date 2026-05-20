/**
 * Shared types for council panel components.
 * Extracted from council-review-panel to enable component decomposition.
 */

export type CouncilUIState = 'idle' | 'running' | 'complete' | 'error';

export interface AgentResult {
	agentId: number;
	agentName: string;
	output: string;
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
	};
	usage?: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration?: {
		ms: number;
		seconds: number;
	};
	status: 'streaming' | 'complete' | 'error';
	error?: string;
}

export interface AgentState {
	id: number;
	name: string;
	status: 'pending' | 'streaming' | 'complete' | 'error';
	output: string;
	error?: string;
}

export interface PromptVersion {
	id: number;
	version: string;
	changeNotes: string | null;
	createdAt: Date | null;
}

export interface PromptItem {
	id: number;
	title: string;
	versionCount?: number;
}

export const AGENT_COLORS = [
	'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
	'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
	'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
] as const;

export const AGENT_BG_COLORS = [
	'bg-blue-100 dark:bg-blue-900',
	'bg-amber-100 dark:bg-amber-900',
	'bg-green-100 dark:bg-green-900',
	'bg-purple-100 dark:bg-purple-900',
	'bg-rose-100 dark:bg-rose-900'
] as const;

export function getAgentColorClass(id: number): string {
	return AGENT_COLORS[(id - 1) % AGENT_COLORS.length];
}

export function getAgentBgColorClass(index: number): string {
	return AGENT_BG_COLORS[index % AGENT_BG_COLORS.length];
}
