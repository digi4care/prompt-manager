import { db } from './seed-client';
import { prompts, promptVersions, performanceMetrics } from './schema';
import { eq, and } from 'drizzle-orm';

export async function seed() {
	console.log('Seeding database...');

	// Check if sample prompt already exists
	const existingPrompt = await db
		.select()
		.from(prompts)
		.where(eq(prompts.title, 'Feature PRP Generator'))
		.get();

	let prompt = existingPrompt;
	let version;

	if (!prompt) {
		// Create sample prompt
		[prompt] = await db
			.insert(prompts)
			.values({
				title: 'Feature PRP Generator',
				description: 'Generates comprehensive PRPs for features',
				purpose: 'Planning and implementation guidance',
				tags: JSON.stringify(['planning', 'implementation', 'prp'])
			})
			.returning();

		console.log(`Created prompt: ${prompt.id}`);

		// Create initial version
		[version] = await db
			.insert(promptVersions)
			.values({
				promptId: prompt.id,
				version: '1.0.0',
				content: `You are an expert software architect. Create a comprehensive PRP (Product Requirements Plan) for implementing the following feature:

[FEATURE_NAME]

Include:
1. Goal - Clear, measurable outcome
2. Why - Business value and technical rationale
3. What - Specific requirements and deliverables
4. Implementation Blueprint - Step-by-step tasks with validation
5. Anti-patterns - Common mistakes to avoid`,
				changeType: 'major',
				changeNotes: 'Initial version',
				createdBy: 'system'
			})
			.returning();

		console.log(`Created version: ${version.id}`);

		// Update latest version reference
		await db.update(prompts).set({ latestVersionId: version.id }).where(eq(prompts.id, prompt.id));

		// Add performance metrics
		await db.insert(performanceMetrics).values({
			versionId: version.id,
			qualityScore: 85.0,
			clarity: 90.0,
			completeness: 80.0,
			specificity: 85.0,
			usageCount: 0
		});
	} else {
		console.log(`Prompt already exists: ${prompt.id}`);

		// Check if version already exists
		const existingVersion = await db
			.select()
			.from(promptVersions)
			.where(and(eq(promptVersions.promptId, prompt.id), eq(promptVersions.version, '1.0.0')))
			.get();

		if (!existingVersion) {
			[version] = await db
				.insert(promptVersions)
				.values({
					promptId: prompt.id,
					version: '1.0.0',
					content: `You are an expert software architect. Create a comprehensive PRP (Product Requirements Plan) for implementing the following feature:

[FEATURE_NAME]

Include:
1. Goal - Clear, measurable outcome
2. Why - Business value and technical rationale
3. What - Specific requirements and deliverables
4. Implementation Blueprint - Step-by-step tasks with validation
5. Anti-patterns - Common mistakes to avoid`,
					changeType: 'major',
					changeNotes: 'Initial version',
					createdBy: 'system'
				})
				.returning();

			console.log(`Created version: ${version.id}`);

			// Update latest version reference
			await db
				.update(prompts)
				.set({ latestVersionId: version.id })
				.where(eq(prompts.id, prompt.id));

			// Add performance metrics
			await db.insert(performanceMetrics).values({
				versionId: version.id,
				qualityScore: 85.0,
				clarity: 90.0,
				completeness: 80.0,
				specificity: 85.0,
				usageCount: 0
			});
		} else {
			console.log('Version 1.0.0 already exists, skipping seed data creation');
		}
	}

	console.log('Seed complete!');
}

// Run if called directly
seed().catch(console.error);
