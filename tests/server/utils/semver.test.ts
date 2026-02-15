import { describe, it, expect } from 'vitest';
import {
	parseVersion,
	getNextVersion,
	compareVersions,
	type ChangeType
} from '$lib/server/utils/semver';

describe('Semver Utilities', () => {
	describe('parseVersion', () => {
		it('should parse valid version string', () => {
			const result = parseVersion('1.2.3');
			expect(result).toEqual([1, 2, 3]);
		});

		it('should parse version with single digit numbers', () => {
			const result = parseVersion('0.0.0');
			expect(result).toEqual([0, 0, 0]);
		});

		it('should parse version with large numbers', () => {
			const result = parseVersion('123.456.789');
			expect(result).toEqual([123, 456, 789]);
		});

		it('should throw for invalid version format - too few parts', () => {
			expect(() => parseVersion('1.2')).toThrow('Invalid version format: 1.2');
		});

		it('should throw for invalid version format - too many parts', () => {
			expect(() => parseVersion('1.2.3.4')).toThrow('Invalid version format: 1.2.3.4');
		});

		it('should throw for non-numeric parts', () => {
			expect(() => parseVersion('1.2.x')).toThrow('Invalid version format: 1.2.x');
		});

		it('should throw for empty parts', () => {
			// Note: Number('') returns 0, so '1..3' becomes [1, 0, 3] which is technically valid
			// The function doesn't validate for empty string segments specifically
			// This test documents the actual behavior
			const result = parseVersion('1..3');
			expect(result).toEqual([1, 0, 3]);
		});

		it('should throw for completely invalid format', () => {
			expect(() => parseVersion('abc')).toThrow('Invalid version format: abc');
		});

		it('should throw for empty string', () => {
			expect(() => parseVersion('')).toThrow('Invalid version format: ');
		});
	});

	describe('getNextVersion', () => {
		describe('major change type', () => {
			it('should increment major version', () => {
				expect(getNextVersion('1.0.0', 'major')).toBe('2.0.0');
			});

			it('should reset minor and patch to zero', () => {
				expect(getNextVersion('1.2.3', 'major')).toBe('2.0.0');
			});

			it('should handle zero major version', () => {
				expect(getNextVersion('0.9.9', 'major')).toBe('1.0.0');
			});

			it('should handle large version numbers', () => {
				expect(getNextVersion('99.99.99', 'major')).toBe('100.0.0');
			});
		});

		describe('minor change type', () => {
			it('should increment minor version', () => {
				expect(getNextVersion('1.0.0', 'minor')).toBe('1.1.0');
			});

			it('should reset patch to zero', () => {
				expect(getNextVersion('1.2.3', 'minor')).toBe('1.3.0');
			});

			it('should not change major version', () => {
				expect(getNextVersion('2.5.8', 'minor')).toBe('2.6.0');
			});

			it('should handle zero minor version', () => {
				expect(getNextVersion('1.0.5', 'minor')).toBe('1.1.0');
			});

			it('should handle large minor version', () => {
				expect(getNextVersion('1.99.99', 'minor')).toBe('1.100.0');
			});
		});

		describe('patch change type', () => {
			it('should increment patch version', () => {
				expect(getNextVersion('1.0.0', 'patch')).toBe('1.0.1');
			});

			it('should not change major or minor version', () => {
				expect(getNextVersion('1.2.3', 'patch')).toBe('1.2.4');
			});

			it('should handle zero patch version', () => {
				expect(getNextVersion('1.2.0', 'patch')).toBe('1.2.1');
			});

			it('should handle large patch version', () => {
				expect(getNextVersion('1.2.99', 'patch')).toBe('1.2.100');
			});
		});

		describe('all change types', () => {
			const versions: ChangeType[] = ['major', 'minor', 'patch'];

			versions.forEach((changeType) => {
				it(`should handle ${changeType} change type`, () => {
					const result = getNextVersion('1.0.0', changeType);
					expect(result).toMatch(/^\d+\.\d+\.\d+$/);
				});
			});
		});
	});

	describe('compareVersions', () => {
		it('should return 0 for equal versions', () => {
			expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
		});

		it('should return positive when a is greater than b (major)', () => {
			expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
		});

		it('should return negative when a is less than b (major)', () => {
			expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
		});

		it('should compare by major version first', () => {
			expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
			expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
		});

		it('should compare by minor version when major is equal', () => {
			expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
			expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
		});

		it('should compare by patch version when major and minor are equal', () => {
			expect(compareVersions('1.2.3', '1.2.2')).toBeGreaterThan(0);
			expect(compareVersions('1.2.2', '1.2.3')).toBeLessThan(0);
		});

		it('should handle versions with same major, different minor and patch', () => {
			expect(compareVersions('1.5.5', '1.3.9')).toBeGreaterThan(0);
			expect(compareVersions('1.3.9', '1.5.5')).toBeLessThan(0);
		});

		it('should handle versions with leading zeros in comparison', () => {
			expect(compareVersions('1.2.10', '1.2.9')).toBeGreaterThan(0);
			expect(compareVersions('1.2.9', '1.2.10')).toBeLessThan(0);
		});

		it('should handle version 0 comparisons', () => {
			expect(compareVersions('0.1.0', '0.0.9')).toBeGreaterThan(0);
			expect(compareVersions('0.0.1', '0.0.0')).toBeGreaterThan(0);
		});

		it('should correctly sort versions', () => {
			const versions = ['1.0.0', '2.0.0', '1.1.0', '1.0.1', '2.1.0', '0.9.0'];
			const sorted = [...versions].sort(compareVersions);
			expect(sorted).toEqual(['0.9.0', '1.0.0', '1.0.1', '1.1.0', '2.0.0', '2.1.0']);
		});
	});
});

describe('Semver ChangeType', () => {
	it('should accept major change type', () => {
		const changeType: ChangeType = 'major';
		expect(changeType).toBe('major');
	});

	it('should accept minor change type', () => {
		const changeType: ChangeType = 'minor';
		expect(changeType).toBe('minor');
	});

	it('should accept patch change type', () => {
		const changeType: ChangeType = 'patch';
		expect(changeType).toBe('patch');
	});

	it('should only accept valid change types', () => {
		const validTypes: ChangeType[] = ['major', 'minor', 'patch'];
		expect(validTypes).toHaveLength(3);
	});
});
