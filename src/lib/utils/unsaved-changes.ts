/**
 * Unsaved changes warning utilities
 */

/**
 * Setup browser beforeunload warning for unsaved changes
 * @param hasUnsavedChanges Function that returns true if there are unsaved changes
 * @param message Warning message to display
 */
export function setupUnsavedChangesWarning(
	hasUnsavedChanges: () => boolean,
	message: string = 'You have unsaved changes. Are you sure you want to leave?'
): () => void {
	if (typeof window === 'undefined') return () => {};

	const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
		if (hasUnsavedChanges()) {
			// Standard way to trigger browser's native warning
			e.preventDefault();
			e.returnValue = message;
			return message;
		}

		return undefined;
	};

	window.addEventListener('beforeunload', handleBeforeUnload);

	// Return cleanup function
	return () => {
		window.removeEventListener('beforeunload', handleBeforeUnload);
	};
}
