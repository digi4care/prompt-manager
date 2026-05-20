import { db } from '../db/client';
import { prompts, promptVersions, type NewPromptVersion, type PromptVersion } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getNextVersion, type ChangeType } from '../utils/semver';

export async function createVersion(
	promptId: number,
	content: string,
	changeType: ChangeType,
	changeNotes: string,
	createdBy: string,
	metadata?: Record<string, unknown>,
	frontmatterYaml?: string | null
): Promise<PromptVersion> {
	const latestVersion = await getLatestVersion(promptId);
	const version = latestVersion ? getNextVersion(latestVersion.version, changeType) : '1.0.0';

	const normalizedFrontmatter = (frontmatterYaml ?? '').trim();

	return await db.transaction(async (tx) => {
		const [newVersion] = await tx
			.insert(promptVersions)
			.values({
				promptId,
				version,
				content,
				changeType,
				changeNotes,
				createdBy,
				parentVersionId: latestVersion?.id || null,
				metadata: metadata ? JSON.stringify(metadata) : null,
				frontmatterYaml: normalizedFrontmatter ? normalizedFrontmatter : null
			})
			.returning();

		// Update latest version reference
		await tx
			.update(prompts)
			.set({ latestVersionId: newVersion.id, updatedAt: new Date() })
			.where(eq(prompts.id, promptId));

		return newVersion;
	});
}

export async function getLatestVersion(promptId: number): Promise<PromptVersion | null> {
	const [version] = await db
		.select()
		.from(promptVersions)
		.where(eq(promptVersions.promptId, promptId))
		.orderBy(desc(promptVersions.createdAt))
		.limit(1);
	return version || null;
}

export async function getVersionHistory(promptId: number): Promise<PromptVersion[]> {
	return await db
		.select()
		.from(promptVersions)
		.where(eq(promptVersions.promptId, promptId))
		.orderBy(desc(promptVersions.createdAt));
}

export async function getVersion(id: number): Promise<PromptVersion | null> {
	const [version] = await db
		.select()
		.from(promptVersions)
		.where(eq(promptVersions.id, id))
		.limit(1);
	return version || null;
}
