import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ==================== CORE TABLES ====================

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	teamId: text('team_id').notNull(),
	role: text('role').$type<'owner' | 'member'>().notNull().default('member'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const prompts = sqliteTable('prompts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull().unique(),
	description: text('description'),
	purpose: text('purpose'),
	tags: text('tags'), // JSON array
	llm_providers: text('llm_providers'), // JSON array of LLM providers
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	latestVersionId: integer('latest_version_id'),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

export const snippets = sqliteTable('snippets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull().unique(),
	description: text('description'),
	content: text('content').notNull(),
	categoryId: integer('category_id').references(() => snippetCategories.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// Admin-defined snippet categories
export const snippetCategories = sqliteTable('snippet_categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Admin-defined snippet tags
export const snippetTags = sqliteTable('snippet_tags', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Many-to-many junction table for snippet-tag assignments
export const snippetTagAssignments = sqliteTable(
	'snippet_tag_assignments',
	{
		snippetId: integer('snippet_id')
			.notNull()
			.references(() => snippets.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => snippetTags.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => ({
		pk: uniqueIndex('snippet_tag_pk').on(table.snippetId, table.tagId)
	})
);

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type SnippetCategory = typeof snippetCategories.$inferSelect;
export type NewSnippetCategory = typeof snippetCategories.$inferInsert;
export type SnippetTag = typeof snippetTags.$inferSelect;
export type NewSnippetTag = typeof snippetTags.$inferInsert;
export type SnippetTagAssignment = typeof snippetTagAssignments.$inferSelect;
export type NewSnippetTagAssignment = typeof snippetTagAssignments.$inferInsert;

export const promptVersions = sqliteTable('prompt_versions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	promptId: integer('prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	version: text('version').notNull(),
	content: text('content').notNull(),
	metadata: text('metadata'),
	frontmatterYaml: text('frontmatter_yaml'),
	parentVersionId: integer('parent_version_id'),
	changeType: text('change_type').$type<'major' | 'minor' | 'patch'>().notNull(),
	changeNotes: text('change_notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	createdBy: text('created_by').notNull()
});

export const performanceMetrics = sqliteTable('performance_metrics', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	versionId: integer('version_id')
		.notNull()
		.references(() => promptVersions.id, { onDelete: 'cascade' }),
	executionTime: integer('execution_time'),
	successRate: real('success_rate'),
	qualityScore: real('quality_score'),
	clarity: real('clarity'),
	completeness: real('completeness'),
	specificity: real('specificity'),
	usageCount: integer('usage_count').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const expertiseFiles = sqliteTable('expertise_files', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	domain: text('domain').notNull(),
	yamlContent: text('yaml_content').notNull(),
	version: text('version').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const patterns = sqliteTable('patterns', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description').notNull(),
	category: text('category'),
	examples: text('examples'),
	successRate: real('success_rate'),
	extractedFrom: text('extracted_from'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const promptRelationships = sqliteTable('prompt_relationships', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fromPromptId: integer('from_prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	toPromptId: integer('to_prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	relationshipType: text('relationship_type')
		.$type<'parent' | 'child' | 'variant' | 'related'>()
		.notNull(),
	strength: real('strength'),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const judgeEvaluations = sqliteTable('judge_evaluations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	versionId: integer('version_id')
		.notNull()
		.references(() => promptVersions.id, { onDelete: 'cascade' }),
	judgeModel: text('judge_model').notNull(),
	// Effective model parameters for provenance
	providerId: text('provider_id'), // Provider ID (e.g., 'anthropic', 'openai')
	modelId: text('model_id'), // Model ID (e.g., 'claude-3-5-sonnet-20241022')
	temperature: real('temperature'), // Temperature used (0.0-2.0)
	maxTokens: integer('max_tokens'), // Max tokens used
	// Evaluation data
	criteria: text('criteria').notNull(),
	scores: text('scores').notNull(),
	gaps: text('gaps'),
	recommendations: text('recommendations'),
	rawResponse: text('raw_response'),
	thinking: text('thinking'), // AI reasoning/thinking block content
	thinkingSignature: text('thinking_signature'), // Signature for verification
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const improvementLoops = sqliteTable('improvement_loops', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	promptId: integer('prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	baseVersionId: integer('base_version_id')
		.notNull()
		.references(() => promptVersions.id),
	status: text('status').$type<'running' | 'completed' | 'failed'>().notNull(),
	evaluationId: integer('evaluation_id'),
	variantCount: integer('variant_count').notNull().default(3),
	selectedVariantId: integer('selected_variant_id'),
	selectionReason: text('selection_reason'),
	// Effective model parameters for provenance
	providerId: text('provider_id'), // Provider ID (e.g., 'anthropic', 'openai')
	modelId: text('model_id'), // Model ID (e.g., 'claude-3-5-sonnet-20241022')
	temperature: real('temperature'), // Temperature used (0.0-2.0)
	maxTokens: integer('max_tokens'), // Max tokens used
	startedAt: integer('started_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	completedAt: integer('completed_at', { mode: 'timestamp' })
});

export const adminSettings = sqliteTable('admin_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	category: text('category').notNull(), // 'models', 'temperature', 'reasoning', 'providers'
	key: text('key').notNull().unique(), // e.g., 'judge_model', 'improvement_temperature'
	value: text('value').notNull(), // JSON-encoded value
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedBy: text('updated_by').notNull().default('admin')
});

// Improve presets for instruction templates
export const improvePresets = sqliteTable('improve_presets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(), // Preset name, e.g., "Content Polish", "Code Review"
	description: text('description'), // Human-readable description
	instruction: text('instruction').notNull(), // Instruction template (can include placeholders like {{content}})
	model: text('model'), // Optional model override (if null, use policy default)
	modelVariant: text('model_variant'), // Optional variant override
	temperature: real('temperature'), // Optional temperature override (if null, use policy default)
	allowedModels: text('allowed_models'), // Optional JSON array of allowed model IDs for this preset
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false), // Whether this is the default preset
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedBy: text('updated_by').notNull().default('admin')
});

// ==================== BETTER AUTH TABLES ====================
// Better Auth tables with 'auth_' prefix to avoid conflicts with app users table
// Reference: https://www.better-auth.com/docs/concepts/database-schema

export const authUsers = sqliteTable('auth_users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	name: text('name'),
	image: text('image'), // Profile image URL
	twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const authSessions = sqliteTable('auth_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(), // Session token
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const authAccounts = sqliteTable('auth_accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(), // External provider account ID
	providerId: text('provider_id').notNull(), // 'google', 'github', etc.
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	expiresAt: integer('expires_at', { mode: 'timestamp' }),
	password: text('password'), // Hashed password for credential auth
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const authVerifications = sqliteTable('auth_verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(), // Email or phone
	value: text('value').notNull(), // Verification code/token
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Two-factor authentication table for TOTP secrets and backup codes
export const authTwoFactor = sqliteTable('auth_two_factor', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	secret: text('secret').notNull(), // TOTP secret key
	backupCodes: text('backup_codes').notNull(), // JSON array of backup codes
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ==================== SETTINGS TABLES ====================

// OpenCode connection singleton (id always 1)
export const opencodeConnection = sqliteTable('opencode_connection', {
	id: integer('id').primaryKey(),
	mode: text('mode').$type<'local' | 'remote'>().notNull().default('local'),
	baseUrl: text('base_url'), // For remote mode
	password: text('password'), // For remote mode authentication
	lastConnected: integer('last_connected', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Function defaults (4 rows max, one per function type)
export const functionDefaults = sqliteTable('function_defaults', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	functionType: text('function_type')
		.$type<'executor' | 'judge' | 'improve' | 'council'>()
		.notNull()
		.unique(),
	modelId: text('model_id').notNull(), // Format: 'providerID/modelID'
	modelVariant: text('model_variant'), // Variant id (e.g., 'low', 'medium', 'high', 'xhigh')
	temperature: real('temperature').notNull(),
	maxTokens: integer('max_tokens').notNull(),
	promptId: integer('prompt_id').references(() => prompts.id), // Optional prompt linking
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Per-prompt function settings overrides
export const promptFunctionSettings = sqliteTable(
	'prompt_function_settings',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		promptId: integer('prompt_id')
			.notNull()
			.references(() => prompts.id, { onDelete: 'cascade' }),
		functionType: text('function_type')
			.$type<'executor' | 'judge' | 'improve' | 'council'>()
			.notNull(),
		modelOverride: text('model_override'),
		modelVariantOverride: text('model_variant_override'), // Variant id override
		temperature: real('temperature'),
		maxTokens: integer('max_tokens'),
		promptLinkId: integer('prompt_link_id').references(() => prompts.id),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => ({
		promptFunctionUnique: uniqueIndex('prompt_function_unique').on(
			table.promptId,
			table.functionType
		)
	})
);

// Execution logs for auditing prompt executions
export const executionLogs = sqliteTable('execution_logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	promptId: integer('prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	versionId: integer('version_id').references(() => promptVersions.id, { onDelete: 'set null' }),

	// Execution context
	inputContent: text('input_content').notNull(),
	outputContent: text('output_content'),

	// Model provenance
	modelId: text('model_id').notNull(),
	modelSource: text('model_source').$type<'run' | 'prompt' | 'default'>().notNull(),

	// Usage metrics
	inputTokens: integer('input_tokens').notNull().default(0),
	outputTokens: integer('output_tokens').notNull().default(0),
	totalTokens: integer('total_tokens').notNull().default(0),

	// Timing
	durationMs: integer('duration_ms').notNull(),

	// Error handling
	status: text('status').$type<'success' | 'error'>().notNull(),
	errorCode: text('error_code'),
	errorMessage: text('error_message'),

	// Metadata
	functionType: text('function_type')
		.$type<'executor' | 'judge' | 'improve' | 'council'>()
		.notNull()
		.default('executor'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Council runs for council correct workflow state persistence
export const councilRuns = sqliteTable('council_runs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	promptId: integer('prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	inputContent: text('input_content').notNull(),
	currentRound: integer('current_round').notNull().default(1),
	maxRounds: integer('max_rounds').notNull().default(3),
	state: text('state')
		.$type<'idle' | 'producing' | 'reviewing' | 'fixing' | 'complete' | 'error'>()
		.notNull()
		.default('idle'),
	steps: text('steps'), // JSON array of CouncilStepResult objects
	finalOutput: text('final_output'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Council agents for council repeater pattern
export const councilAgents = sqliteTable('council_agents', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	parentType: text('parent_type')
		.$type<'function_defaults' | 'prompt_function_settings' | 'review_defaults'>()
		.notNull(),
	parentId: integer('parent_id').notNull(),
	agentOrder: integer('agent_order').notNull(),
	modelId: text('model_id').notNull(),
	modelVariant: text('model_variant'), // Variant id (e.g., 'low', 'medium', 'high', 'xhigh')
	modelName: text('model_name'),
	modelProvider: text('model_provider'),
	modelLogo: text('model_logo'),
	temperature: real('temperature').notNull().default(0.5),
	maxTokens: integer('max_tokens').notNull().default(8192),
	promptLinkId: integer('prompt_link_id').references(() => prompts.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ==================== RELATIONS ====================

export const authUsersRelations = relations(authUsers, ({ many }) => ({
	sessions: many(authSessions),
	accounts: many(authAccounts),
	twoFactor: many(authTwoFactor)
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(authUsers, {
		fields: [authSessions.userId],
		references: [authUsers.id]
	})
}));

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
	user: one(authUsers, {
		fields: [authAccounts.userId],
		references: [authUsers.id]
	})
}));

export const authTwoFactorRelations = relations(authTwoFactor, ({ one }) => ({
	user: one(authUsers, {
		fields: [authTwoFactor.userId],
		references: [authUsers.id]
	})
}));

export const promptsRelations = relations(prompts, ({ many, one }) => ({
	versions: many(promptVersions),
	latestVersion: one(promptVersions, {
		fields: [prompts.latestVersionId],
		references: [promptVersions.id]
	}),
	improvementLoops: many(improvementLoops),
	executionLogs: many(executionLogs),
	councilRuns: many(councilRuns)
}));

export const promptVersionsRelations = relations(promptVersions, ({ one, many }) => ({
	prompt: one(prompts, {
		fields: [promptVersions.promptId],
		references: [prompts.id]
	}),
	parentVersion: one(promptVersions, {
		fields: [promptVersions.parentVersionId],
		references: [promptVersions.id]
	}),
	metrics: many(performanceMetrics),
	evaluations: many(judgeEvaluations)
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
	version: one(promptVersions, {
		fields: [performanceMetrics.versionId],
		references: [promptVersions.id]
	})
}));

export const judgeEvaluationsRelations = relations(judgeEvaluations, ({ one }) => ({
	version: one(promptVersions, {
		fields: [judgeEvaluations.versionId],
		references: [promptVersions.id]
	})
}));

export const improvementLoopsRelations = relations(improvementLoops, ({ one }) => ({
	prompt: one(prompts, {
		fields: [improvementLoops.promptId],
		references: [prompts.id]
	}),
	baseVersion: one(promptVersions, {
		fields: [improvementLoops.baseVersionId],
		references: [promptVersions.id]
	})
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
	prompt: one(prompts, {
		fields: [executionLogs.promptId],
		references: [prompts.id]
	}),
	version: one(promptVersions, {
		fields: [executionLogs.versionId],
		references: [promptVersions.id]
	})
}));

export const councilRunsRelations = relations(councilRuns, ({ one }) => ({
	prompt: one(prompts, {
		fields: [councilRuns.promptId],
		references: [prompts.id]
	})
}));

// Snippet relations
export const snippetsRelations = relations(snippets, ({ one, many }) => ({
	category: one(snippetCategories, {
		fields: [snippets.categoryId],
		references: [snippetCategories.id]
	}),
	tagAssignments: many(snippetTagAssignments)
}));

export const snippetCategoriesRelations = relations(snippetCategories, ({ many }) => ({
	snippets: many(snippets)
}));

export const snippetTagsRelations = relations(snippetTags, ({ many }) => ({
	tagAssignments: many(snippetTagAssignments)
}));

export const snippetTagAssignmentsRelations = relations(snippetTagAssignments, ({ one }) => ({
	snippet: one(snippets, {
		fields: [snippetTagAssignments.snippetId],
		references: [snippets.id]
	}),
	tag: one(snippetTags, {
		fields: [snippetTagAssignments.tagId],
		references: [snippetTags.id]
	})
}));

// ==================== TYPES ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;
export type ExpertiseFile = typeof expertiseFiles.$inferSelect;
export type NewExpertiseFile = typeof expertiseFiles.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;
export type JudgeEvaluation = typeof judgeEvaluations.$inferSelect;
export type NewJudgeEvaluation = typeof judgeEvaluations.$inferInsert;
export type ImprovementLoop = typeof improvementLoops.$inferSelect;
export type NewImprovementLoop = typeof improvementLoops.$inferInsert;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type NewAdminSetting = typeof adminSettings.$inferInsert;
export type ImprovePreset = typeof improvePresets.$inferSelect;
export type NewImprovePreset = typeof improvePresets.$inferInsert;
// Settings tables types
export type OpencodeConnection = typeof opencodeConnection.$inferSelect;
export type NewOpencodeConnection = typeof opencodeConnection.$inferInsert;
export type FunctionDefault = typeof functionDefaults.$inferSelect;
export type NewFunctionDefault = typeof functionDefaults.$inferInsert;
export type PromptFunctionSetting = typeof promptFunctionSettings.$inferSelect;
export type NewPromptFunctionSetting = typeof promptFunctionSettings.$inferInsert;
export type CouncilAgent = typeof councilAgents.$inferSelect;
export type NewCouncilAgent = typeof councilAgents.$inferInsert;
// Council run types
export type CouncilRun = typeof councilRuns.$inferSelect;
export type NewCouncilRun = typeof councilRuns.$inferInsert;
// Execution log types
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
// Better Auth types
export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type AuthAccount = typeof authAccounts.$inferSelect;
export type NewAuthAccount = typeof authAccounts.$inferInsert;
