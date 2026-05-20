import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { adminSettings } from '../db/schema';
import type { AdminSetting, NewAdminSetting } from '../db/schema';

export const settingsRepo = {
	async findByKey(key: string): Promise<AdminSetting | null> {
		const result = await db
			.select()
			.from(adminSettings)
			.where(eq(adminSettings.key, key))
			.limit(1);
		return result[0] ?? null;
	},

	async findAll(): Promise<AdminSetting[]> {
		return db.select().from(adminSettings);
	},

	async upsert(data: { key: string; value: string; updatedBy?: string }): Promise<AdminSetting> {
		const existing = await db
			.select()
			.from(adminSettings)
			.where(eq(adminSettings.key, data.key))
			.limit(1);

		if (existing[0]) {
			const result = await db
				.update(adminSettings)
				.set({
					value: data.value,
					updatedAt: new Date(),
					updatedBy: data.updatedBy ?? existing[0].updatedBy
				})
				.where(eq(adminSettings.key, data.key))
				.returning();
			return result[0];
		}

		const result = await db
			.insert(adminSettings)
			.values({
				key: data.key,
				value: data.value,
				updatedBy: data.updatedBy ?? 'admin',
				category: 'general'
			})
			.returning();
		return result[0];
	},

	async deleteByKey(key: string): Promise<void> {
		await db.delete(adminSettings).where(eq(adminSettings.key, key));
	},

	async deleteAll(): Promise<void> {
		await db.delete(adminSettings);
	},

	async insertMany(items: NewAdminSetting[]): Promise<void> {
		if (items.length === 0) return;
		await db.insert(adminSettings).values(items);
	}
};
