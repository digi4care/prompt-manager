/**
 * Color class maps for settings page sections.
 * Extracted from settings/+page.svelte for reuse.
 */

export const leftBorderClasses: Record<string, string> = {
	sapphire: 'border-l-blue-500 dark:border-l-blue-400',
	mauve: 'border-l-violet-500 dark:border-l-violet-400',
	green: 'border-l-emerald-500 dark:border-l-emerald-400',
	peach: 'border-l-orange-400 dark:border-l-orange-300',
	pink: 'border-l-pink-500 dark:border-l-pink-400',
	teal: 'border-l-teal-500 dark:border-l-teal-400',
	blue: 'border-l-blue-500 dark:border-l-blue-400',
	yellow: 'border-l-yellow-500 dark:border-l-yellow-400'
};

export const bgClasses: Record<string, string> = {
	sapphire: 'bg-blue-50 dark:bg-blue-950/30',
	mauve: 'bg-violet-50 dark:bg-violet-950/30',
	green: 'bg-emerald-50 dark:bg-emerald-950/30',
	peach: 'bg-orange-50 dark:bg-orange-950/30',
	pink: 'bg-pink-50 dark:bg-pink-950/30',
	teal: 'bg-teal-50 dark:bg-teal-950/30',
	blue: 'bg-blue-50 dark:bg-blue-950/30',
	yellow: 'bg-yellow-50 dark:bg-yellow-950/30'
};

export const textClasses: Record<string, string> = {
	sapphire: 'text-blue-600 dark:text-blue-400',
	mauve: 'text-violet-600 dark:text-violet-400',
	green: 'text-emerald-600 dark:text-emerald-400',
	peach: 'text-orange-600 dark:text-orange-400',
	pink: 'text-pink-600 dark:text-pink-400',
	teal: 'text-teal-600 dark:text-teal-400',
	blue: 'text-blue-600 dark:text-blue-400',
	yellow: 'text-yellow-600 dark:text-yellow-400'
};

export const iconBgClasses: Record<string, string> = {
	sapphire: 'bg-blue-100 dark:bg-blue-900/50',
	mauve: 'bg-violet-100 dark:bg-violet-900/50',
	green: 'bg-emerald-100 dark:bg-emerald-900/50',
	peach: 'bg-orange-100 dark:bg-orange-900/50',
	pink: 'bg-pink-100 dark:bg-pink-900/50',
	teal: 'bg-teal-100 dark:bg-teal-900/50',
	blue: 'bg-blue-100 dark:bg-blue-900/50',
	yellow: 'bg-yellow-100 dark:bg-yellow-900/50'
};

export function getColorClasses(color: string): {
	leftBorder: string;
	bg: string;
	text: string;
	iconBg: string;
} {
	return {
		leftBorder: leftBorderClasses[color] || 'border-l-primary',
		bg: bgClasses[color] || 'bg-secondary',
		text: textClasses[color] || 'text-primary',
		iconBg: iconBgClasses[color] || 'bg-secondary'
	};
}
