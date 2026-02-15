export type ChangeType = 'major' | 'minor' | 'patch';

export function parseVersion(version: string): [number, number, number] {
	const parts = version.split('.').map(Number);
	if (parts.length !== 3 || parts.some(isNaN)) {
		throw new Error(`Invalid version format: ${version}`);
	}
	return parts as [number, number, number];
}

export function getNextVersion(current: string, changeType: ChangeType): string {
	const [major, minor, patch] = parseVersion(current);
	switch (changeType) {
		case 'major':
			return `${major + 1}.0.0`;
		case 'minor':
			return `${major}.${minor + 1}.0`;
		case 'patch':
			return `${major}.${minor}.${patch + 1}`;
	}
}

export function compareVersions(a: string, b: string): number {
	const [aMajor, aMinor, aPatch] = parseVersion(a);
	const [bMajor, bMinor, bPatch] = parseVersion(b);

	if (aMajor !== bMajor) return aMajor - bMajor;
	if (aMinor !== bMinor) return aMinor - bMinor;
	return aPatch - bPatch;
}
