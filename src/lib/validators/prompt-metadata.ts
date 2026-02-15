import { z } from 'zod';

// Validation schema for prompt metadata
export const promptMetadataSchema = z.object({
	title: z
		.string()
		.min(1, 'Title is required')
		.max(100, 'Title must be 100 characters or less')
		.trim(),
	description: z
		.string()
		.max(500, 'Description must be 500 characters or less')
		.optional()
		.default(''),
	purpose: z
		.enum(['development', 'writing', 'analysis', 'creative', 'general', ''])
		.optional()
		.default(''),
	tags: z
		.array(z.string().min(1).max(50))
		.max(20, 'Maximum 20 tags allowed')
		.optional()
		.default([]),
	platform: z
		.enum(['claude', 'gpt-4', 'gpt-3.5', 'gemini', 'llama', 'other', ''])
		.optional()
		.default('')
});

// Type for validated metadata
export type PromptMetadataData = z.infer<typeof promptMetadataSchema>;

// Validation function that returns both success status and errors
export function validatePromptMetadata(data: Partial<PromptMetadataData>): {
	success: boolean;
	errors: Record<string, string>;
	data: PromptMetadataData | null;
} {
	const result = promptMetadataSchema.safeParse(data);

	if (result.success) {
		return {
			success: true,
			errors: {},
			data: result.data
		};
	}

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const path = issue.path.join('.');
		if (!errors[path]) {
			errors[path] = issue.message;
		}
	}

	return {
		success: false,
		errors,
		data: null
	};
}

// Partial validation for real-time feedback
export function validateField(
	field: keyof PromptMetadataData,
	value: any
): string | null {
	// Validate the full schema with only this field set
	const testData: Partial<PromptMetadataData> = {};
	testData[field] = value;

	const result = promptMetadataSchema.safeParse(testData);

	if (result.success) {
		return null;
	}

	// Find errors for this specific field
	const issues = result.error.issues.filter((issue) => issue.path[0] === field);
	return issues.length > 0 ? issues[0].message : null;
}
