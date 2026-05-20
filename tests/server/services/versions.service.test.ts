import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createVersion,
	getLatestVersion,
	getVersionHistory,
	getVersion
} from '$lib/server/services/versions.service';
import { db } from '$lib/server/db/client';
import { prompts, promptVersions } from '$lib/server/db/schema';
import { getNextVersion } from '$lib/server/utils/semver';

// Mock dependencies
vi.mock('$lib/server/db/client', () => {
	const mockTx = {
		select: vi.fn(() => ({
			from: vi.fn(() => Promise.resolve([]))
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi.fn(() => Promise.resolve([]))
			}))
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve({}))
			}))
		})),
		delete: vi.fn()
	};

	const db = {
		...mockTx,
		transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
	};

	return { db };
});

vi.mock('$lib/server/utils/semver', () => ({
	getNextVersion: vi.fn(() => '1.0.0')
}));

describe('versions.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getLatestVersion', () => {
		it('should return latest version when exists', async () => {
			const mockVersion = {
				id: 5,
				promptId: 1,
				version: '1.2.0',
				content: 'Current content',
				changeType: 'minor',
				changeNotes: 'Added feature',
				createdAt: new Date(),
				createdBy: 'user'
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([mockVersion])
						})
					})
				})
			} as any);

			const result = await getLatestVersion(1);

			expect(result).toEqual(mockVersion);
		});

		it('should return null when no versions exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([])
						})
					})
				})
			} as any);

			const result = await getLatestVersion(999);

			expect(result).toBeNull();
		});
	});

	describe('createVersion', () => {
		it('should create first version as 1.0.0', async () => {
			const mockNewVersion = {
				id: 1,
				promptId: 1,
				version: '1.0.0',
				content: 'Initial content',
				changeType: 'major',
				changeNotes: 'Initial version',
				createdAt: new Date(),
				createdBy: 'user'
			};

			// No existing versions
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([])
						})
					})
				})
			} as any);

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockNewVersion])
				})
			} as any);

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({})
				})
			} as any);

			const result = await createVersion(1, 'Initial content', 'major', 'Initial version', 'user');

			expect(result.version).toBe('1.0.0');
		});

		it('should increment version based on change type', async () => {
			const mockNewVersion = {
				id: 2,
				promptId: 1,
				version: '2.0.0',
				content: 'Breaking changes',
				changeType: 'major',
				changeNotes: 'Major rewrite',
				createdAt: new Date(),
				createdBy: 'user'
			};

			const existingVersion = {
				id: 1,
				version: '1.5.0',
				content: 'Previous content'
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([existingVersion])
						})
					})
				})
			} as any);

			vi.mocked(getNextVersion).mockReturnValue('2.0.0');

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockNewVersion])
				})
			} as any);

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue({})
				})
			} as any);

			const result = await createVersion(1, 'Breaking changes', 'major', 'Major rewrite', 'user');

			expect(result.version).toBe('2.0.0');
		});
	});

	describe('getVersionHistory', () => {
		it('should return all versions for a prompt', async () => {
			const mockVersions = [
				{ id: 3, version: '1.2.0', content: 'Latest' },
				{ id: 2, version: '1.1.0', content: 'Middle' },
				{ id: 1, version: '1.0.0', content: 'First' }
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue(mockVersions)
					})
				})
			} as any);

			const result = await getVersionHistory(1);

			expect(result).toHaveLength(3);
		});

		it('should return empty array when no versions exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getVersionHistory(999);

			expect(result).toEqual([]);
		});
	});

	describe('getVersion', () => {
		it('should return version when found', async () => {
			const mockVersion = {
				id: 5,
				promptId: 1,
				version: '1.0.0',
				content: 'Content',
				changeType: 'major',
				changeNotes: 'Initial',
				createdAt: new Date(),
				createdBy: 'user'
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockVersion])
					})
				})
			} as any);

			const result = await getVersion(5);

			expect(result).toEqual(mockVersion);
		});

		it('should return null when version not found', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getVersion(999);

			expect(result).toBeNull();
		});
	});
});
