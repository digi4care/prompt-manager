/**
 * Agent CRUD operations for the settings page.
 * Extracted from settings/+page.svelte to reduce page complexity.
 *
 * All functions call the API and then invalidate the page data.
 */
import { invalidateAll } from '$app/navigation';

export interface AgentModel {
	id: string;
	name: string;
	provider: string;
	logo?: string;
}

async function apiCall(url: string, options: RequestInit): Promise<Response> {
	const response = await fetch(url, options);
	if (!response.ok) {
		if (response.status === 302 || response.status === 401) {
			throw new Error('Je moet ingelogd zijn om dit te doen');
		}
		try {
			const err = await response.json();
			throw new Error(err.message || `Request failed: ${response.status}`);
		} catch {
			throw new Error(`Request failed: ${response.status}`);
		}
	}
	return response;
}

// Council agents (function_defaults parent type)

export async function addCouncilMember(defaultModelId: string): Promise<void> {
	try {
		await apiCall('/api/admin/council-agents', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				parentType: 'function_defaults',
				parentId: 0,
				modelId: defaultModelId,
				temperature: 0.5,
				maxTokens: 8192,
				promptLinkId: null
			})
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error adding council member:', error);
		alert(error instanceof Error ? error.message : 'Failed to add council member');
	}
}

export async function deleteCouncilMember(id: number): Promise<void> {
	try {
		await apiCall(`/api/admin/council-agents/${id}`, { method: 'DELETE' });
		await invalidateAll();
	} catch (error) {
		console.error('Error deleting council member:', error);
	}
}

export async function updateCouncilPrompt(
	agentId: number,
	promptId: number | null
): Promise<void> {
	try {
		await apiCall(`/api/admin/council-agents/${agentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ promptLinkId: promptId })
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error updating council prompt:', error);
	}
}

export async function updateCouncilModel(agentId: number, model: AgentModel): Promise<void> {
	if (!model?.id) return;
	try {
		await apiCall(`/api/admin/council-agents/${agentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				modelId: model.id,
				modelName: model.name,
				modelProvider: model.provider,
				modelLogo: model.logo
			})
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error updating council model:', error);
	}
}

// Review agents (review_defaults parent type)

export async function addReviewMember(defaultModelId: string): Promise<void> {
	try {
		await apiCall('/api/admin/council-agents', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				parentType: 'review_defaults',
				parentId: 0,
				modelId: defaultModelId,
				temperature: 0.5,
				maxTokens: 8192,
				promptLinkId: null
			})
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error adding review member:', error);
		alert(error instanceof Error ? error.message : 'Failed to add review member');
	}
}

export async function deleteReviewMember(id: number): Promise<void> {
	try {
		await apiCall(`/api/admin/council-agents/${id}`, { method: 'DELETE' });
		await invalidateAll();
	} catch (error) {
		console.error('Error deleting review member:', error);
	}
}

export async function updateReviewPrompt(
	agentId: number,
	promptId: number | null
): Promise<void> {
	try {
		await apiCall(`/api/admin/council-agents/${agentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ promptLinkId: promptId })
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error updating review prompt:', error);
	}
}

export async function updateReviewModel(agentId: number, model: AgentModel): Promise<void> {
	if (!model?.id) return;
	try {
		await apiCall(`/api/admin/council-agents/${agentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				modelId: model.id,
				modelName: model.name,
				modelProvider: model.provider,
				modelLogo: model.logo
			})
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error updating review model:', error);
	}
}

// Shared agent settings update (temperature, maxTokens, thinkingLevel)

export async function updateAgentSettings(
	agentId: number,
	settings: {
		temperature?: number | null;
		maxTokens?: number | null;
		thinkingLevel?: string | null;
	}
): Promise<void> {
	try {
		await apiCall(`/api/admin/council-agents/${agentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		await invalidateAll();
	} catch (error) {
		console.error('Error updating agent settings:', error);
	}
}
