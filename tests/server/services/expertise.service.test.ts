// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createExpertiseFile,
	getExpertiseFile,
	listExpertiseFiles,
	updateExpertiseFile,
	parseExpertiseFile
} from '$lib/server/services/expertise.service';
import { db } from '$lib/server/db/client';
import { expertiseFiles } from '$lib/server/db/schema';
import { stringifyExpertiseYaml, parseExpertiseYaml } from '$lib/server/utils/yaml';

// Mock dependencies
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
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn(() => Promise.resolve([]))
				}))
			}))
		})),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/utils/yaml', () => ({
	stringifyExpertiseYaml: vi.fn(() => '-- yaml --'),
	parseExpertiseYaml: vi.fn(() => ({}))
}));

describe('expertise.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createExpertiseFile', () => {
		it('should create expertise file with stringified yaml', async () => {
			const mockCreated = {
				id: 1,
				domain: 'sql',
				yamlContent: '-- yaml --',
				version: '1.0',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCreated])
				})
			} as any);

			const result = await createExpertiseFile('sql', { domain: 'sql' });

			expect(result).toEqual(mockCreated);
		});
	});

	describe('getExpertiseFile', () => {
		it('should return file when domain exists', async () => {
			const mockFile = {
				id: 1,
				domain: 'sql',
				yamlContent: '-- yaml --',
				version: '1.0'
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockFile])
					})
				})
			} as any);

			const result = await getExpertiseFile('sql');

			expect(result).toEqual(mockFile);
		});

		it('should return null when domain not found', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getExpertiseFile('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('listExpertiseFiles', () => {
		it('should return all expertise files', async () => {
			const mockFiles = [
				{ id: 1, domain: 'sql', version: '1.0' },
				{ id: 2, domain: 'python', version: '2.0' }
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockResolvedValue(mockFiles)
			} as any);

			const result = await listExpertiseFiles();

			expect(result).toHaveLength(2);
		});

		it('should return empty array when no files exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockResolvedValue([])
			} as any);

			const result = await listExpertiseFiles();

			expect(result).toEqual([]);
		});
	});

	describe('updateExpertiseFile', () => {
		it('should update yaml content', async () => {
			const mockUpdated = {
				id: 1,
				domain: 'sql',
				yamlContent: '-- updated --',
				version: '1.1',
				updatedAt: new Date()
			};

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			const result = await updateExpertiseFile('sql', { domain: 'sql' });

			expect(result).toEqual(mockUpdated);
		});

		it('should return undefined when file not found', async () => {
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await updateExpertiseFile('nonexistent', {});

			expect(result).toBeUndefined();
		});
	});

	describe('parseExpertiseFile', () => {
		it('should parse yaml content to ExpertiseData', () => {
			const mockFile = {
				id: 1,
				domain: 'sql',
				yamlContent: 'domain: sql',
				version: '1.0'
			};

			const parsedData = { domain: 'sql' };
			vi.mocked(parseExpertiseYaml).mockReturnValue(parsedData);

			const result = parseExpertiseFile(mockFile);

			expect(result).toEqual(parsedData);
		});
	});
});
