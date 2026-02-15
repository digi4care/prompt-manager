import { db } from '../db/client';
import { patterns, type Pattern, type NewPattern } from '../db/schema';
import { desc } from 'drizzle-orm';

export async function createPattern(data: Omit<NewPattern, 'id' | 'createdAt'>): Promise<Pattern> {
	const [pattern] = await db.insert(patterns).values(data).returning();
	return pattern;
}

export async function listPatterns(): Promise<Pattern[]> {
	return await db.select().from(patterns).orderBy(desc(patterns.createdAt));
}

export async function getTopPatterns(limit = 10): Promise<Pattern[]> {
	return await db
		.select()
		.from(patterns)
		.orderBy(desc(patterns.successRate))
		.limit(limit);
}
