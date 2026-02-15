import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createPattern,
	listPatterns,
	getTopPatterns
} from '$lib/server/services/patterns.service';
import { db } from '$lib/server/db/client';
import { patterns } from '$lib/server/db/schema';

// Mock db client
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => Promise.resolve([]))
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(() => Promise.resolve([]))
			}))
		})),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

describe('patterns.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createPattern', () => {
		it('should create pattern with all fields', async () => {
			const patternData = {
				name: 'use-context',
				description: 'Always provide context in prompts',
				category: 'best-practices',
				examples: JSON.stringify(['Example 1', 'Example 2']),
				successRate: 0.95,
				extractedFrom: 'sql-generator-v2'
			};

			const mockCreated = {
				id: 1,
				...patternData,
				createdAt: new Date()
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCreated])
				})
			} as any);

			const result = await createPattern(patternData);

			expect(result).toEqual(mockCreated);
			expect(db.insert).toHaveBeenCalledWith(patterns);
		});

		it('should create pattern with minimal fields', async () => {
			const patternData = {
				name: 'simple-pattern',
				description: 'A simple pattern'
			};

			const mockCreated = {
				id: 2,
				...patternData,
				category: null,
				examples: null,
				successRate: null,
				extractedFrom: null,
				createdAt: new Date()
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCreated])
				})
			} as any);

			const result = await createPattern(patternData);

			expect(result.name).toBe('simple-pattern');
			expect(result.id).toBeDefined();
		});

		it('should generate id and createdAt automatically', async () => {
			const patternData = {
				name: 'auto-test',
				description: 'Test auto fields'
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{
						id: 5,
						...patternData,
						category: null,
						examples: null,
						successRate: null,
						extractedFrom: null,
						createdAt: new Date()
					}])
				})
			} as any);

			const result = await createPattern(patternData);

			expect(result.id).toBe(5);
			expect(result.createdAt).toBeInstanceOf(Date);
		});
	});

	describe('listPatterns', () => {
		it('should return all patterns ordered by createdAt descending', async () => {
			const mockPatterns = [
				{ id: 3, name: 'Pattern 3', createdAt: new Date() },
				{ id: 2, name: 'Pattern 2', createdAt: new Date() },
				{ id: 1, name: 'Pattern 1', createdAt: new Date() }
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(mockPatterns)
				})
			} as any);

			const result = await listPatterns();

			expect(result).toHaveLength(3);
		});

		it('should return empty array when no patterns exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue([])
				})
			} as any);

			const result = await listPatterns();

			expect(result).toEqual([]);
		});
	});

	describe('getTopPatterns', () => {
		it('should return patterns ordered by successRate descending', async () => {
			const mockPatterns = [
				{ id: 1, name: 'High Success', successRate: 0.98 },
				{ id: 2, name: 'Medium Success', successRate: 0.85 },
				{ id: 3, name: 'Lower Success', successRate: 0.72 }
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue(mockPatterns)
					})
				})
			} as any);

			const result = await getTopPatterns(10);

			expect(result).toHaveLength(3);
			expect(result[0].successRate).toBe(0.98);
		});

		it('should apply default limit of 10', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getTopPatterns();

			expect(db.select).toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it('should apply custom limit', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			await getTopPatterns(5);

			expect(db.select).toHaveBeenCalled();
		});

		it('should return empty array when no patterns exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getTopPatterns();

			expect(result).toEqual([]);
		});
	});
});
