/**
 * Council Agents Database Facade
 * Uses raw libSQL client to work around Drizzle ORM auto-increment bug
 */
import { getRawClient } from './client';
import type { ParentType } from './schema';

export interface CouncilAgent {
	id: number;
	parentType: ParentType;
	parentId: number;
	agentOrder: number;
	modelId: string;
	modelVariant: string | null;
	temperature: number;
	maxTokens: number;
	promptLinkId: number | null;
	createdAt: number;
	updatedAt: number;
}

export interface CreateCouncilAgentParams {
	parentType: string;
	parentId: number;
	modelId: string;
	modelVariant?: string | null;
	temperature: number;
	maxTokens: number;
	promptLinkId?: number | null;
	agentOrder: number;
}

/**
 * Create a new council agent using raw SQL
 */
export async function createCouncilAgent(params: CreateCouncilAgentParams): Promise<CouncilAgent> {
	const client = getRawClient();
	const now = Math.floor(Date.now() / 1000);

	const result = await client.execute({
		sql: `INSERT INTO council_agents (
			parent_type, parent_id, agent_order, model_id, model_variant,
			temperature, max_tokens, prompt_link_id,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
		args: [
			params.parentType,
			params.parentId,
			params.agentOrder,
			params.modelId,
			params.modelVariant ?? null,
			params.temperature,
			params.maxTokens,
			params.promptLinkId ?? null,
			now,
			now
		]
	});

	if (result.rows.length === 0) {
		throw new Error('Failed to create council agent');
	}

	const row = result.rows[0];
	return {
		id: row.id as number,
		parentType: row.parent_type as ParentType,
		parentId: row.parent_id as number,
		agentOrder: row.agent_order as number,
		modelId: row.model_id as string,
		modelVariant: row.model_variant as string | null,
		temperature: row.temperature as number,
		maxTokens: row.max_tokens as number,
		promptLinkId: row.prompt_link_id as number | null,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number
	};
}

/**
 * Get all council agents by parent type and ID
 */
export async function getCouncilAgentsByParent(
	parentType: string,
	parentId: number
): Promise<CouncilAgent[]> {
	const client = getRawClient();

	const result = await client.execute({
		sql: `SELECT * FROM council_agents 
		      WHERE parent_type = ? AND parent_id = ? 
		      ORDER BY agent_order ASC`,
		args: [parentType, parentId]
	});

	return result.rows.map((row) => ({
		id: row.id as number,
		parentType: row.parent_type as ParentType,
		parentId: row.parent_id as number,
		agentOrder: row.agent_order as number,
		modelId: row.model_id as string,
		modelVariant: row.model_variant as string | null,
		temperature: row.temperature as number,
		maxTokens: row.max_tokens as number,
		promptLinkId: row.prompt_link_id as number | null,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number
	}));
}

/**
 * Delete a council agent by ID
 */
export async function deleteCouncilAgent(id: number): Promise<boolean> {
	const client = getRawClient();

	const result = await client.execute({
		sql: 'DELETE FROM council_agents WHERE id = ?',
		args: [id]
	});

	return result.rowsAffected > 0;
}

/**
 * Update a council agent
 */
export async function updateCouncilAgent(
	id: number,
	params: Partial<Omit<CreateCouncilAgentParams, 'parentType' | 'parentId'>>
): Promise<CouncilAgent | null> {
	const client = getRawClient();
	const now = Math.floor(Date.now() / 1000);

	const updates: string[] = ['updated_at = ?'];
	const values: (string | number | null)[] = [now];

	if (params.modelId !== undefined) {
		updates.push('model_id = ?');
		values.push(params.modelId);
	}
	if (params.modelVariant !== undefined) {
		updates.push('model_variant = ?');
		values.push(params.modelVariant);
	}
	if (params.temperature !== undefined) {
		updates.push('temperature = ?');
		values.push(params.temperature);
	}
	if (params.maxTokens !== undefined) {
		updates.push('max_tokens = ?');
		values.push(params.maxTokens);
	}
	if (params.promptLinkId !== undefined) {
		updates.push('prompt_link_id = ?');
		values.push(params.promptLinkId);
	}
	if (params.agentOrder !== undefined) {
		updates.push('agent_order = ?');
		values.push(params.agentOrder);
	}

	values.push(id);

	const result = await client.execute({
		sql: `UPDATE council_agents SET ${updates.join(', ')} WHERE id = ? RETURNING *`,
		args: values
	});

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	return {
		id: row.id as number,
		parentType: row.parent_type as ParentType,
		parentId: row.parent_id as number,
		agentOrder: row.agent_order as number,
		modelId: row.model_id as string,
		modelVariant: row.model_variant as string | null,
		temperature: row.temperature as number,
		maxTokens: row.max_tokens as number,
		promptLinkId: row.prompt_link_id as number | null,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number
	};
}
