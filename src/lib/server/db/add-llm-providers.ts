import { db } from './client';
import { prompts } from './schema';

async function addLlmProvidersColumn() {
	console.log('Adding llm_providers column to prompts table...');

	try {
		// Add the column if it doesn't exist
		await db.run(
			`ALTER TABLE prompts ADD COLUMN llm_providers TEXT`
		);
		console.log('Column added successfully!');
	} catch (err: any) {
		if (err.message.includes('duplicate column name')) {
			console.log('Column already exists, skipping...');
		} else {
			console.error('Error adding column:', err);
		}
	}

	console.log('Done!');
}

addLlmProvidersColumn().catch(console.error);
