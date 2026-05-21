/**
 * Prompts filter/sort composable.
 * Extracted from prompts/+page.svelte.
 */
import { goto } from '$app/navigation';
import type { Prompt } from '$lib/stores/prompts.svelte';

export interface FilterState {
	searchQuery: string;
	selectedTags: string[];
	selectedPurpose: string;
	sortField: string;
	sortDirection: 'asc' | 'desc';
}

/**
 * Filter and sort prompts based on current filter state.
 */
export function filterAndSortPrompts(prompts: Prompt[], filters: FilterState): Prompt[] {
	let result = [...prompts];

	if (filters.searchQuery) {
		const query = filters.searchQuery.toLowerCase();
		result = result.filter(
			(p) =>
				p.title.toLowerCase().includes(query) ||
				(p.description || '').toLowerCase().includes(query)
		);
	}

	if (filters.selectedTags.length > 0) {
		result = result.filter((p) => filters.selectedTags.some((tag) => p.tags?.includes(tag)));
	}

	if (filters.selectedPurpose) {
		result = result.filter((p) => p.purpose === filters.selectedPurpose);
	}

	result.sort((a, b) => {
		let comparison = 0;
		switch (filters.sortField) {
			case 'title':
				comparison = a.title.localeCompare(b.title);
				break;
			case 'updatedAt':
				comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
				break;
			case 'createdAt':
				comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
				break;
		}
		return filters.sortDirection === 'asc' ? comparison : -comparison;
	});

	return result;
}

/**
 * Sync filter state to URL search params and navigate.
 */
export function syncFiltersToUrl(filters: FilterState): Promise<void> {
	const url = new URL(window.location.href);
	if (filters.searchQuery) url.searchParams.set('search', filters.searchQuery);
	else url.searchParams.delete('search');
	if (filters.selectedPurpose) url.searchParams.set('purpose', filters.selectedPurpose);
	else url.searchParams.delete('purpose');
	url.searchParams.set('sort', filters.sortField);
	url.searchParams.set('direction', filters.sortDirection);
	return goto(url.toString(), { replaceState: true, invalidateAll: true });
}

/**
 * Clear URL filter params and navigate.
 */
export function clearUrlFilters(): Promise<void> {
	const url = new URL(window.location.href);
	url.searchParams.delete('search');
	url.searchParams.delete('purpose');
	url.searchParams.delete('sort');
	url.searchParams.delete('direction');
	return goto(url.toString(), { replaceState: true, invalidateAll: true });
}

/**
 * Create a debounced version of a function.
 */
export function createDebounced(fn: () => void, delay: number): () => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(fn, delay);
	};
}
