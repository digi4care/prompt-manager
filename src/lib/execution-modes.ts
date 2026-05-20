/**
 * Execution mode strategy pattern for prompt-executor.svelte.
 *
 * Each mode defines: label, icon, and which council panel to render.
 * Adding a new execution mode = adding a new entry to the registry.
 */
import Play from 'lucide-svelte/icons/play';
import Users from 'lucide-svelte/icons/users';
import MessageSquare from 'lucide-svelte/icons/message-square';

export type ExecutionModeType = 'single' | 'review' | 'debate';

export interface ExecutionModeConfig {
	/** Display label for the tab */
	label: string;
	/** Lucide icon component */
	icon: typeof Play;
	/** Which council panel to render */
	panel: 'single' | 'review' | 'debate';
}

/** Registry of all execution modes */
const executionModes: Record<ExecutionModeType, ExecutionModeConfig> = {
	single: {
		label: 'Single',
		icon: Play,
		panel: 'single'
	},
	review: {
		label: 'Review',
		icon: Users,
		panel: 'review'
	},
	debate: {
		label: 'Debate',
		icon: MessageSquare,
		panel: 'debate'
	}
};

/** Get a mode config by type */
export function getExecutionMode(type: ExecutionModeType): ExecutionModeConfig {
	return executionModes[type];
}

/** Get all available mode types */
export function getAvailableModes(): ExecutionModeType[] {
	return Object.keys(executionModes) as ExecutionModeType[];
}

/** Check if a mode uses a council panel */
export function isCouncilMode(type: ExecutionModeType): boolean {
	return type !== 'single';
}
