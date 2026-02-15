<script lang="ts">
	import { diffLines, type Change } from 'diff';
	import { cn } from '$lib/utils';
	import type { DiffLine, MetadataDiff, VersionDiffResult } from './diff-types';
	import { ArrowLeftRight, FileDiff, Info } from 'lucide-svelte';

	interface Props {
		oldContent: string;
		newContent: string;
		oldVersion?: string;
		newVersion?: string;
		oldTitle?: string;
		newTitle?: string;
		oldDescription?: string;
		newDescription?: string;
		oldTags?: string[];
		newTags?: string[];
		oldPlatform?: string;
		newPlatform?: string;
		oldPurpose?: string;
		newPurpose?: string;
		class?: string;
	}

	let {
		oldContent = '',
		newContent = '',
		oldVersion = 'v1.0.0',
		newVersion = 'v1.0.0',
		oldTitle = '',
		newTitle = '',
		oldDescription = '',
		newDescription = '',
		oldTags = [],
		newTags = [],
		oldPlatform = '',
		newPlatform = '',
		oldPurpose = '',
		newPurpose = '',
		class: className = ''
	}: Props = $props();

	// Compute diff lines
	const contentChanges = $derived.by(() => {
		const changes = diffLines(oldContent, newContent);
		let oldLineNum = 1;
		let newLineNum = 1;

		return changes.map((change): DiffLine => {
			const lines = change.value.split('\n');
			// Remove the last empty element if it exists (from the split)
			if (lines[lines.length - 1] === '') {
				lines.pop();
			}

			const result: DiffLine = {
				type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
				content: change.value,
				lineNumberOld: change.removed ? oldLineNum : undefined,
				lineNumberNew: change.added ? newLineNum : undefined
			};

			if (!change.added) {
				oldLineNum += lines.length;
			}
			if (!change.removed) {
				newLineNum += lines.length;
			}

			return result;
		});
	});

	// Compute metadata diff
	const metadataDiff = $derived.by((): MetadataDiff | null => {
		const diff: MetadataDiff = {};

		if (oldTitle !== newTitle && (oldTitle || newTitle)) {
			diff.title = { old: oldTitle, new: newTitle };
		}
		if (oldDescription !== newDescription && (oldDescription || newDescription)) {
			diff.description = { old: oldDescription, new: newDescription };
		}
		if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
			diff.tags = { old: oldTags, new: newTags };
		}
		if (oldPlatform !== newPlatform && (oldPlatform || newPlatform)) {
			diff.platform = { old: oldPlatform, new: newPlatform };
		}
		if (oldPurpose !== newPurpose && (oldPurpose || newPurpose)) {
			diff.purpose = { old: oldPurpose, new: newPurpose };
		}

		return Object.keys(diff).length > 0 ? diff : null;
	});

	// Compute stats
	const stats = $derived.by(() => {
		let added = 0;
		let removed = 0;
		let unchanged = 0;

		contentChanges.forEach((change) => {
			const lines = change.content.split('\n').filter((l) => l !== '');
			if (change.type === 'added') {
				added += lines.length;
			} else if (change.type === 'removed') {
				removed += lines.length;
			} else {
				unchanged += lines.length;
			}
		});

		return { linesAdded: added, linesRemoved: removed, linesUnchanged: unchanged };
	});

	// Split content into lines for side-by-side view
	const leftLines = $derived.by(() => {
		const lines: Array<{ content: string; type: string; lineNum: number | undefined }> = [];
		let lineNum = 1;

		contentChanges.forEach((change) => {
			const splitLines = change.content.split('\n').filter((l) => l !== '');

			if (change.type === 'removed' || change.type === 'unchanged') {
				splitLines.forEach((line) => {
					lines.push({
						content: line,
						type: change.type,
						lineNum: lineNum++
					});
				});
			} else if (change.type === 'added') {
				// Add empty placeholders for added lines on the left
				for (let i = 0; i < splitLines.length; i++) {
					lines.push({
						content: '',
						type: 'placeholder',
						lineNum: undefined
					});
				}
			}
		});

		return lines;
	});

	const rightLines = $derived.by(() => {
		const lines: Array<{ content: string; type: string; lineNum: number | undefined }> = [];
		let lineNum = 1;

		contentChanges.forEach((change) => {
			const splitLines = change.content.split('\n').filter((l) => l !== '');

			if (change.type === 'added' || change.type === 'unchanged') {
				splitLines.forEach((line) => {
					lines.push({
						content: line,
						type: change.type,
						lineNum: lineNum++
					});
				});
			} else if (change.type === 'removed') {
				// Add empty placeholders for removed lines on the right
				for (let i = 0; i < splitLines.length; i++) {
					lines.push({
						content: '',
						type: 'placeholder',
						lineNum: undefined
					});
				}
			}
		});

		return lines;
	});

	function getLineClass(type: string): string {
		switch (type) {
			case 'added':
				return 'bg-green-100 dark:bg-green-900/30';
			case 'removed':
				return 'bg-red-100 dark:bg-red-900/30';
			case 'unchanged':
				return '';
			default:
				return '';
		}
	}

	function getIndicatorClass(type: string): string {
		switch (type) {
			case 'added':
				return 'text-green-600 dark:text-green-400';
			case 'removed':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-muted-foreground';
		}
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	<!-- Header with versions and stats -->
	<div
		class="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
				<FileDiff class="h-4 w-4" />
				<span class="font-mono text-sm font-medium text-muted-foreground">Diff</span>
			</div>
			<div class="flex items-center gap-2 text-sm">
				<span class="font-mono font-medium">{oldVersion}</span>
				<ArrowLeftRight class="h-4 w-4 text-muted-foreground" />
				<span class="font-mono font-medium">{newVersion}</span>
			</div>
		</div>

		<div class="flex items-center gap-4 text-sm">
			<div class="flex items-center gap-1.5">
				<span class="h-2.5 w-2.5 rounded-full bg-green-500"></span>
				<span class="text-muted-foreground">+{stats.linesAdded}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
				<span class="text-muted-foreground">-{stats.linesRemoved}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="h-2.5 w-2.5 rounded-full bg-gray-400"></span>
				<span class="text-muted-foreground">{stats.linesUnchanged}</span>
			</div>
		</div>
	</div>

	<!-- Metadata diff section -->
	{#if metadataDiff}
		<div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
			<div class="mb-3 flex items-center gap-2 border-b pb-2">
				<Info class="h-4 w-4" />
				<h3 class="font-medium">Metadata Changes</h3>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#if metadataDiff.title}
					<div class="space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Title</span>
						<div class="flex flex-col gap-1 rounded bg-muted/50 p-2 text-sm">
							<span class="text-red-600 dark:text-red-400 line-through decoration-red-400/50">{metadataDiff.title.old || '(empty)'}</span>
							<span class="text-green-600 dark:text-green-400">{metadataDiff.title.new || '(empty)'}</span>
						</div>
					</div>
				{/if}

				{#if metadataDiff.description}
					<div class="space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Description</span>
						<div class="flex flex-col gap-1 rounded bg-muted/50 p-2 text-sm">
							<span class="text-red-600 dark:text-red-400 line-through decoration-red-400/50">{metadataDiff.description.old || '(empty)'}</span>
							<span class="text-green-600 dark:text-green-400">{metadataDiff.description.new || '(empty)'}</span>
						</div>
					</div>
				{/if}

				{#if metadataDiff.tags}
					<div class="space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Tags</span>
						<div class="flex flex-col gap-1 rounded bg-muted/50 p-2 text-sm">
							<span class="text-red-600 dark:text-red-400 line-through decoration-red-400/50">[{metadataDiff.tags.old.join(', ')}]</span>
							<span class="text-green-600 dark:text-green-400">[{metadataDiff.tags.new.join(', ')}]</span>
						</div>
					</div>
				{/if}

				{#if metadataDiff.platform}
					<div class="space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Platform</span>
						<div class="flex flex-col gap-1 rounded bg-muted/50 p-2 text-sm">
							<span class="text-red-600 dark:text-red-400 line-through decoration-red-400/50">{metadataDiff.platform.old || '(empty)'}</span>
							<span class="text-green-600 dark:text-green-400">{metadataDiff.platform.new || '(empty)'}</span>
						</div>
					</div>
				{/if}

				{#if metadataDiff.purpose}
					<div class="space-y-1">
						<span class="text-xs font-medium text-muted-foreground">Purpose</span>
						<div class="flex flex-col gap-1 rounded bg-muted/50 p-2 text-sm">
							<span class="text-red-600 dark:text-red-400 line-through decoration-red-400/50">{metadataDiff.purpose.old || '(empty)'}</span>
							<span class="text-green-600 dark:text-green-400">{metadataDiff.purpose.new || '(empty)'}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Side-by-side diff view -->
	<div class="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
		<!-- Diff header -->
		<div class="grid grid-cols-2 gap-0 border-b bg-muted/50">
			<div class="border-r px-4 py-2 text-xs font-medium text-muted-foreground">
				{oldVersion}
			</div>
			<div class="px-4 py-2 text-xs font-medium text-muted-foreground">
				{newVersion}
			</div>
		</div>

		<!-- Diff content - side by side -->
		<div class="overflow-x-auto">
			<div class="grid min-w-[600px] grid-cols-2 divide-x">
				<!-- Left panel (old version) -->
				<div class="font-mono text-sm">
					{#each leftLines as line, i}
						<div
							class={cn(
								'flex min-h-[1.5rem] items-start gap-2 px-2 py-0.5 leading-5',
								getLineClass(line.type)
							)}
						>
							<span
								class={cn(
									'w-6 shrink-0 select-none text-right text-xs tabular-nums',
									line.type === 'removed' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
								)}
							>
								{line.lineNum || ''}
							</span>
							<span
								class={cn(
									'w-4 shrink-0 text-center text-xs',
									getIndicatorClass(line.type)
								)}
							>
								{#if line.type === 'removed'}
									-
								{:else if line.type === 'placeholder'}
									&nbsp;
								{:else}
									&nbsp;
								{/if}
							</span>
							<span
								class={cn(
									'whitespace-pre-wrap break-all flex-1',
									line.type === 'placeholder' && 'bg-muted/30'
								)}
							>
								{line.content || (line.type === 'placeholder' ? ' ' : '')}
							</span>
						</div>
					{/each}
				</div>

				<!-- Right panel (new version) -->
				<div class="font-mono text-sm">
					{#each rightLines as line, i}
						<div
							class={cn(
								'flex min-h-[1.5rem] items-start gap-2 px-2 py-0.5 leading-5',
								getLineClass(line.type)
							)}
						>
							<span
								class={cn(
									'w-6 shrink-0 select-none text-right text-xs tabular-nums',
									line.type === 'added' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
								)}
							>
								{line.lineNum || ''}
							</span>
							<span
								class={cn(
									'w-4 shrink-0 text-center text-xs',
									getIndicatorClass(line.type)
								)}
							>
								{#if line.type === 'added'}
									+
								{:else if line.type === 'placeholder'}
									&nbsp;
								{:else}
									&nbsp;
								{/if}
							</span>
							<span
								class={cn(
									'whitespace-pre-wrap break-all flex-1',
									line.type === 'placeholder' && 'bg-muted/30'
								)}
							>
								{line.content || (line.type === 'placeholder' ? ' ' : '')}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Empty state when content is identical -->
	{#if stats.linesAdded === 0 && stats.linesRemoved === 0 && !metadataDiff}
		<div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
			<FileDiff class="h-8 w-8 text-muted-foreground" />
			<p class="text-sm text-muted-foreground">No differences found - versions are identical</p>
		</div>
	{/if}
</div>
