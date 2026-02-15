import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, E extends Element = HTMLElement> = T & {
	ref?: E | null;
};

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;

export type WithoutChildrenOrChild<T> = T extends { children?: Snippet; child?: unknown }
	? Omit<T, 'children' | 'child'>
	: T extends { children?: Snippet }
		? Omit<T, 'children'>
		: T extends { child?: unknown }
			? Omit<T, 'child'>
			: T;
