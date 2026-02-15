import { db } from './client';
import { prompts } from './schema';
import { isNull } from 'drizzle-orm';

async function fixPromptDates() {
	console.log('Fixing prompts with null dates...');

	// Get prompts with null updatedAt
	const nullDatePrompts = await db
		.select()
		.from(prompts)
		.where(isNull(prompts.updatedAt));

	console.log(`Found ${nullDatePrompts.length} prompts with null dates`);

	const now = new Date();
	for (const prompt of nullDatePrompts) {
		await db
			.update(prompts)
			.set({
				updatedAt: now,
				createdAt: prompt.createdAt || now
			})
			.where(eq(prompts.id, prompt.id));

		console.log(`Fixed prompt ${prompt.id}: ${prompt.title}`);
	}

	console.log('Done!');
}

import { eq } from 'drizzle-orm';
fixPromptDates().catch(console.error);
