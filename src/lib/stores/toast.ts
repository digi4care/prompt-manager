/**
 * Convenience wrapper for toast notifications
 * Uses the existing shadcn-svelte toast system under the hood
 */

import { toast, dismissAll } from '$lib/components/ui/toast';
import type { ToastVariant } from '$lib/components/ui/toast';

export interface ToastOptions {
	type?: ToastVariant;
	message: string;
	duration?: number;
}

/**
 * Show a toast notification
 * @param type - 'success' | 'destructive' | 'info' | 'warning' | 'default'
 * @param message - The message to display
 * @param duration - Duration in ms (default: 3000)
 */
export function showToast(
	type: ToastVariant = 'default',
	message: string,
	duration: number = 3000
): string {
	return toast({
		description: message,
		variant: type,
		duration
	});
}

/**
 * Show a success toast
 */
export function showSuccess(message: string, duration?: number): string {
	return showToast('success', message, duration);
}

/**
 * Show an error toast
 */
export function showError(message: string, duration?: number): string {
	return showToast('destructive', message, duration ?? 5000); // Errors stay longer
}

/**
 * Show an info toast
 */
export function showInfo(message: string, duration?: number): string {
	return showToast('info', message, duration);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
	dismissAll();
}

// Re-export the underlying toast for advanced usage
export { toast, dismissAll } from '$lib/components/ui/toast';
