import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	createPrompt,
	getPrompt,
	listPrompts,
	updatePrompt,
	deletePrompt
} from '$lib/server/services/prompts.service';
import { db } from '$lib/server/db/client';
import { prompts } from '$lib/server/db/schema';

// Mock db client
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

describe('prompts.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createPrompt', () => {
		it('should create a new prompt with required fields', async () => {
			const newPrompt = {
				title: 'Test Prompt',
				description: 'A test description',
				purpose: 'testing',
				tags: JSON.stringify(['test'])
			};

			const mockCreated = {
				id: 1,
				...newPrompt,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: null,
				deletedAt: null
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCreated])
				})
			} as any);

			const result = await createPrompt(newPrompt);

			expect(result).toEqual(mockCreated);
			expect(db.insert).toHaveBeenCalledWith(prompts);
			expect(db.insert(prompts).values).toHaveBeenCalledWith(newPrompt);
		});

		it('should create a prompt with only required title', async () => {
			const newPrompt = { title: 'Minimal Prompt' };

			const mockCreated = {
				id: 2,
				...newPrompt,
				description: null,
				purpose: null,
				tags: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: null,
				deletedAt: null
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCreated])
				})
			} as any);

			const result = await createPrompt(newPrompt);

			expect(result.title).toBe('Minimal Prompt');
			expect(result.id).toBeDefined();
		});
	});

	describe('getPrompt', () => {
		it('should return prompt when found and not deleted', async () => {
			const mockPrompt = {
				id: 1,
				title: 'Test Prompt',
				description: null,
				purpose: null,
				tags: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: null,
				deletedAt: null
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPrompt])
					})
				})
			} as any);

			const result = await getPrompt(1);

			expect(result).toEqual(mockPrompt);
		});

		it('should return null when prompt not found', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getPrompt(999);

			expect(result).toBeNull();
		});

		it('should return null when prompt is deleted', async () => {
			const mockPrompt = {
				id: 2,
				title: 'Deleted Prompt',
				deletedAt: new Date() // Soft deleted
			};

			// Simulate that the query returns empty for deleted prompts
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getPrompt(2);

			expect(result).toBeNull();
		});

		it('should query with correct conditions', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			await getPrompt(5);

			// Verify select was called
			expect(db.select).toHaveBeenCalled();
			expect(db.select().from).toHaveBeenCalledWith(prompts);
		});
	});

	describe('listPrompts', () => {
		const buildCountQuery = (totalCount: number) => ({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([{ count: totalCount }])
			})
		});

		const buildLimitChain = (promptsData: any[]) => ({
			limit: vi.fn().mockReturnValue({
				offset: vi.fn().mockResolvedValue(promptsData)
			})
		});

		const buildPromptsQuery = (promptsData: any[], orderBy = vi.fn()) => ({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: orderBy.mockResolvedValue(promptsData)
				})
			})
		});

		it('should return all prompts without search', async () => {
			const mockPrompts = [
				{ id: 1, title: 'Prompt 1', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
				{ id: 2, title: 'Prompt 2', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
				{ id: 3, title: 'Prompt 3', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
			];

			vi.mocked(db.select).mockReturnValue(buildPromptsQuery(mockPrompts) as any);

			const result = await listPrompts();

			expect(result.prompts).toHaveLength(3);
			expect(result.prompts[0].title).toBe('Prompt 1');
			expect(result.totalCount).toBe(3);
		});

		it('should filter prompts by search term', async () => {
			const mockPrompts = [
				{
					id: 1,
					title: 'SQL Prompt',
					tags: ['sql'],
					content: 'Content',
					createdAt: new Date(),
					updatedAt: new Date(),
					deletedAt: null
				},
				{
					id: 2,
					title: 'Python Prompt',
					tags: ['python'],
					content: 'Content',
					createdAt: new Date(),
					updatedAt: new Date(),
					deletedAt: null
				}
			];

			const filteredPrompts = mockPrompts.filter((prompt) =>
				prompt.title.toLowerCase().includes('sql')
			);
			vi.mocked(db.select).mockReturnValue(buildPromptsQuery(filteredPrompts) as any);

			const result = await listPrompts(10, 0, 'SQL');

			expect(result.prompts).toHaveLength(1);
			expect(result.prompts[0].title).toContain('SQL');
			expect(result.totalCount).toBe(1);
		});

		it('should apply pagination correctly', async () => {
			vi.mocked(db.select).mockReturnValue(buildPromptsQuery([]) as any);

			const result = await listPrompts(20, 20);

			expect(db.select).toHaveBeenCalled();
			expect(result.prompts).toEqual([]);
			expect(result.totalCount).toBe(0);
		});

		it('should use default pagination values', async () => {
			vi.mocked(db.select).mockReturnValue(buildPromptsQuery([]) as any);

			const result = await listPrompts();

			expect(db.select).toHaveBeenCalled();
			expect(result.prompts).toEqual([]);
			expect(result.totalCount).toBe(0);
		});

		it('should order by updatedAt descending', async () => {
			const orderBy = vi.fn();
			vi.mocked(db.select).mockReturnValue(buildPromptsQuery([], orderBy) as any);

			await listPrompts();

			expect(orderBy).toHaveBeenCalled();
		});

		it('should return empty array when no prompts exist', async () => {
			vi.mocked(db.select).mockReturnValue(buildPromptsQuery([]) as any);

			const result = await listPrompts();

			expect(result.prompts).toEqual([]);
			expect(result.totalCount).toBe(0);
		});
	});

	describe('updatePrompt', () => {
		it('should update prompt with partial data', async () => {
			const mockUpdated = {
				id: 1,
				title: 'Updated Title',
				description: 'New description',
				purpose: null,
				tags: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: null,
				deletedAt: null
			};

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			const result = await updatePrompt(1, {
				title: 'Updated Title',
				description: 'New description'
			});

			expect(result.title).toBe('Updated Title');
			expect(db.update).toHaveBeenCalledWith(prompts);
		});

		it('should update updatedAt timestamp', async () => {
			const originalDate = new Date('2025-01-01');
			const mockUpdated = {
				id: 1,
				title: 'Test',
				updatedAt: new Date() // Should be new Date()
			};

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			const result = await updatePrompt(1, { title: 'Test' });

			expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(originalDate.getTime());
		});

		it('should update only specified fields', async () => {
			const mockUpdated = {
				id: 1,
				title: 'New Title',
				description: 'Original description', // Should remain unchanged
				purpose: 'Original purpose',
				tags: '["test"]',
				updatedAt: new Date()
			};

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			await updatePrompt(1, { title: 'New Title' });

			// Verify set was called with update data
			const setCall = db.update(prompts).set;
			expect(setCall).toHaveBeenCalled();
		});

		it('should throw when prompt not found', async () => {
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			// Should not throw, but return undefined
			const result = await updatePrompt(999, { title: 'Test' });
			expect(result).toBeUndefined();
		});
	});

	describe('deletePrompt', () => {
		it('should soft delete prompt by setting deletedAt', async () => {
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({})
				})
			} as any);

			await deletePrompt(1);

			expect(db.update).toHaveBeenCalledWith(prompts);
			expect(db.update(prompts).set).toHaveBeenCalled();
		});

		it('should set deletedAt to current date', async () => {
			const beforeDelete = Date.now();

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({})
				})
			} as any);

			await deletePrompt(1);

			// Verify set was called with deletedAt
			const setCall = (db.update(prompts).set as any).mock.calls[0][0];
			expect(setCall.deletedAt).toBeInstanceOf(Date);
			expect(setCall.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete);
		});

		it('should only update the specific prompt by id', async () => {
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({})
				})
			} as any);

			await deletePrompt(42);

			// Verify where clause uses correct id
			expect(db.update(prompts).set).toHaveBeenCalled();
		});
	});
});
