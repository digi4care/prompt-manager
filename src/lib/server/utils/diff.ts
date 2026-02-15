import { diffLines, type Change } from 'diff';

export interface DiffResult {
	added: number;
	removed: number;
	changes: Change[];
}

export function computeDiff(oldText: string, newText: string): DiffResult {
	const changes = diffLines(oldText, newText);
	const added = changes.filter((c) => c.added).reduce((sum, c) => sum + (c.count || 0), 0);
	const removed = changes.filter((c) => c.removed).reduce((sum, c) => sum + (c.count || 0), 0);

	return { added, removed, changes };
}
