import { versionRepo } from '../repositories';
import type { NewPromptVersion, PromptVersion } from '../db/schema';
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

	return versionRepo.insertWithLatestRef(promptId, {
		promptId,
		version,
		content,
		changeType,
		changeNotes,
		createdBy,
		parentVersionId: latestVersion?.id || null,
		metadata: metadata ? JSON.stringify(metadata) : null,
		frontmatterYaml: normalizedFrontmatter ? normalizedFrontmatter : null
	});
}

export async function getLatestVersion(promptId: number): Promise<PromptVersion | null> {
	return versionRepo.findLatestByPromptId(promptId);
}

export async function getVersionHistory(promptId: number): Promise<PromptVersion[]> {
	return versionRepo.findByPromptId(promptId);
}

export async function getVersion(id: number): Promise<PromptVersion | null> {
	return versionRepo.findById(id);
}
