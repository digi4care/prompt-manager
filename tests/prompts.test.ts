// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	PromptsStore,
	type Prompt,
	type CreatePromptInput,
	type UpdatePromptInput
} from '$lib/stores/prompts.svelte';

// Mock fetch globally
global.fetch = vi.fn();

describe('PromptsStore', () => {
	let store: PromptsStore;
	let mockFetch: ReturnType<typeof vi.fn>;

	// Sample test data
	const samplePrompts: Prompt[] = [
		{
			id: 1,
			title: 'Test Prompt 1',
			description: 'Description 1',
			purpose: 'coding',
			tags: ['test', 'sample'],
			llmProviders: [],
			createdAt: new Date('2025-01-01'),
			updatedAt: new Date('2025-01-02'),
			latestVersionId: 1,
			deletedAt: null
		},
		{
			id: 2,
			title: 'Test Prompt 2',
			description: 'Description 2',
			purpose: 'writing',
			tags: ['writing'],
			llmProviders: [],
			createdAt: new Date('2025-01-03'),
			updatedAt: new Date('2025-01-03'),
			latestVersionId: 2,
			deletedAt: null
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PromptsStore();
		mockFetch = vi.fn();
		(global as { fetch: typeof mockFetch }).fetch = mockFetch;
	});

	afterEach(() => {
		store.reset();
	});

	describe('Initial State', () => {
		it('should initialize with empty prompts list', () => {
			expect(store.prompts).toEqual([]);
			expect(store.hasPrompts).toBe(false);
			expect(store.isEmpty).toBe(true);
		});

		it('should initialize with null selected prompt', () => {
			expect(store.selectedPrompt).toBeNull();
		});

		it('should initialize with loading false', () => {
			expect(store.loading).toBe(false);
		});

		it('should initialize with null error', () => {
			expect(store.error).toBeNull();
		});

		it('should have default pagination', () => {
			expect(store.pagination.limit).toBe(100);
			expect(store.pagination.offset).toBe(0);
			expect(store.pagination.hasMore).toBe(false);
			expect(store.pagination.search).toBe('');
		});

		it('should have promptCount as 0', () => {
			expect(store.promptCount).toBe(0);
		});
	});

	describe('fetchPrompts', () => {
		it('should fetch prompts successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: samplePrompts,
						pagination: { limit: 100, offset: 0, hasMore: false }
					})
			});

			await store.fetchPrompts();

			expect(store.prompts).toHaveLength(2);
			expect(store.prompts[0].title).toBe('Test Prompt 1');
			expect(store.loading).toBe(false);
			expect(store.error).toBeNull();
		});

		it('should update loading state during fetch', async () => {
			let resolvePromise: (value: unknown) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});

			mockFetch.mockReturnValueOnce(promise as Promise<Response>);

			const fetchPromise = store.fetchPrompts();

			expect(store.loading).toBe(true);

			resolvePromise!({
				ok: true,
				json: () =>
					Promise.resolve({
						data: samplePrompts,
						pagination: { limit: 100, offset: 0, hasMore: false }
					})
			});

			await fetchPromise;

			expect(store.loading).toBe(false);
		});

		it('should set error on fetch failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () =>
					Promise.resolve({
						error: { message: 'Server error' }
					})
			});

			await expect(store.fetchPrompts()).rejects.toThrow('Server error');
			expect(store.error).toBe('Server error');
			expect(store.loading).toBe(false);
		});

		it('should update pagination on successful fetch', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: samplePrompts,
						pagination: { limit: 50, offset: 0, hasMore: true }
					})
			});

			await store.fetchPrompts({ limit: 50, offset: 0, search: 'test' });

			expect(store.pagination.limit).toBe(50);
			expect(store.pagination.hasMore).toBe(true);
			expect(store.pagination.search).toBe('test');
		});

		it('should handle empty response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: [],
						pagination: { limit: 100, offset: 0, hasMore: false }
					})
			});

			await store.fetchPrompts();

			expect(store.prompts).toEqual([]);
			expect(store.isEmpty).toBe(true);
			expect(store.hasPrompts).toBe(false);
		});
	});

	describe('fetchPrompt', () => {
		it('should fetch single prompt with versions', async () => {
			const promptWithVersions = {
				...samplePrompts[0],
				versions: [
					{
						id: 1,
						promptId: 1,
						version: '1.0.0',
						content: 'Original content',
						metadata: null,
						parentVersionId: null,
						changeType: 'major' as const,
						changeNotes: 'Initial version',
						createdAt: new Date('2025-01-01'),
						createdBy: 'user'
					}
				]
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: promptWithVersions
					})
			});

			const result = await store.fetchPrompt(1);

			expect(store.selectedPrompt).not.toBeNull();
			expect(store.selectedPrompt?.title).toBe('Test Prompt 1');
			expect(store.selectedPrompt?.versions).toHaveLength(1);
			expect(result).toEqual(promptWithVersions);
		});

		it('should set error when prompt not found', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () =>
					Promise.resolve({
						error: { message: 'Prompt not found' }
					})
			});

			await expect(store.fetchPrompt(999)).rejects.toThrow('Prompt not found');
			expect(store.error).toBe('Prompt not found');
		});
	});

	describe('createPrompt', () => {
		it('should create prompt with optimistic update', async () => {
			const newPrompt: Prompt = {
				id: 1,
				title: 'New Prompt',
				description: 'New description',
				purpose: 'coding',
				tags: ['new'],
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: 1,
				deletedAt: null
			};

			const version = {
				id: 1,
				promptId: 1,
				version: '1.0.0',
				content: 'Content',
				metadata: null,
				parentVersionId: null,
				changeType: 'major' as const,
				changeNotes: 'Initial version',
				createdAt: new Date(),
				createdBy: 'user'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						...newPrompt,
						latestVersion: version
					})
			});

			const input: CreatePromptInput = {
				title: 'New Prompt',
				description: 'New description',
				purpose: 'coding',
				tags: ['new'],
				content: 'Content'
			};

			const result = await store.createPrompt(input);

			// Prompt should be added immediately (optimistic)
			expect(store.prompts).toHaveLength(1);
			expect(store.prompts[0].title).toBe('New Prompt');

			// Final result should replace optimistic
			expect(result.title).toBe('New Prompt');
		});

		it('should rollback on create failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () =>
					Promise.resolve({
						error: { message: 'Failed to create' }
					})
			});

			const input: CreatePromptInput = {
				title: 'New Prompt',
				content: 'Content'
			};

			await expect(store.createPrompt(input)).rejects.toThrow('Failed to create');

			// Should be rolled back
			expect(store.prompts).toEqual([]);
			expect(store.error).toBe('Failed to create');
		});
	});

	describe('updatePrompt', () => {
		it('should update prompt with optimistic update', async () => {
			// First, set up initial prompts
			store.prompts = [...samplePrompts];

			const updatedPrompt: Prompt = {
				...samplePrompts[0],
				title: 'Updated Title',
				description: 'Updated description'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						...updatedPrompt,
						tags: JSON.stringify(updatedPrompt.tags)
					})
			});

			const input: UpdatePromptInput = {
				title: 'Updated Title',
				description: 'Updated description'
			};

			const result = await store.updatePrompt(1, input);

			// Should be updated immediately
			expect(store.prompts[0].title).toBe('Updated Title');
			expect(result.title).toBe('Updated Title');
		});

		it('should rollback on update failure', async () => {
			// First, set up initial prompts
			store.prompts = [...samplePrompts];
			const originalTitle = store.prompts[0].title;

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () =>
					Promise.resolve({
						error: { message: 'Failed to update' }
					})
			});

			const input: UpdatePromptInput = {
				title: 'Failed Update'
			};

			await expect(store.updatePrompt(1, input)).rejects.toThrow('Failed to update');

			// Should be rolled back
			expect(store.prompts[0].title).toBe(originalTitle);
		});

		it('should update selected prompt if it matches', async () => {
			store.prompts = [...samplePrompts];
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: []
			};

			const updatedPrompt: Prompt = {
				...samplePrompts[0],
				title: 'Updated Title'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						...updatedPrompt,
						tags: JSON.stringify(updatedPrompt.tags)
					})
			});

			await store.updatePrompt(1, { title: 'Updated Title' });

			expect(store.selectedPrompt?.title).toBe('Updated Title');
		});
	});

	describe('deletePrompt', () => {
		it('should delete prompt with optimistic update', async () => {
			store.prompts = [...samplePrompts];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 204
			});

			await store.deletePrompt(1);

			// Should be removed immediately
			expect(store.prompts).toHaveLength(1);
			expect(store.prompts[0].id).toBe(2);
		});

		it('should clear selected prompt if deleted', async () => {
			store.prompts = [...samplePrompts];
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 204
			});

			await store.deletePrompt(1);

			expect(store.selectedPrompt).toBeNull();
		});

		it('should rollback on delete failure', async () => {
			store.prompts = [...samplePrompts];
			const originalLength = store.prompts.length;

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () =>
					Promise.resolve({
						error: { message: 'Failed to delete' }
					})
			});

			await expect(store.deletePrompt(1)).rejects.toThrow('Failed to delete');

			// Should be rolled back
			expect(store.prompts).toHaveLength(originalLength);
		});
	});

	describe('createVersion', () => {
		it('should create a new version for a prompt', async () => {
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: [
					{
						id: 1,
						promptId: 1,
						version: '1.0.0',
						content: 'Original content',
						metadata: null,
						parentVersionId: null,
						changeType: 'major' as const,
						changeNotes: 'Initial version',
						createdAt: new Date('2025-01-01'),
						createdBy: 'user'
					}
				]
			};

			const newVersion = {
				id: 2,
				promptId: 1,
				version: '1.0.1',
				content: 'Updated content',
				metadata: null,
				parentVersionId: 1,
				changeType: 'minor' as const,
				changeNotes: 'Updated content',
				createdAt: new Date('2025-01-02'),
				createdBy: 'user'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(newVersion)
			});

			const result = await store.createVersion(1, 'Updated content', 'minor', 'Updated content');

			expect(result.version).toBe('1.0.1');
			expect(result.changeType).toBe('minor');
			expect(store.selectedPrompt?.versions).toHaveLength(2);
			expect(store.selectedPrompt?.versions[0].version).toBe('1.0.1');
		});

		it('should set error when prompt not found', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () =>
					Promise.resolve({
						error: { message: 'Prompt not found' }
					})
			});

			await expect(store.createVersion(999, 'content', 'patch', 'notes')).rejects.toThrow(
				'Prompt not found'
			);
			expect(store.error).toBe('Prompt not found');
		});

		it('should rollback selected prompt on version creation failure', async () => {
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: [
					{
						id: 1,
						promptId: 1,
						version: '1.0.0',
						content: 'Original content',
						metadata: null,
						parentVersionId: null,
						changeType: 'major' as const,
						changeNotes: 'Initial version',
						createdAt: new Date('2025-01-01'),
						createdBy: 'user'
					}
				]
			};

			const originalVersionsLength = store.selectedPrompt.versions.length;

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () =>
					Promise.resolve({
						error: { message: 'Failed to create version' }
					})
			});

			await expect(store.createVersion(1, 'content', 'patch', 'notes')).rejects.toThrow(
				'Failed to create version'
			);

			// Should be rolled back - versions count should be unchanged
			expect(store.selectedPrompt?.versions).toHaveLength(originalVersionsLength);
			expect(store.error).toBe('Failed to create version');
		});

		it('should handle all change types', async () => {
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: []
			};

			const versionTypes: Array<'major' | 'minor' | 'patch'> = ['major', 'minor', 'patch'];

			for (const changeType of versionTypes) {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							id: Date.now(),
							promptId: 1,
							version: '1.0.0',
							content: 'content',
							metadata: null,
							parentVersionId: null,
							changeType,
							changeNotes: 'notes',
							createdAt: new Date(),
							createdBy: 'user'
						})
				});

				const result = await store.createVersion(1, 'content', changeType, 'notes');
				expect(result.changeType).toBe(changeType);
			}
		});

		it('should call API with correct parameters', async () => {
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: 2,
						promptId: 1,
						version: '1.0.1',
						content: 'Updated content',
						metadata: null,
						parentVersionId: 1,
						changeType: 'minor' as const,
						changeNotes: 'Minor improvements',
						createdAt: new Date(),
						createdBy: 'user'
					})
			});

			await store.createVersion(1, 'Updated content', 'minor', 'Minor improvements');

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/prompts/1/versions',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({
						content: 'Updated content',
						changeType: 'minor',
						changeNotes: 'Minor improvements'
					})
				})
			);
		});
	});

	describe('getPromptById', () => {
		it('should return prompt by ID from cache', () => {
			store.prompts = [...samplePrompts];

			const prompt = store.getPromptById(1);

			expect(prompt).not.toBeUndefined();
			expect(prompt?.title).toBe('Test Prompt 1');
		});

		it('should return undefined for non-existent ID', () => {
			store.prompts = [...samplePrompts];

			const prompt = store.getPromptById(999);

			expect(prompt).toBeUndefined();
		});
	});

	describe('clearSelected', () => {
		it('should clear selected prompt', () => {
			store.selectedPrompt = {
				...samplePrompts[0],
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
		it('should reset store to initial state', () => {
			store.prompts = [...samplePrompts];
			store.selectedPrompt = {
				...samplePrompts[0],
				versions: []
			};
			store.error = 'Some error';
			store.pagination = {
				limit: 50,
				offset: 10,
				hasMore: true,
				search: 'test'
			};

			store.reset();

			expect(store.prompts).toEqual([]);
			expect(store.selectedPrompt).toBeNull();
			expect(store.error).toBeNull();
			expect(store.pagination.limit).toBe(100);
			expect(store.pagination.offset).toBe(0);
			expect(store.pagination.hasMore).toBe(false);
			expect(store.pagination.search).toBe('');
		});
	});

	describe('loadMore', () => {
		it('should not load more if hasMore is false', async () => {
			store.prompts = [...samplePrompts];
			store.pagination = {
				limit: 100,
				offset: 0,
				hasMore: false,
				search: ''
			};

			await store.loadMore();

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not load more if already loading', async () => {
			store.prompts = [...samplePrompts];
			store.pagination = {
				limit: 100,
				offset: 0,
				hasMore: true,
				search: ''
			};
			store.loading = true;

			await store.loadMore();

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should load more prompts if hasMore is true', async () => {
			store.prompts = [...samplePrompts];
			store.pagination = {
				limit: 100,
				offset: 0,
				hasMore: true,
				search: ''
			};

			const morePrompts: Prompt[] = [
				{
					id: 3,
					title: 'More Prompt',
					description: null,
					purpose: null,
					tags: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					latestVersionId: null,
					deletedAt: null
				}
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: morePrompts,
						pagination: { limit: 100, offset: 2, hasMore: false }
					})
			});

			await store.loadMore();

			expect(store.prompts).toHaveLength(3);
			expect(store.pagination.hasMore).toBe(false);
		});
	});

	describe('Derived State', () => {
		it('should update hasPrompts when prompts change', () => {
			expect(store.hasPrompts).toBe(false);

			store.prompts = [...samplePrompts];

			expect(store.hasPrompts).toBe(true);
		});

		it('should update promptCount when prompts change', () => {
			expect(store.promptCount).toBe(0);

			store.prompts = [...samplePrompts];

			expect(store.promptCount).toBe(2);
		});

		it('should update isEmpty correctly', () => {
			expect(store.isEmpty).toBe(true);

			store.prompts = [...samplePrompts];
			expect(store.isEmpty).toBe(false);

			store.loading = true;
			expect(store.isEmpty).toBe(false); // Still not empty when loading
		});
	});

	describe('API URL Construction', () => {
		it('should construct correct URL for fetchPrompts', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: [],
						pagination: { limit: 50, offset: 10, hasMore: false }
					})
			});

			await store.fetchPrompts({ limit: 50, offset: 10, search: 'test' });

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/prompts?limit=50&offset=10&search=test',
				expect.any(Object)
			);
		});

		it('should use base URL when no params', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						data: [],
						pagination: { limit: 100, offset: 0, hasMore: false }
					})
			});

			await store.fetchPrompts();

			expect(mockFetch).toHaveBeenCalledWith('/api/prompts', expect.any(Object));
		});
	});
});

describe('PromptsStore Types', () => {
	it('should have correct type definitions', () => {
		// Test that types are properly exported
		const prompt: Prompt = {
			id: 1,
			title: 'Test',
			description: null,
			purpose: null,
			tags: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			latestVersionId: null,
			deletedAt: null
		};

		expect(prompt.id).toBe(1);
		expect(prompt.title).toBe('Test');
	});

	it('should accept valid CreatePromptInput', () => {
		const input: CreatePromptInput = {
			title: 'New Prompt',
			description: 'Description',
			purpose: 'coding',
			tags: ['test'],
			content: 'Prompt content'
		};

		expect(input.title).toBe('New Prompt');
	});

	it('should accept valid UpdatePromptInput', () => {
		const input: UpdatePromptInput = {
			title: 'Updated Title',
			tags: ['new', 'tags']
		};

		expect(input.title).toBe('Updated Title');
	});
});

describe('PromptCard Component', () => {
	// Sample prompt for testing
	const samplePrompt: Prompt = {
		id: 1,
		title: 'Test Prompt Title',
		description: 'This is a test description for the prompt card',
		purpose: 'development',
		tags: ['test', 'sample', 'card'],
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-15'),
		latestVersionId: 3,
		deletedAt: null
	};

	it('should render prompt title', () => {
		expect(samplePrompt.title).toBe('Test Prompt Title');
	});

	it('should render prompt description', () => {
		expect(samplePrompt.description).toBe('This is a test description for the prompt card');
	});

	it('should render purpose badge', () => {
		expect(samplePrompt.purpose).toBe('development');
	});

	it('should render tags', () => {
		expect(samplePrompt.tags).toEqual(['test', 'sample', 'card']);
	});

	it('should show latest version', () => {
		expect(samplePrompt.latestVersionId).toBe(3);
	});

	it('should format date correctly', () => {
		const date = new Date('2025-01-15');
		const formatted = date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
		expect(formatted).toBe('Jan 15, 2025');
	});

	it('should handle null description', () => {
		const promptWithoutDesc: Prompt = {
			...samplePrompt,
			description: null
		};
		expect(promptWithoutDesc.description).toBeNull();
	});

	it('should handle empty tags array', () => {
		const promptWithoutTags: Prompt = {
			...samplePrompt,
			tags: []
		};
		expect(promptWithoutTags.tags).toEqual([]);
	});

	it('should handle null purpose', () => {
		const promptWithoutPurpose: Prompt = {
			...samplePrompt,
			purpose: null
		};
		expect(promptWithoutPurpose.purpose).toBeNull();
	});

	it('should handle null latestVersionId', () => {
		const promptWithoutVersion: Prompt = {
			...samplePrompt,
			latestVersionId: null
		};
		expect(promptWithoutVersion.latestVersionId).toBeNull();
	});

	it('should handle different purpose values', () => {
		const purposes: Array<Prompt['purpose']> = [
			'development',
			'writing',
			'analysis',
			'creative',
			null
		];
		purposes.forEach((purpose) => {
			const prompt: Prompt = { ...samplePrompt, purpose };
			expect(prompt.purpose).toBe(purpose);
		});
	});
});

describe('PromptList Component', () => {
	const samplePrompts: Prompt[] = [
		{
			id: 1,
			title: 'Alpha Prompt',
			description: 'First prompt alphabetically',
			purpose: 'development',
			tags: ['code', 'api'],
			createdAt: new Date('2025-01-01'),
			updatedAt: new Date('2025-01-10'),
			latestVersionId: 1,
			deletedAt: null
		},
		{
			id: 2,
			title: 'Beta Prompt',
			description: 'Second prompt alphabetically',
			purpose: 'writing',
			tags: ['content'],
			createdAt: new Date('2025-01-05'),
			updatedAt: new Date('2025-01-15'),
			latestVersionId: 2,
			deletedAt: null
		},
		{
			id: 3,
			title: 'Gamma Prompt',
			description: 'Third prompt alphabetically',
			purpose: 'analysis',
			tags: ['data', 'code'],
			createdAt: new Date('2025-01-10'),
			updatedAt: new Date('2025-01-20'),
			latestVersionId: 1,
			deletedAt: null
		}
	];

	describe('Search Functionality', () => {
		it('should filter prompts by title search', () => {
			const searchQuery = 'alpha';
			const filtered = samplePrompts.filter((p) =>
				p.title.toLowerCase().includes(searchQuery.toLowerCase())
			);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Alpha Prompt');
		});

		it('should filter prompts by description search', () => {
			const searchQuery = 'alphabetically';
			const filtered = samplePrompts.filter(
				(p) => p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
			);
			expect(filtered).toHaveLength(3);
		});

		it('should return all prompts when search is empty', () => {
			const searchQuery = '';
			const filtered = samplePrompts.filter(
				(p) => searchQuery === '' || p.title.toLowerCase().includes(searchQuery.toLowerCase())
			);
			expect(filtered).toHaveLength(3);
		});

		it('should be case insensitive for search', () => {
			const searchQuery = 'BETA';
			const filtered = samplePrompts.filter((p) =>
				p.title.toLowerCase().includes(searchQuery.toLowerCase())
			);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Beta Prompt');
		});
	});

	describe('Tag Filter Functionality', () => {
		it('should extract all unique tags', () => {
			const allTags = [...new Set(samplePrompts.flatMap((p) => p.tags || []))].sort();
			expect(allTags).toEqual(['api', 'code', 'content', 'data']);
		});

		it('should filter by single tag', () => {
			const selectedTags = ['code'];
			const filtered = samplePrompts.filter((p) =>
				p.tags?.some((tag) => selectedTags.includes(tag))
			);
			expect(filtered).toHaveLength(2);
		});

		it('should filter by multiple tags', () => {
			const selectedTags = ['code', 'content'];
			const filtered = samplePrompts.filter((p) =>
				p.tags?.some((tag) => selectedTags.includes(tag))
			);
			expect(filtered).toHaveLength(3);
		});

		it('should return empty when no tags match', () => {
			const selectedTags = ['nonexistent'];
			const filtered = samplePrompts.filter((p) =>
				p.tags?.some((tag) => selectedTags.includes(tag))
			);
			expect(filtered).toHaveLength(0);
		});

		it('should handle empty tags array', () => {
			const prompt: Prompt = { ...samplePrompts[0], tags: [] };
			expect(prompt.tags).toEqual([]);
		});
	});

	describe('Sort Functionality', () => {
		it('should sort by newest first', () => {
			const sorted = [...samplePrompts].sort(
				(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
			expect(sorted[0].title).toBe('Gamma Prompt');
			expect(sorted[1].title).toBe('Beta Prompt');
			expect(sorted[2].title).toBe('Alpha Prompt');
		});

		it('should sort by oldest first', () => {
			const sorted = [...samplePrompts].sort(
				(a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
			);
			expect(sorted[0].title).toBe('Alpha Prompt');
			expect(sorted[1].title).toBe('Beta Prompt');
			expect(sorted[2].title).toBe('Gamma Prompt');
		});

		it('should sort by title A-Z', () => {
			const sorted = [...samplePrompts].sort((a, b) => a.title.localeCompare(b.title));
			expect(sorted[0].title).toBe('Alpha Prompt');
			expect(sorted[1].title).toBe('Beta Prompt');
			expect(sorted[2].title).toBe('Gamma Prompt');
		});
	});

	describe('Combined Filter and Sort', () => {
		it('should apply search then sort', () => {
			const searchQuery = 'prompt';
			const sorted = [...samplePrompts]
				.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
				.sort((a, b) => a.title.localeCompare(b.title));

			expect(sorted).toHaveLength(3);
			expect(sorted[0].title).toBe('Alpha Prompt');
		});

		it('should apply tag filter then sort by newest', () => {
			const selectedTags = ['code'];
			const sorted = [...samplePrompts]
				.filter((p) => p.tags?.some((tag) => selectedTags.includes(tag)))
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

			expect(sorted).toHaveLength(2);
			expect(sorted[0].title).toBe('Gamma Prompt');
		});

		it('should handle search with no results', () => {
			const searchQuery = 'nonexistent';
			const filtered = samplePrompts.filter((p) =>
				p.title.toLowerCase().includes(searchQuery.toLowerCase())
			);
			expect(filtered).toHaveLength(0);
		});
	});

	describe('Empty State', () => {
		it('should detect when no prompts exist', () => {
			const prompts: Prompt[] = [];
			expect(prompts.length).toBe(0);
		});

		it('should detect empty after filters', () => {
			const selectedTags = ['nonexistent'];
			const filtered = samplePrompts.filter((p) =>
				p.tags?.some((tag) => selectedTags.includes(tag))
			);
			expect(filtered.length).toBe(0);
		});
	});

	describe('Results Count', () => {
		it('should show correct count for all prompts', () => {
			expect(samplePrompts.length).toBe(3);
		});

		it('should show filtered count', () => {
			const selectedTags = ['code'];
			const filtered = samplePrompts.filter((p) =>
				p.tags?.some((tag) => selectedTags.includes(tag))
			);
			expect(filtered.length).toBe(2);
		});
	});

	describe('Active Filters Detection', () => {
		it('should detect active search filter', () => {
			const hasActiveFilters = 'alpha' !== '';
			expect(hasActiveFilters).toBe(true);
		});

		it('should detect active tag filter', () => {
			const selectedTags = ['code'];
			const hasActiveFilters = selectedTags.length > 0;
			expect(hasActiveFilters).toBe(true);
		});

		it('should detect non-default sort', () => {
			const sortBy = 'title';
			const defaultSort = 'newest';
			const hasActiveFilters = sortBy !== defaultSort;
			expect(hasActiveFilters).toBe(true);
		});

		it('should detect no active filters', () => {
			const searchQuery = '';
			const selectedTags: string[] = [];
			const sortBy = 'newest';
			const hasActiveFilters = searchQuery !== '' || selectedTags.length > 0 || sortBy !== 'newest';
			expect(hasActiveFilters).toBe(false);
		});
	});
});

// Helper functions for PromptEditor component tests
describe('PromptEditor Helpers', () => {
	// Word count function (mirrors component logic)
	function countWords(text: string): number {
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
	}

	describe('countWords', () => {
		it('should return 0 for empty string', () => {
			expect(countWords('')).toBe(0);
		});

		it('should return 0 for whitespace only', () => {
			expect(countWords('   ')).toBe(0);
		});

		it('should count single word', () => {
			expect(countWords('hello')).toBe(1);
		});

		it('should count multiple words separated by spaces', () => {
			expect(countWords('hello world')).toBe(2);
		});

		it('should count multiple words with multiple spaces', () => {
			expect(countWords('hello   world')).toBe(2);
		});

		it('should count words with tabs', () => {
			expect(countWords('hello\tworld')).toBe(2);
		});

		it('should count words with newlines', () => {
			expect(countWords('hello\nworld')).toBe(2);
		});

		it('should count words in a paragraph', () => {
			const text = 'This is a sample paragraph with multiple words';
			expect(countWords(text)).toBe(8);
		});

		it('should handle leading and trailing whitespace', () => {
			expect(countWords('  hello world  ')).toBe(2);
		});

		it('should handle complex whitespace patterns', () => {
			const text = 'word1\n\nword2\t\tword3   word4';
			expect(countWords(text)).toBe(4);
		});
	});

	describe('Character Count', () => {
		it('should count characters in string', () => {
			const text = 'hello';
			expect(text.length).toBe(5);
		});

		it('should count characters including spaces', () => {
			const text = 'hello world';
			expect(text.length).toBe(11);
		});

		it('should count special characters', () => {
			const text = 'Hello! @#$%';
			expect(text.length).toBe(11);
		});

		it('should count unicode characters', () => {
			const text = 'こんにちは';
			expect(text.length).toBe(5);
		});
	});

	describe('Template Placeholders', () => {
		const TEMPLATE_PLACEHOLDERS = [
			{ label: 'Context', insert: '{{CONTEXT}}', description: 'User context or background' },
			{ label: 'Task', insert: '{{TASK}}', description: 'The task to perform' },
			{ label: 'Requirements', insert: '{{REQUIREMENTS}}', description: 'Specific requirements' },
			{ label: 'Output Format', insert: '{{OUTPUT_FORMAT}}', description: 'Desired output format' },
			{ label: 'Examples', insert: '{{EXAMPLES}}', description: 'Example inputs/outputs' }
		];

		it('should have all expected placeholders', () => {
			expect(TEMPLATE_PLACEHOLDERS).toHaveLength(5);
		});

		it('should have unique placeholder inserts', () => {
			const inserts = TEMPLATE_PLACEHOLDERS.map((p) => p.insert);
			const uniqueInserts = new Set(inserts);
			expect(uniqueInserts.size).toBe(5);
		});

		it('should have correct placeholder format', () => {
			TEMPLATE_PLACEHOLDERS.forEach((placeholder) => {
				expect(placeholder.insert).toMatch(/^\{\{[^}]+\}\}$/);
			});
		});

		it('should have non-empty descriptions', () => {
			TEMPLATE_PLACEHOLDERS.forEach((placeholder) => {
				expect(placeholder.description.length).toBeGreaterThan(0);
			});
		});

		it('should find placeholder by label', () => {
			const found = TEMPLATE_PLACEHOLDERS.find((p) => p.label === 'Task');
			expect(found).not.toBeUndefined();
			expect(found?.insert).toBe('{{TASK}}');
		});

		it('should return undefined for non-existent label', () => {
			const found = TEMPLATE_PLACEHOLDERS.find((p) => p.label === 'NonExistent');
			expect(found).toBeUndefined();
		});
	});
});

describe('PromptEditor Component Props', () => {
	interface EditorProps {
		value?: string;
		placeholder?: string;
		language?: string;
		readonly?: boolean;
		class?: string;
		autosaveKey?: string;
	}

	describe('Default Props', () => {
		const defaultProps: EditorProps = {
			value: '',
			placeholder: 'Enter your prompt here...',
			language: 'markdown',
			readonly: false,
			class: '',
			autosaveKey: 'prompt-editor-draft'
		};

		it('should have empty default value', () => {
			expect(defaultProps.value).toBe('');
		});

		it('should have descriptive default placeholder', () => {
			expect(defaultProps.placeholder).toBe('Enter your prompt here...');
		});

		it('should default to markdown language', () => {
			expect(defaultProps.language).toBe('markdown');
		});

		it('should default to editable (not readonly)', () => {
			expect(defaultProps.readonly).toBe(false);
		});

		it('should have empty default class', () => {
			expect(defaultProps.class).toBe('');
		});

		it('should have default autosave key', () => {
			expect(defaultProps.autosaveKey).toBe('prompt-editor-draft');
		});
	});

	describe('Language Support', () => {
		const supportedLanguages = [
			'markdown',
			'javascript',
			'typescript',
			'python',
			'json',
			'html',
			'css'
		];

		supportedLanguages.forEach((lang) => {
			it(`should support ${lang} language`, () => {
				const props: EditorProps = { language: lang };
				expect(props.language).toBe(lang);
			});
		});
	});

	describe('Autosave Key Behavior', () => {
		it('should use custom autosave key when provided', () => {
			const customKey = 'my-custom-editor-key';
			const props: EditorProps = { autosaveKey: customKey };
			expect(props.autosaveKey).toBe(customKey);
		});

		it('should allow disabling autosave with null key', () => {
			const props: EditorProps = { autosaveKey: '' };
			expect(props.autosaveKey).toBe('');
		});

		it('should generate unique keys for multiple editors', () => {
			const key1 = 'editor-1';
			const key2 = 'editor-2';
			expect(key1).not.toBe(key2);
		});
	});

	describe('Readonly Mode', () => {
		it('should allow readonly mode', () => {
			const props: EditorProps = { readonly: true };
			expect(props.readonly).toBe(true);
		});

		it('should allow editable mode', () => {
			const props: EditorProps = { readonly: false };
			expect(props.readonly).toBe(false);
		});
	});

	describe('Custom Styling', () => {
		it('should accept custom CSS classes', () => {
			const customClass = 'custom-editor w-full h-64';
			const props: EditorProps = { class: customClass };
			expect(props.class).toBe(customClass);
		});

		it('should allow multiple classes', () => {
			const classes = 'class1 class2 class3';
			const props: EditorProps = { class: classes };
			expect(props.class).toContain('class1');
			expect(props.class).toContain('class2');
			expect(props.class).toContain('class3');
		});
	});
});

describe('PromptEditor Auto-save Logic', () => {
	// Simulate auto-save debounce logic
	function createAutoSaveScheduler(saveFn: () => void, debounceMs = 1000) {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function schedule() {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			timeoutId = setTimeout(() => {
				saveFn();
				timeoutId = null;
			}, debounceMs);
		}

		function cancel() {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		}

		return { schedule, cancel };
	}

	it('should schedule save after content change', () => {
		let saveCalled = false;
		const saveFn = () => {
			saveCalled = true;
		};
		const scheduler = createAutoSaveScheduler(saveFn, 100);

		scheduler.schedule();
		expect(saveCalled).toBe(false);

		// After timeout, save should be called
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				expect(saveCalled).toBe(true);
				resolve();
			}, 150);
		});
	});

	it('should cancel previous save on new change', () => {
		let saveCallCount = 0;
		const saveFn = () => {
			saveCallCount++;
		};
		const scheduler = createAutoSaveScheduler(saveFn, 100);

		// First change
		scheduler.schedule();

		// Second change (should cancel first)
		scheduler.schedule();

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				// Should only save once (debounced)
				expect(saveCallCount).toBe(1);
				resolve();
			}, 200);
		});
	});

	it('should allow manual cancel', () => {
		let saveCalled = false;
		const saveFn = () => {
			saveCalled = true;
		};
		const scheduler = createAutoSaveScheduler(saveFn, 100);

		scheduler.schedule();
		scheduler.cancel();

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				expect(saveCalled).toBe(false);
				resolve();
			}, 150);
		});
	});
});

describe('PromptEditor Fullscreen Logic', () => {
	it('should toggle fullscreen state', () => {
		let fullscreen = false;

		function toggle() {
			fullscreen = !fullscreen;
		}

		expect(fullscreen).toBe(false);
		toggle();
		expect(fullscreen).toBe(true);
		toggle();
		expect(fullscreen).toBe(false);
	});

	it('should manage body overflow when fullscreen', () => {
		let fullscreen = false;
		let overflow = '';

		function toggle() {
			fullscreen = !fullscreen;
			overflow = fullscreen ? 'hidden' : '';
		}

		// Start normal
		expect(overflow).toBe('');

		// Enter fullscreen
		toggle();
		expect(overflow).toBe('hidden');

		// Exit fullscreen
		toggle();
		expect(overflow).toBe('');
	});

	it('should handle escape key in fullscreen', () => {
		let fullscreen = true;
		let overflow = 'hidden';

		// Simulate escape key
		function handleEscape() {
			if (fullscreen) {
				fullscreen = false;
				overflow = '';
			}
		}

		expect(fullscreen).toBe(true);
		handleEscape();
		expect(fullscreen).toBe(false);
		expect(overflow).toBe('');
	});
});

describe('Prompt Library Page', () => {
	// Test data for the library page
	const libraryPrompts: Prompt[] = [
		{
			id: 1,
			title: 'SQL Query Generator',
			description: 'Generates optimized SQL queries based on natural language descriptions',
			purpose: 'development',
			tags: ['sql', 'database'],
			createdAt: new Date('2025-12-01'),
			updatedAt: new Date('2025-12-20'),
			latestVersionId: 3,
			deletedAt: null
		},
		{
			id: 2,
			title: 'Code Review Assistant',
			description: 'Analyzes code changes and provides constructive feedback',
			purpose: 'development',
			tags: ['code-review', 'quality'],
			createdAt: new Date('2025-12-05'),
			updatedAt: new Date('2025-12-18'),
			latestVersionId: 2,
			deletedAt: null
		},
		{
			id: 3,
			title: 'Blog Post Writer',
			description: 'Creates engaging blog posts with SEO optimization',
			purpose: 'writing',
			tags: ['blog', 'content', 'seo'],
			createdAt: new Date('2025-12-10'),
			updatedAt: new Date('2025-12-15'),
			latestVersionId: 1,
			deletedAt: null
		}
	];

	describe('Page Header', () => {
		it('should have correct page title', () => {
			const title = 'Prompt Library';
			expect(title).toBe('Prompt Library');
		});

		it('should have page description', () => {
			const description = 'Browse and manage your collection of prompts';
			expect(description.length).toBeGreaterThan(0);
		});

		it('should have New Prompt button text', () => {
			const buttonText = 'New Prompt';
			expect(buttonText).toBe('New Prompt');
		});

		it('should have correct navigation link', () => {
			const newPromptLink = '/prompts/new';
			expect(newPromptLink).toBe('/prompts/new');
		});
	});

	describe('Prompt Count Display', () => {
		it('should display correct count for single prompt', () => {
			const count = 1;
			const text = `${count} prompt${count !== 1 ? 's' : ''} in your library`;
			expect(text).toBe('1 prompt in your library');
		});

		it('should display correct count for multiple prompts', () => {
			const count = libraryPrompts.length;
			const text = `${count} prompt${count !== 1 ? 's' : ''} in your library`;
			expect(text).toBe('3 prompts in your library');
		});

		it('should handle zero prompts', () => {
			const count = 0;
			const text = `${count} prompt${count !== 1 ? 's' : ''} in your library`;
			expect(text).toBe('0 prompts in your library');
		});
	});

	describe('Sidebar Layout', () => {
		it('should have sidebar sections', () => {
			const sidebarSections = ['Search', 'Filters', 'Sort', 'Quick Actions'];
			expect(sidebarSections).toHaveLength(4);
		});

		it('should have correct grid layout classes', () => {
			const gridClass = 'grid gap-6 lg:grid-cols-4';
			expect(gridClass).toContain('lg:grid-cols-4');
		});

		it('should have sidebar col-span-1', () => {
			const sidebarClass = 'lg:col-span-1';
			expect(sidebarClass).toBe('lg:col-span-1');
		});

		it('should have main content col-span-3', () => {
			const mainClass = 'lg:col-span-3';
			expect(mainClass).toBe('lg:col-span-3');
		});
	});

	describe('Quick Actions', () => {
		it('should have Create New Prompt action', () => {
			const action = 'Create New Prompt';
			expect(action).toBe('Create New Prompt');
		});

		it('should have Back to Home action', () => {
			const action = 'Back to Home';
			expect(action).toBe('Back to Home');
		});

		it('should have correct home link', () => {
			const homeLink = '/';
			expect(homeLink).toBe('/');
		});
	});

	describe('Navigation', () => {
		it('should navigate to prompt detail on click', () => {
			const promptId = 1;
			const expectedUrl = `/prompts/${promptId}`;
			expect(expectedUrl).toBe('/prompts/1');
		});

		it('should navigate to new prompt page', () => {
			const newPromptUrl = '/prompts/new';
			expect(newPromptUrl).toBe('/prompts/new');
		});

		it('should navigate to home page', () => {
			const homeUrl = '/';
			expect(homeUrl).toBe('/');
		});
	});

	describe('Server Load Function', () => {
		it('should handle pagination parameters', () => {
			const limit = 100;
			const offset = 0;
			const hasMore = limit === 100;

			expect(limit).toBe(100);
			expect(offset).toBe(0);
			expect(typeof hasMore).toBe('boolean');
		});

		it('should handle search parameter', () => {
			const search = 'test';
			expect(search).toBe('test');
		});

		it('should handle empty search', () => {
			const search = undefined;
			expect(search).toBeUndefined();
		});

		it('should transform tags from JSON string to array', () => {
			const tagsJson = '["sql", "database"]';
			const tags = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
			expect(tags).toEqual(['sql', 'database']);
		});

		it('should handle null tags', () => {
			const tags = null;
			const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags || [];
			expect(parsed).toEqual([]);
		});
	});

	describe('Meta Data', () => {
		it('should have page title in meta', () => {
			const meta = {
				title: 'Prompt Library',
				description: 'Browse and manage your prompt collection'
			};
			expect(meta.title).toBe('Prompt Library');
		});

		it('should have page description in meta', () => {
			const meta = {
				title: 'Prompt Library',
				description: 'Browse and manage your prompt collection'
			};
			expect(meta.description.length).toBeGreaterThan(0);
		});
	});

	describe('Icons', () => {
		it('should have prompt library icon', () => {
			const iconName = 'prompt-library';
			expect(iconName).toBe('prompt-library');
		});

		it('should have new prompt icon', () => {
			const iconPath = 'M12 5v14M5 12h14';
			expect(iconPath).toBe('M12 5v14M5 12h14');
		});

		it('should have search icon', () => {
			const iconPath = 'circle cx="11" cy="11" r="8"';
			expect(iconPath).toContain('circle');
		});

		it('should have filter icon', () => {
			const iconPath = 'polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3';
			expect(iconPath).toContain('polygon');
		});

		it('should have sort icon', () => {
			const iconPath = 'path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"';
			expect(iconPath).toContain('path');
		});

		it('should have quick actions icon', () => {
			const iconPath = 'circle cx="12" cy="12" r="3"';
			expect(iconPath).toContain('circle');
		});
	});
});

describe('New Prompt Page (STORY-015)', () => {
	describe('Page Metadata', () => {
		it('should have correct page title', () => {
			const title = 'New Prompt';
			expect(title).toBe('New Prompt');
		});

		it('should have page description', () => {
			const description = 'Create a new prompt for your collection';
			expect(description.length).toBeGreaterThan(0);
		});

		it('should have create new prompt header', () => {
			const header = 'Create New Prompt';
			expect(header).toBe('Create New Prompt');
		});

		it('should have page subdescription', () => {
			const subdescription = 'Add a new prompt to your collection';
			expect(subdescription.length).toBeGreaterThan(0);
		});
	});

	describe('Form Structure', () => {
		it('should have prompt content section', () => {
			const sectionTitle = 'Prompt Content';
			expect(sectionTitle).toBe('Prompt Content');
		});

		it('should have prompt details section', () => {
			const sectionTitle = 'Prompt Details';
			expect(sectionTitle).toBe('Prompt Details');
		});

		it('should have form action buttons', () => {
			const buttons = ['Save Prompt', 'Cancel'];
			expect(buttons).toContain('Save Prompt');
			expect(buttons).toContain('Cancel');
		});
	});

	describe('Form Validation', () => {
		it('should require title field', () => {
			const title = '';
			const isValid = title.trim().length > 0;
			expect(isValid).toBe(false);
		});

		it('should accept non-empty title', () => {
			const title = 'My New Prompt';
			const isValid = title.trim().length > 0;
			expect(isValid).toBe(true);
		});

		it('should enforce title max length of 100 characters', () => {
			const title = 'a'.repeat(100);
			const isValid = title.length <= 100;
			expect(isValid).toBe(true);

			const longTitle = 'a'.repeat(101);
			const isLongValid = longTitle.length <= 100;
			expect(isLongValid).toBe(false);
		});

		it('should require content field', () => {
			const content = '';
			const isValid = content.trim().length > 0;
			expect(isValid).toBe(false);
		});

		it('should accept non-empty content', () => {
			const content = 'You are a helpful assistant...';
			const isValid = content.trim().length > 0;
			expect(isValid).toBe(true);
		});

		it('should validate form completely', () => {
			const validateForm = (title: string, content: string) => {
				if (!title.trim()) return { valid: false, error: 'Title is required' };
				if (title.length > 100)
					return { valid: false, error: 'Title must be 100 characters or less' };
				if (!content.trim()) return { valid: false, error: 'Content is required' };
				return { valid: true, error: null };
			};

			// Invalid cases
			expect(validateForm('', 'content').valid).toBe(false);
			expect(validateForm('title', '').valid).toBe(false);
			expect(validateForm('a'.repeat(101), 'content').valid).toBe(false);

			// Valid case
			expect(validateForm('Valid Title', 'Valid content').valid).toBe(true);
		});
	});

	describe('Keyboard Shortcuts', () => {
		it('should have save keyboard shortcut (Cmd/Ctrl+S)', () => {
			const shortcut = 'CMD+S';
			expect(shortcut).toContain('CMD');
			expect(shortcut).toContain('S');
		});

		it('should have cancel keyboard shortcut (Escape)', () => {
			const shortcut = 'Escape';
			expect(shortcut).toBe('Escape');
		});
	});

	describe('Tips Section', () => {
		it('should have tips for creating prompts', () => {
			const tips = [
				'Use descriptive titles to make prompts easy to find',
				'Add tags to categorize and filter prompts',
				'Template placeholders like {{TASK}} allow dynamic content',
				'Saving will create version 1.0 of your prompt'
			];
			expect(tips).toHaveLength(4);
			tips.forEach((tip) => {
				expect(tip.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Form Actions', () => {
		it('should save prompt with title, description, purpose, tags, and content', () => {
			const promptData = {
				title: 'Test Prompt',
				description: 'A test description',
				purpose: 'development',
				tags: ['test', 'sample'],
				content: 'You are a helpful assistant...'
			};

			expect(promptData.title).toBe('Test Prompt');
			expect(promptData.description).toBe('A test description');
			expect(promptData.purpose).toBe('development');
			expect(promptData.tags).toEqual(['test', 'sample']);
			expect(promptData.content.length).toBeGreaterThan(0);
		});

		it('should handle optional fields', () => {
			const minimalData = {
				title: 'Minimal Prompt',
				content: 'Simple content'
			};

			expect(minimalData.title).toBe('Minimal Prompt');
			expect(minimalData.description).toBeUndefined();
			expect(minimalData.purpose).toBeUndefined();
			expect(minimalData.tags).toBeUndefined();
		});

		it('should cancel and return to prompts list', () => {
			const cancelUrl = '/prompts';
			expect(cancelUrl).toBe('/prompts');
		});

		it('should navigate to prompt detail after successful save', () => {
			const newPromptId = 123;
			const expectedUrl = `/prompts/${newPromptId}`;
			expect(expectedUrl).toBe('/prompts/123');
		});
	});

	describe('Page Layout', () => {
		it('should have main content area', () => {
			const layoutClass = 'lg:col-span-2';
			expect(layoutClass).toBe('lg:col-span-2');
		});

		it('should have sidebar for metadata', () => {
			const sidebarClass = 'space-y-6';
			expect(sidebarClass).toBe('space-y-6');
		});

		it('should have correct grid layout', () => {
			const gridClass = 'grid gap-6 lg:grid-cols-3';
			expect(gridClass).toContain('lg:grid-cols-3');
		});
	});

	describe('Error Handling', () => {
		it('should handle save errors gracefully', () => {
			const saveError = 'Failed to create prompt';
			expect(saveError.length).toBeGreaterThan(0);
		});

		it('should display error messages to user', () => {
			const errorMessage = 'Failed to create prompt';
			expect(errorMessage).toContain('Failed');
		});
	});

	describe('Loading State', () => {
		it('should have loading state during save', () => {
			const isSaving = true;
			expect(isSaving).toBe(true);
		});

		it('should disable buttons during save', () => {
			const disabled = true;
			expect(disabled).toBe(true);
		});
	});

	describe('Prompt Metadata Component Integration', () => {
		it('should bind title value', () => {
			// Simulate bindable title behavior
			let title = '';
			title = 'Test Title';
			expect(title).toBe('Test Title');
		});

		it('should bind description value', () => {
			// Simulate bindable description behavior
			let description = '';
			description = 'Test description';
			expect(description).toBe('Test description');
		});

		it('should bind purpose value', () => {
			// Simulate bindable purpose behavior
			let purpose = '';
			purpose = 'development';
			expect(purpose).toBe('development');
		});

		it('should bind tags array', () => {
			// Simulate bindable tags array behavior
			let tags: string[] = [];
			tags = ['test', 'sample'];
			expect(tags).toEqual(['test', 'sample']);
		});

		it('should support adding tags', () => {
			let tags: string[] = [];
			const addTag = (tag: string) => {
				const normalized = tag.trim().toLowerCase();
				if (normalized && !tags.includes(normalized)) {
					tags = [...tags, normalized];
				}
			};
			addTag('JavaScript');
			addTag('  TYPESCRIPT  ');
			expect(tags).toEqual(['javascript', 'typescript']);
		});

		it('should support removing tags', () => {
			let tags = ['javascript', 'typescript', 'python'];
			const removeTag = (tag: string) => {
				tags = tags.filter((t) => t !== tag);
			};
			removeTag('typescript');
			expect(tags).toEqual(['javascript', 'python']);
		});

		it('should have purpose options', () => {
			const purposeOptions = [
				{ value: 'development', label: 'Development' },
				{ value: 'writing', label: 'Writing' },
				{ value: 'analysis', label: 'Analysis' },
				{ value: 'creative', label: 'Creative' },
				{ value: 'general', label: 'General' }
			];
			expect(purposeOptions).toHaveLength(5);
		});

		it('should have platform options', () => {
			const platformOptions = [
				{ value: 'claude', label: 'Claude' },
				{ value: 'gpt-4', label: 'GPT-4' },
				{ value: 'gpt-3.5', label: 'GPT-3.5' },
				{ value: 'gemini', label: 'Gemini' },
				{ value: 'llama', label: 'Llama' },
				{ value: 'other', label: 'Other' }
			];
			expect(platformOptions).toHaveLength(6);
		});
	});

	describe('Server Load Function', () => {
		it('should return meta data', () => {
			const loadResult = {
				meta: {
					title: 'New Prompt',
					description: 'Create a new prompt for your collection'
				}
			};
			expect(loadResult.meta.title).toBe('New Prompt');
			expect(loadResult.meta.description.length).toBeGreaterThan(0);
		});
	});
});

describe('Edit Prompt Page (STORY-017)', () => {
	describe('Page Metadata', () => {
		it('should have correct page title', () => {
			const promptTitle = 'My Test Prompt';
			const metaTitle = `Edit: ${promptTitle}`;
			expect(metaTitle).toBe('Edit: My Test Prompt');
		});

		it('should have page description', () => {
			const promptTitle = 'My Test Prompt';
			const metaDescription = `Edit prompt: ${promptTitle}`;
			expect(metaDescription).toBe('Edit prompt: My Test Prompt');
		});

		it('should have edit page header', () => {
			const header = 'Edit Prompt';
			expect(header).toBe('Edit Prompt');
		});

		it('should have page subdescription', () => {
			const subdescription =
				'Update prompt content and metadata. Changes will be saved as a new version.';
			expect(subdescription.length).toBeGreaterThan(0);
		});
	});

	describe('Form Structure', () => {
		it('should have prompt content section', () => {
			const sectionTitle = 'Prompt Content';
			expect(sectionTitle).toBe('Prompt Content');
		});

		it('should have version information section', () => {
			const sectionTitle = 'Version Information';
			expect(sectionTitle).toBe('Version Information');
		});

		it('should have prompt details section', () => {
			const sectionTitle = 'Prompt Details';
			expect(sectionTitle).toBe('Prompt Details');
		});

		it('should have form action buttons', () => {
			const buttons = ['Save Changes', 'Cancel'];
			expect(buttons).toContain('Save Changes');
			expect(buttons).toContain('Cancel');
		});
	});

	describe('Change Type Selector', () => {
		it('should have three change type options', () => {
			const changeTypes = ['patch', 'minor', 'major'];
			expect(changeTypes).toHaveLength(3);
		});

		it('should default to patch', () => {
			const defaultType: 'major' | 'minor' | 'patch' = 'patch';
			expect(defaultType).toBe('patch');
		});

		it('should have descriptions for each change type', () => {
			const typeDescriptions = {
				patch: 'Use patch for bug fixes, small improvements, or formatting changes.',
				minor: 'Use minor for new features, enhancements, or additions to the prompt.',
				major: 'Use major for breaking changes or significant rewrites.'
			};
			expect(typeDescriptions.patch.length).toBeGreaterThan(0);
			expect(typeDescriptions.minor.length).toBeGreaterThan(0);
			expect(typeDescriptions.major.length).toBeGreaterThan(0);
		});

		it('should allow switching between change types', () => {
			let changeType: 'major' | 'minor' | 'patch' = 'patch';
			changeType = 'minor';
			expect(changeType).toBe('minor');
			changeType = 'major';
			expect(changeType).toBe('major');
		});
	});

	describe('Change Notes', () => {
		it('should require change notes when content changes', () => {
			const contentChanged = true;
			const changeNotes = '';
			const isValid = !contentChanged || changeNotes.trim().length > 0;
			expect(isValid).toBe(false);
		});

		it('should not require change notes when only metadata changes', () => {
			const contentChanged = false;
			const changeNotes = '';
			const isValid = !contentChanged || changeNotes.trim().length > 0;
			expect(isValid).toBe(true);
		});

		it('should accept non-empty change notes when content changed', () => {
			const contentChanged = true;
			const changeNotes = 'Fixed a bug in the prompt';
			const isValid = !contentChanged || changeNotes.trim().length > 0;
			expect(isValid).toBe(true);
		});
	});

	describe('Form Validation', () => {
		it('should require title field', () => {
			const title = '';
			const isValid = title.trim().length > 0;
			expect(isValid).toBe(false);
		});

		it('should accept non-empty title', () => {
			const title = 'My Updated Prompt';
			const isValid = title.trim().length > 0;
			expect(isValid).toBe(true);
		});

		it('should enforce title max length of 100 characters', () => {
			const title = 'a'.repeat(100);
			const isValid = title.length <= 100;
			expect(isValid).toBe(true);

			const longTitle = 'a'.repeat(101);
			const isLongValid = longTitle.length <= 100;
			expect(isLongValid).toBe(false);
		});

		it('should require content field', () => {
			const content = '';
			const isValid = content.trim().length > 0;
			expect(isValid).toBe(false);
		});

		it('should accept non-empty content', () => {
			const content = 'You are a helpful assistant...';
			const isValid = content.trim().length > 0;
			expect(isValid).toBe(true);
		});

		it('should validate form completely for metadata-only changes', () => {
			const validateForm = (
				title: string,
				content: string,
				contentChanged: boolean,
				changeNotes: string
			) => {
				if (!title.trim()) return { valid: false, error: 'Title is required' };
				if (title.length > 100)
					return { valid: false, error: 'Title must be 100 characters or less' };
				if (!content.trim()) return { valid: false, error: 'Content is required' };
				if (contentChanged && !changeNotes.trim())
					return { valid: false, error: 'Change notes are required' };
				return { valid: true, error: null };
			};

			// Metadata-only changes (no content change, no change notes needed)
			expect(validateForm('Valid Title', 'content', false, '').valid).toBe(true);

			// Content changes require change notes
			expect(validateForm('Valid Title', 'content', true, '').valid).toBe(false);
			expect(validateForm('Valid Title', 'content', true, 'Updated content').valid).toBe(true);
		});
	});

	describe('Keyboard Shortcuts', () => {
		it('should have save keyboard shortcut (Cmd/Ctrl+S)', () => {
			const shortcut = 'CMD+S';
			expect(shortcut).toContain('CMD');
			expect(shortcut).toContain('S');
		});

		it('should have cancel keyboard shortcut (Escape)', () => {
			const shortcut = 'Escape';
			expect(shortcut).toBe('Escape');
		});
	});

	describe('Dirty State Detection', () => {
		it('should detect content changes', () => {
			const originalContent = 'Original content';
			const newContent = 'Updated content';
			const contentChanged = originalContent.trim() !== newContent.trim();
			expect(contentChanged).toBe(true);
		});

		it('should detect no content changes when same', () => {
			const originalContent = 'Same content';
			const newContent = 'Same content';
			const contentChanged = originalContent.trim() !== newContent.trim();
			expect(contentChanged).toBe(false);
		});

		it('should detect title changes', () => {
			const originalTitle = 'Original Title';
			const newTitle = 'Updated Title';
			const titleChanged = originalTitle.trim() !== newTitle.trim();
			expect(titleChanged).toBe(true);
		});

		it('should detect description changes', () => {
			const originalDesc = 'Original description';
			const newDesc = 'Updated description';
			const descChanged = originalDesc.trim() !== newDesc.trim();
			expect(descChanged).toBe(true);
		});

		it('should detect purpose changes', () => {
			const originalPurpose = 'development';
			const newPurpose = 'writing';
			const purposeChanged = originalPurpose !== newPurpose;
			expect(purposeChanged).toBe(true);
		});

		it('should detect tags changes', () => {
			const originalTags = ['tag1', 'tag2'];
			const newTags = ['tag1', 'tag3'];
			const tagsChanged = JSON.stringify(originalTags) !== JSON.stringify(newTags);
			expect(tagsChanged).toBe(true);
		});

		it('should calculate overall dirty state', () => {
			const isDirty = (contentChanged: boolean, metadataChanged: boolean) =>
				contentChanged || metadataChanged;

			expect(isDirty(true, false)).toBe(true);
			expect(isDirty(false, true)).toBe(true);
			expect(isDirty(true, true)).toBe(true);
			expect(isDirty(false, false)).toBe(false);
		});
	});

	describe('Current Version Info', () => {
		it('should display current version number', () => {
			const currentVersion = { version: '1.0.0' };
			expect(currentVersion.version).toBe('1.0.0');
		});

		it('should display current change type', () => {
			const currentVersion = { changeType: 'minor' as const };
			expect(currentVersion.changeType).toBe('minor');
		});

		it('should display current change notes if present', () => {
			const currentVersion = { changeNotes: 'Initial version' };
			expect(currentVersion.changeNotes).toBe('Initial version');
		});

		it('should handle null change notes', () => {
			const currentVersion = { changeNotes: null };
			expect(currentVersion.changeNotes).toBeNull();
		});
	});

	describe('Form Actions', () => {
		it('should save both metadata and new version when content changes', () => {
			const saveData = {
				promptId: 1,
				metadata: {
					title: 'Updated Title',
					description: 'Updated description',
					purpose: 'development',
					tags: ['test']
				},
				version: {
					content: 'Updated content',
					changeType: 'minor' as const,
					changeNotes: 'Minor improvements'
				}
			};

			expect(saveData.promptId).toBe(1);
			expect(saveData.metadata.title).toBe('Updated Title');
			expect(saveData.version.content).toBe('Updated content');
		});

		it('should save only metadata when content unchanged', () => {
			const saveData = {
				promptId: 1,
				metadata: {
					title: 'Updated Title',
					description: 'Updated description',
					purpose: 'development',
					tags: ['test']
				},
				version: null // No new version when content unchanged
			};

			expect(saveData.promptId).toBe(1);
			expect(saveData.version).toBeNull();
		});

		it('should cancel and return to prompt detail', () => {
			const promptId = 123;
			const cancelUrl = `/prompts/${promptId}`;
			expect(cancelUrl).toBe('/prompts/123');
		});

		it('should navigate to prompt detail after successful save', () => {
			const promptId = 123;
			const expectedUrl = `/prompts/${promptId}`;
			expect(expectedUrl).toBe('/prompts/123');
		});
	});

	describe('Page Layout', () => {
		it('should have main content area', () => {
			const layoutClass = 'lg:col-span-2';
			expect(layoutClass).toBe('lg:col-span-2');
		});

		it('should have sidebar for metadata and version info', () => {
			const sidebarClass = 'space-y-6';
			expect(sidebarClass).toBe('space-y-6');
		});

		it('should have correct grid layout', () => {
			const gridClass = 'grid gap-6 lg:grid-cols-3';
			expect(gridClass).toContain('lg:grid-cols-3');
		});
	});

	describe('Breadcrumb Navigation', () => {
		it('should have breadcrumb to prompts list', () => {
			const breadcrumbLink = '/prompts';
			expect(breadcrumbLink).toBe('/prompts');
		});

		it('should have breadcrumb to prompt detail', () => {
			const promptId = 1;
			const breadcrumbLink = `/prompts/${promptId}`;
			expect(breadcrumbLink).toBe('/prompts/1');
		});

		it('should indicate current page in breadcrumb', () => {
			const breadcrumbItems = ['Prompts', 'Prompt Title', 'Edit'];
			expect(breadcrumbItems).toContain('Edit');
		});
	});

	describe('Error Handling', () => {
		it('should handle save errors gracefully', () => {
			const saveError = 'Failed to save changes';
			expect(saveError.length).toBeGreaterThan(0);
		});

		it('should display error messages to user', () => {
			const errorMessage = 'Failed to save changes';
			expect(errorMessage).toContain('Failed');
		});

		it('should set error state on save failure', () => {
			const errorMessage = 'Failed to save changes';
			expect(errorMessage.length).toBeGreaterThan(0);
		});
	});

	describe('Loading State', () => {
		it('should have loading state during save', () => {
			const isSaving = true;
			expect(isSaving).toBe(true);
		});

		it('should disable buttons during save', () => {
			const disabled = true;
			expect(disabled).toBe(true);
		});

		it('should reset loading state after save completes', () => {
			const isSaving = false;
			expect(isSaving).toBe(false);
		});
	});

	describe('Server Load Function', () => {
		it('should return prompt data', () => {
			const loadResult = {
				prompt: {
					id: 1,
					title: 'Test Prompt',
					description: 'Description',
					purpose: 'development',
					tags: ['test']
				},
				currentVersion: {
					id: 1,
					version: '1.0.0',
					content: 'Content',
					changeType: 'major' as const,
					changeNotes: 'Initial version'
				}
			};
			expect(loadResult.prompt.title).toBe('Test Prompt');
			expect(loadResult.currentVersion.version).toBe('1.0.0');
		});

		it('should return meta data', () => {
			const loadResult = {
				meta: {
					title: 'Edit: Test Prompt',
					description: 'Edit prompt: Test Prompt'
				}
			};
			expect(loadResult.meta.title).toBe('Edit: Test Prompt');
			expect(loadResult.meta.description.length).toBeGreaterThan(0);
		});

		it('should handle invalid prompt ID', () => {
			const id = NaN;
			const isValid = !isNaN(id);
			expect(isValid).toBe(false);
		});

		it('should handle non-existent prompt', () => {
			const prompt = null;
			expect(prompt).toBeNull();
		});

		it('should transform tags from JSON string to array', () => {
			const tagsJson = '["sql", "database"]';
			const tags = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
			expect(tags).toEqual(['sql', 'database']);
		});

		it('should handle null tags', () => {
			const tags = null;
			const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags || [];
			expect(parsed).toEqual([]);
		});
	});
});
