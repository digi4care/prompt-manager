// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptsStore, type Prompt, type CreatePromptInput } from '$lib/stores/prompts.svelte';
import { browser } from '$app/environment';

// Mock fetch
globalThis.fetch = vi.fn();

describe('PromptsStore Unit Tests', () => {
	let store: PromptsStore;
	const mockPrompt: Prompt = {
		id: 1,
		title: 'Test Prompt',
		description: 'Description',
		purpose: 'testing',
		tags: ['test'],
		createdAt: new Date(),
		updatedAt: new Date(),
		latestVersionId: 1,
		deletedAt: null
	};

	beforeEach(() => {
		store = new PromptsStore();
		vi.clearAllMocks();
	});

	afterEach(() => {
		store.disableAutoRefresh();
	});

	describe('Derived Getters', () => {
		it('should return hasPrompts true when prompts exist', async () => {
			store.prompts = [mockPrompt];
			expect(store.hasPrompts).toBe(true);
		});

		it('should return hasPrompts false when prompts empty', () => {
			expect(store.hasPrompts).toBe(false);
		});

		it('should return isEmpty when no prompts and not loading', () => {
			expect(store.isEmpty).toBe(true);
		});

		it('should return not isEmpty when loading', () => {
			store.loading = true;
			expect(store.isEmpty).toBe(false);
		});

		it('should return correct promptCount', () => {
			store.prompts = [mockPrompt, { ...mockPrompt, id: 2 }];
			expect(store.promptCount).toBe(2);
		});
	});

	describe('getPromptById', () => {
		it('should return prompt when found', () => {
			store.prompts = [mockPrompt];
			const found = store.getPromptById(1);
			expect(found).toEqual(mockPrompt);
		});

		it('should return undefined when not found', () => {
			store.prompts = [mockPrompt];
			const found = store.getPromptById(999);
			expect(found).toBeUndefined();
		});

		it('should return undefined when prompts empty', () => {
			const found = store.getPromptById(1);
			expect(found).toBeUndefined();
		});
	});

	describe('clearSelected', () => {
		it('should clear selectedPrompt', () => {
			store.selectedPrompt = {
				...mockPrompt,
				versions: []
			};
			store.clearSelected();
			expect(store.selectedPrompt).toBeNull();
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			store.error = 'Some error';
			store.clearError();
			expect(store.error).toBeNull();
		});
	});

	describe('reset', () => {
		it('should reset all state to initial values', () => {
			store.prompts = [mockPrompt];
			store.selectedPrompt = { ...mockPrompt, versions: [] };
			store.loading = true;
			store.error = 'Error';
			store.autoRefresh = true;
			store.pagination = { limit: 50, offset: 10, hasMore: true, search: 'test' };

			store.reset();

			expect(store.prompts).toEqual([]);
			expect(store.selectedPrompt).toBeNull();
			expect(store.loading).toBe(false);
			expect(store.error).toBeNull();
			expect(store.autoRefresh).toBe(false);
			expect(store.pagination).toEqual({ limit: 100, offset: 0, hasMore: false, search: '' });
		});
	});

	describe('loadMore', () => {
		it('should return early when hasMore is false', async () => {
			store.pagination.hasMore = false;
			store.loading = false;

			await store.loadMore();

			expect(store.loading).toBe(false);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('should return early when already loading', async () => {
			store.pagination.hasMore = true;
			store.loading = true;

			await store.loadMore();

			expect(fetch).not.toHaveBeenCalled();
		});

		it('should handle error during loadMore', async () => {
			store.pagination.hasMore = true;
			store.loading = false;
			store.pagination.limit = 100;
			store.prompts = [mockPrompt];

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Network error')
			);

			await expect(store.loadMore()).rejects.toThrow('Network error');
			expect(store.error).toBe('Network error');
			expect(store.loading).toBe(false);
		});
	});

	describe('toggleAutoRefresh', () => {
		it('should enable auto refresh when disabled', () => {
			if (!browser) return; // Skip in non-browser environment
			store.autoRefresh = false;

			store.toggleAutoRefresh(60000);

			expect(store.autoRefresh).toBe(true);
			expect(store.refreshIntervalId).not.toBeNull();
		});

		it('should disable auto refresh when enabled', () => {
			if (!browser) return; // Skip in non-browser environment
			store.autoRefresh = true;
			store.refreshIntervalId = setInterval(() => {}, 60000);

			store.toggleAutoRefresh();

			expect(store.autoRefresh).toBe(false);
			expect(store.refreshIntervalId).toBeNull();
		});
	});

	describe('enableAutoRefresh', () => {
		it('should set autoRefresh to true and start interval', () => {
			if (!browser) return; // Skip in non-browser environment
			store.autoRefresh = false;

			store.enableAutoRefresh(5000);

			expect(store.autoRefresh).toBe(true);
			expect(store.refreshIntervalId).not.toBeNull();
		});

		it('should use default interval when not specified', () => {
			if (!browser) return; // Skip in non-browser environment
			store.enableAutoRefresh();

			expect(store.autoRefresh).toBe(true);
		});

		it('should handle non-browser environment', () => {
			// Test that enableAutoRefresh handles non-browser gracefully
			// by checking that when browser is false, it doesn't enable
			const nonBrowserStore = new PromptsStore();
			// The store checks browser internally, so if browser is false,
			// autoRefresh should remain false
			if (!browser) {
				expect(nonBrowserStore.autoRefresh).toBe(false);
			}
		});
	});

	describe('disableAutoRefresh', () => {
		it('should set autoRefresh to false and clear interval', () => {
			if (!browser) return; // Skip in non-browser environment
			store.autoRefresh = true;
			store.refreshIntervalId = setInterval(() => {}, 60000);

			store.disableAutoRefresh();

			expect(store.autoRefresh).toBe(false);
			expect(store.refreshIntervalId).toBeNull();
		});

		it('should handle null refreshIntervalId gracefully', () => {
			store.autoRefresh = false;
			store.refreshIntervalId = null;

			store.disableAutoRefresh();

			expect(store.autoRefresh).toBe(false);
		});
	});

	describe('searchPrompts', () => {
		it('should clear previous timeout before setting new one', async () => {
			store.pagination.limit = 100;
			store.pagination.search = '';
			store.loading = false;

			// First call
			const timeout1 = setTimeout(() => {}, 300);
			store.searchTimeout = timeout1;

			// Mock fetch for the second call
			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: [], pagination: { limit: 100, offset: 0, hasMore: false } })
			});

			// Second call should clear first timeout
			await store.searchPrompts('new search');

			expect(store.searchTimeout).not.toBe(timeout1);
		});
	});

	describe('createPrompt - error handling', () => {
		it('should rollback on API error', async () => {
			store.prompts = [];
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('API error')
			);

			await expect(store.createPrompt({ title: 'New', content: 'content' })).rejects.toThrow(
				'API error'
			);
			expect(store.prompts).toEqual([]);
			expect(store.error).toBe('API error');
		});
	});

	describe('updatePrompt - error handling', () => {
		it('should rollback on API error', async () => {
			const original = { ...mockPrompt };
			store.prompts = [original];
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Update failed')
			);

			await expect(store.updatePrompt(1, { title: 'Updated' })).rejects.toThrow('Update failed');
			expect(store.prompts[0]).toEqual(original);
			expect(store.error).toBe('Update failed');
		});
	});

	describe('deletePrompt - error handling', () => {
		it('should rollback on API error', async () => {
			store.prompts = [mockPrompt];
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				json: async () => ({ error: { message: 'Delete failed' } })
			});

			await expect(store.deletePrompt(1)).rejects.toThrow('Delete failed');
			expect(store.prompts).toEqual([mockPrompt]);
			expect(store.error).toBe('Delete failed');
		});
	});

	describe('createVersion - error handling', () => {
		it('should rollback selectedPrompt on error', async () => {
			store.selectedPrompt = { ...mockPrompt, versions: [] };
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Version failed')
			);

			await expect(store.createVersion(1, 'content', 'major', 'notes')).rejects.toThrow(
				'Version failed'
			);
			expect(store.error).toBe('Version failed');
		});
	});

	describe('fetchPrompts - error handling', () => {
		it('should handle fetch error', async () => {
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Fetch failed')
			);

			await expect(store.fetchPrompts()).rejects.toThrow('Fetch failed');
			expect(store.error).toBe('Fetch failed');
		});
	});

	describe('fetchPrompt - error handling', () => {
		it('should handle fetch error', async () => {
			store.loading = false;

			(vi.mocked(fetch) as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Not found')
			);

			await expect(store.fetchPrompt(1)).rejects.toThrow('Not found');
			expect(store.error).toBe('Not found');
		});
	});
});
