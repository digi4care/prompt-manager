/**
 * Prompts bulk action handlers.
 * Extracted from prompts/+page.svelte.
 */
import { invalidate } from '$app/navigation';
import type { Prompt } from '$lib/stores/prompts.svelte';

export async function deletePrompt(prompt: Prompt): Promise<boolean> {
	try {
		const response = await fetch(`/api/prompts/${prompt.id}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' }
		});

		if (response.ok) {
			await invalidate('prompts:list');
			return true;
		} else {
			console.error('Failed to delete prompt:', await response.text());
			return false;
		}
	} catch (error) {
		console.error('Error deleting prompt:', error);
		return false;
	}
}

export async function bulkDeletePrompts(ids: Set<number>): Promise<boolean> {
	if (ids.size === 0) return false;

	try {
		const response = await fetch('/api/prompts/bulk-delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: Array.from(ids) })
		});

		if (response.ok) {
			await invalidate('prompts:list');
			return true;
		} else {
			console.error('Failed to delete prompts:', await response.text());
			return false;
		}
	} catch (error) {
		console.error('Error deleting prompts:', error);
		return false;
	}
}
