/**
 * Client-side types for diff operations
 * Used by VersionDiff component for comparing prompt versions
 */

export interface DiffChange {
	value: string;
	added?: boolean;
	removed?: boolean;
	count?: number;
}

export interface DiffLine {
	type: 'unchanged' | 'added' | 'removed' | 'header';
	lineNumberOld?: number;
	lineNumberNew?: number;
	content: string;
}

export interface MetadataDiff {
	title?: { old: string; new: string };
	description?: { old: string; new: string };
	tags?: { old: string[]; new: string[] };
	platform?: { old: string; new: string };
	purpose?: { old: string; new: string };
}

export interface VersionDiffResult {
	oldVersion: {
		id: string;
		versionNumber: string;
		createdAt: Date;
	};
	newVersion: {
		id: string;
		versionNumber: string;
		createdAt: Date;
	};
	contentChanges: DiffLine[];
	metadataDiff: MetadataDiff | null;
	stats: {
		linesAdded: number;
		linesRemoved: number;
		linesUnchanged: number;
	};
}
