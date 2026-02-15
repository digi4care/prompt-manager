import { browser } from '$app/environment';

// Types matching the backend schema
export interface Prompt {
	id: number;
	title: string;
	description: string | null;
	purpose: string | null;
	tags: string[];
	llmProviders: string[]; // LLM providers that can be used with this prompt
	createdAt: Date | string;
	updatedAt: Date | string;
	latestVersionId: number | null;
	deletedAt: Date | string | null;
}

export interface PromptVersion {
	id: number;
	promptId: number;
	version: string;
	content: string;
	metadata: string | null;
	frontmatterYaml?: string | null;
	parentVersionId: number | null;
	changeType: 'major' | 'minor' | 'patch';
	changeNotes: string | null;
	createdAt: Date | string;
	createdBy: string;
}

export interface PromptWithVersions extends Prompt {
	versions: PromptVersion[];
}

export interface CreatePromptInput {
	title: string;
	description?: string;
	purpose?: string;
	tags?: string[];
	llmProviders?: string[];
	content: string;
}

export interface UpdatePromptInput {
	title?: string;
	description?: string;
	purpose?: string;
	tags?: string[];
	llmProviders?: string[];
}

export interface CreateVersionInput {
	content: string;
	changeType: 'major' | 'minor' | 'patch';
	changeNotes: string;
	frontmatterYaml?: string;
}

export interface PaginationParams {
	limit?: number;
	offset?: number;
	search?: string;
}

export interface ApiResponse<T> {
	data: T;
	pagination?: {
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

// Store state interface
interface PromptsState {
	prompts: Prompt[];
	selectedPrompt: PromptWithVersions | null;
	loading: boolean;
	error: string | null;
	pagination: {
		limit: number;
		offset: number;
		hasMore: boolean;
		search: string;
	};
	autoRefresh: boolean;
	refreshInterval: number | null;
}

// API functions
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData?.error?.message || `API error: ${response.status}`);
	}

	return response.json();
}

// Prompts Store using Svelte 5 Runes
class PromptsStore {
	// State using $state
	prompts = $state<Prompt[]>([]);
	selectedPrompt = $state<PromptWithVersions | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	pagination = $state({
		limit: 100,
		offset: 0,
		hasMore: false,
		search: ''
	});
	autoRefresh = $state(false);
	private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

	// Derived state
	get hasPrompts() {
		return this.prompts.length > 0;
	}

	get isEmpty() {
		return this.prompts.length === 0 && !this.loading;
	}

	get promptCount() {
		return this.prompts.length;
	}

	// CRUD Operations

	/**
	 * Fetch all prompts with optional pagination and search
	 */
	async fetchPrompts(params?: PaginationParams): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const searchParams = new URLSearchParams();
			if (params?.limit) searchParams.set('limit', String(params.limit));
			if (params?.offset) searchParams.set('offset', String(params.offset));
			if (params?.search) searchParams.set('search', params.search);

			const queryString = searchParams.toString();
			const url = `/api/prompts${queryString ? `?${queryString}` : ''}`;

			const response = await fetchApi<ApiResponse<Prompt[]>>(url);

			this.prompts = response.data;
			if (response.pagination) {
				this.pagination = {
					limit: response.pagination.limit,
					offset: response.pagination.offset,
					hasMore: response.pagination.hasMore,
					search: params?.search || ''
				};
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch prompts';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Fetch a single prompt by ID with its versions
	 */
	async fetchPrompt(id: number): Promise<PromptWithVersions | null> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetchApi<ApiResponse<PromptWithVersions>>(`/api/prompts/${id}`);
			this.selectedPrompt = response.data;
			return response.data;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch prompt';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Create a new prompt with optimistic update
	 */
	async createPrompt(input: CreatePromptInput): Promise<Prompt> {
		this.loading = true;
		this.error = null;

		// Optimistic update: create temporary prompt
		const tempId = Date.now(); // Temporary negative ID
		const optimisticPrompt: Prompt = {
			id: tempId,
			title: input.title,
			description: input.description || null,
			purpose: input.purpose || null,
			tags: input.tags || [],
			llmProviders: input.llmProviders || [],
			createdAt: new Date(),
			updatedAt: new Date(),
			latestVersionId: null,
			deletedAt: null
		};

		// Add to list optimistically
		this.prompts = [optimisticPrompt, ...this.prompts];

		try {
			const response = await fetchApi<Prompt & { latestVersion: PromptVersion }>('/api/prompts', {
				method: 'POST',
				body: JSON.stringify(input)
			});

			// Replace optimistic prompt with real one
			this.prompts = this.prompts.map((p) =>
				p.id === tempId
					? {
							...response,
							tags: typeof response.tags === 'string' ? JSON.parse(response.tags) : response.tags
						}
					: p
			);

			return response as Prompt;
		} catch (err) {
			// Rollback optimistic update on error
			this.prompts = this.prompts.filter((p) => p.id !== tempId);
			this.error = err instanceof Error ? err.message : 'Failed to create prompt';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update a prompt with optimistic update
	 */
	async updatePrompt(id: number, input: UpdatePromptInput): Promise<Prompt> {
		this.loading = true;
		this.error = null;

		// Store original for rollback
		const originalPrompts = [...this.prompts];
		const originalSelected = this.selectedPrompt;

		// Optimistic update
		this.prompts = this.prompts.map((p) =>
			p.id === id
				? {
						...p,
						...input,
						tags: input.tags || p.tags,
						updatedAt: new Date()
					}
				: p
		);

		if (this.selectedPrompt?.id === id) {
			this.selectedPrompt = {
				...this.selectedPrompt,
				...input,
				tags: input.tags || this.selectedPrompt.tags,
				updatedAt: new Date()
			};
		}

		try {
			const response = await fetchApi<Prompt>(`/api/prompts/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(input)
			});

			// Update with real response
			this.prompts = this.prompts.map((p) =>
				p.id === id
					? {
							...response,
							tags: typeof response.tags === 'string' ? JSON.parse(response.tags) : response.tags
						}
					: p
			);

			if (this.selectedPrompt?.id === id) {
				this.selectedPrompt = {
					...this.selectedPrompt,
					...response,
					tags: typeof response.tags === 'string' ? JSON.parse(response.tags) : response.tags,
					versions: this.selectedPrompt.versions
				};
			}

			return response;
		} catch (err) {
			// Rollback on error
			this.prompts = originalPrompts;
			this.selectedPrompt = originalSelected;
			this.error = err instanceof Error ? err.message : 'Failed to update prompt';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a prompt with optimistic update (soft delete)
	 */
	async deletePrompt(id: number): Promise<void> {
		this.loading = true;
		this.error = null;

		// Store original for rollback
		const originalPrompts = [...this.prompts];
		const originalSelected = this.selectedPrompt;

		// Optimistic update: remove from list
		this.prompts = this.prompts.filter((p) => p.id !== id);
		if (this.selectedPrompt?.id === id) {
			this.selectedPrompt = null;
		}

		try {
			const response = await fetch(`/api/prompts/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData?.error?.message || `API error: ${response.status}`);
			}

			// If the selected prompt was deleted, clear it
			if (originalSelected?.id === id) {
				this.selectedPrompt = null;
			}
		} catch (err) {
			// Rollback on error
			this.prompts = originalPrompts;
			this.selectedPrompt = originalSelected;
			this.error = err instanceof Error ? err.message : 'Failed to delete prompt';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Create a new version for a prompt
	 */
	async createVersion(
		promptId: number,
		content: string,
		changeType: 'major' | 'minor' | 'patch',
		changeNotes: string,
		frontmatterYaml?: string
	): Promise<PromptVersion> {
		this.loading = true;
		this.error = null;

		// Store original for rollback
		const originalSelected = this.selectedPrompt;

		try {
			const response = await fetchApi<PromptVersion>(`/api/prompts/${promptId}/versions`, {
				method: 'POST',
				body: JSON.stringify({
					content,
					changeType,
					changeNotes,
					frontmatterYaml
				})
			});

			// Update selected prompt with new version
			if (this.selectedPrompt?.id === promptId) {
				this.selectedPrompt = {
					...this.selectedPrompt,
					versions: [response, ...this.selectedPrompt.versions],
					updatedAt: new Date()
				};
			}

			return response;
		} catch (err) {
			this.selectedPrompt = originalSelected;
			this.error = err instanceof Error ? err.message : 'Failed to create version';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	// Auto-refresh functionality

	/**
	 * Enable auto-refresh with the specified interval (in milliseconds)
	 */
	enableAutoRefresh(intervalMs = 30000): void {
		if (!browser) return;

		this.autoRefresh = true;
		this.refreshIntervalId = setInterval(() => {
			this.fetchPrompts({
				limit: this.pagination.limit,
				offset: 0,
				search: this.pagination.search
			});
		}, intervalMs);
	}

	/**
	 * Disable auto-refresh
	 */
	disableAutoRefresh(): void {
		this.autoRefresh = false;
		if (this.refreshIntervalId) {
			clearInterval(this.refreshIntervalId);
			this.refreshIntervalId = null;
		}
	}

	/**
	 * Toggle auto-refresh
	 */
	toggleAutoRefresh(intervalMs?: number): void {
		if (this.autoRefresh) {
			this.disableAutoRefresh();
		} else {
			this.enableAutoRefresh(intervalMs);
		}
	}

	// Search and filter

	/**
	 * Search prompts with debouncing
	 */
	private searchTimeout: ReturnType<typeof setTimeout> | null = null;

	async searchPrompts(searchTerm: string, debounceMs = 300): Promise<void> {
		// Clear previous timeout
		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
		}

		return new Promise((resolve) => {
			this.searchTimeout = setTimeout(async () => {
				try {
					await this.fetchPrompts({ limit: this.pagination.limit, offset: 0, search: searchTerm });
				} finally {
					resolve();
				}
			}, debounceMs);
		});
	}

	// Utility methods

	/**
	 * Get a prompt by ID from the cached list
	 */
	getPromptById(id: number): Prompt | undefined {
		return this.prompts.find((p) => p.id === id);
	}

	/**
	 * Clear the selected prompt
	 */
	clearSelected(): void {
		this.selectedPrompt = null;
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Reset the store to initial state
	 */
	reset(): void {
		this.prompts = [];
		this.selectedPrompt = null;
		this.loading = false;
		this.error = null;
		this.pagination = {
			limit: 100,
			offset: 0,
			hasMore: false,
			search: ''
		};
		this.disableAutoRefresh();
	}

	/**
	 * Load more prompts (pagination) - appends to existing list
	 */
	async loadMore(): Promise<void> {
		if (!this.pagination.hasMore || this.loading) return;

		this.loading = true;
		this.error = null;

		try {
			const searchParams = new URLSearchParams();
			searchParams.set('limit', String(this.pagination.limit));
			searchParams.set('offset', String(this.prompts.length));
			if (this.pagination.search) searchParams.set('search', this.pagination.search);

			const response = await fetchApi<ApiResponse<Prompt[]>>(
				`/api/prompts?${searchParams.toString()}`
			);

			// Append new prompts to existing list
			this.prompts = [...this.prompts, ...response.data];
			if (response.pagination) {
				this.pagination = {
					limit: response.pagination.limit,
					offset: this.prompts.length,
					hasMore: response.pagination.hasMore,
					search: this.pagination.search
				};
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more prompts';
			throw err;
		} finally {
			this.loading = false;
		}
	}
}

// Export singleton instance
export const promptsStore = new PromptsStore();

// Export class for testing
export { PromptsStore };
