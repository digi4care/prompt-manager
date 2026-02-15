import { db } from '../db/client';
import { expertiseFiles, type ExpertiseFile } from '../db/schema';
import { eq } from 'drizzle-orm';
import { parseExpertiseYaml, stringifyExpertiseYaml, type ExpertiseData } from '../utils/yaml';

export async function createExpertiseFile(
	domain: string,
	data: ExpertiseData
): Promise<ExpertiseFile> {
	const yamlContent = stringifyExpertiseYaml(data);

	const [file] = await db.insert(expertiseFiles).values({
		domain,
		yamlContent,
		version: '1.0'
	}).returning();

	return file;
}

export async function getExpertiseFile(domain: string): Promise<ExpertiseFile | null> {
	const [file] = await db
		.select()
		.from(expertiseFiles)
		.where(eq(expertiseFiles.domain, domain))
		.limit(1);
	return file || null;
}

export async function listExpertiseFiles(): Promise<ExpertiseFile[]> {
	return await db.select().from(expertiseFiles);
}

export async function updateExpertiseFile(
	domain: string,
	data: ExpertiseData
): Promise<ExpertiseFile> {
	const yamlContent = stringifyExpertiseYaml(data);

	const [updated] = await db
		.update(expertiseFiles)
		.set({ yamlContent, updatedAt: new Date() })
		.where(eq(expertiseFiles.domain, domain))
		.returning();

	return updated;
}

export function parseExpertiseFile(file: ExpertiseFile): ExpertiseData {
	return parseExpertiseYaml(file.yamlContent);
}
