# Architecture Research

**Domain:** Prompt Management with AI Execution Systems
**Researched:** 2026-02-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Prompts   │  │   Snippets  │  │  Settings   │  │  Execution  │        │
│  │    Pages    │  │    Pages    │  │    Admin    │  │   Monitor   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┴────────────────┴────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    routes/api/*                                       │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │   │
│  │  │  prompts/  │ │ snippets/  │ │ settings/  │ │ execution/       │  │   │
│  │  │  versions/ │ │  render/   │ │  resolve/  │ │  logs/ council/  │  │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 Core Domain Services                                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐  │  │
│  │  │   prompts   │ │  versions   │ │  snippets   │ │   settings     │  │  │
│  │  │  .service   │ │  .service   │ │  .service   │ │  .resolver     │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 AI Execution Services                                  │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐  │  │
│  │  │  opencode   │ │   judge     │ │ improvement │ │   council      │  │  │
│  │  │  .service   │ │  .service   │ │  .service   │ │ .orchestrator  │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 Infrastructure Services                                │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐  │  │
│  │  │ execution   │ │   audit     │ │   logger    │ │    policy      │  │  │
│  │  │  .logger    │ │   .service  │ │  .service   │ │  .enforcer     │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    OpenCode SDK Adapter                                │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                │  │
│  │  │   contracts   │ │    client     │ │  frontmatter  │                │  │
│  │  │  (validation) │ │  (transport)  │ │   (parsing)   │                │  │
│  │  └───────────────┘ └───────────────┘ └───────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ prompts  │  │ versions │  │ snippets │  │ settings │  │ execution_   │   │
│  │          │  │          │  │          │  │          │  │    logs      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                         Drizzle ORM + SQLite                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                | Responsibility                                                     | Typical Implementation                                                    |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Settings Resolver**    | Model selection per function, policy enforcement, cascade fallback | Service with caching, follows pattern from existing `getOpenCodePolicy()` |
| **Execution Logger**     | Persist execution metadata, timing, tokens, errors                 | Async write service with batching                                         |
| **Snippet Service**      | Variable replacement, preview rendering, template compilation      | String interpolation with validation                                      |
| **Council Orchestrator** | Multi-step AI workflows, subagent coordination, state management   | Orchestrator-worker pattern with checkpoints                              |
| **OpenCode Adapter**     | SDK boundary, error mapping, type safety                           | Existing `opencode.service.ts` pattern                                    |
| **Contract Parser**      | Agent response validation, schema enforcement                      | Existing `contracts.ts` with Zod-like validation                          |

## Recommended Project Structure

```
src/lib/server/
├── services/
│   ├── prompts.service.ts          # Existing - prompt CRUD
│   ├── versions.service.ts         # Existing - version management
│   ├── admin-settings.service.ts   # Existing - settings CRUD
│   ├── opencode.service.ts         # Existing - SDK adapter
│   ├── judge.service.ts            # Existing - evaluation
│   ├── improvement.service.ts      # Existing - variant generation
│   ├── improve-presets.service.ts  # Existing - instruction templates
│   │
│   ├── settings.resolver.ts        # NEW - cascading settings resolution
│   ├── snippet.service.ts          # NEW - template variable replacement
│   ├── execution-logger.service.ts # NEW - execution log persistence
│   ├── council.orchestrator.ts     # NEW - multi-step workflow coordination
│   └── policy.enforcer.ts          # NEW - centralized policy validation
│
├── opencode/
│   ├── client.ts                   # Existing - SDK client factory
│   ├── contracts.ts                # Existing - response validation
│   └── frontmatter.ts              # Existing - metadata parsing
│
├── db/
│   ├── client.ts                   # Existing - Drizzle client
│   ├── schema.ts                   # Extend - add execution_logs table
│   └── seed.ts                     # Existing
│
└── utils/
    ├── yaml.ts                     # Existing
    └── semver.ts                   # Existing

src/routes/api/
├── prompts/                        # Existing
├── admin/settings/                 # Existing
├── opencode/                       # Existing
├── judge/                          # Existing
│
├── settings/                       # NEW
│   └── resolve/+server.ts          # Settings resolution endpoint
│
├── snippets/                       # NEW
│   ├── +server.ts                  # Snippet CRUD
│   └── render/+server.ts           # Render preview endpoint
│
├── execution/                      # NEW
│   ├── logs/+server.ts             # Query execution history
│   └── [id]/+server.ts             # Single execution details
│
└── council/                        # NEW
    ├── start/+server.ts            # Start multi-step workflow
    ├── [id]/status/+server.ts      # Check workflow status
    └── [id]/cancel/+server.ts      # Cancel running workflow
```

### Structure Rationale

- **services/**: Business logic isolated from routes. Services call other services, routes call services.
- **opencode/**: SDK boundary isolated. All external AI communication goes through this adapter.
- **db/**: Schema and data access centralized. Services use Drizzle ORM through `db/client.ts`.
- **routes/api/**: Thin handlers that delegate to services. Validation at route level, business logic in services.

## Architectural Patterns

### Pattern 1: Settings Resolution Cascade

**What:** Multi-level settings with precedence: Request > Preset > User Default > System Default
**When to use:** Any feature that needs configurable model/temperature parameters
**Trade-offs:** Slight complexity increase, but maximum flexibility and auditability

**Example:**

```typescript
// settings.resolver.ts
export interface ResolvedSettings {
	model: { providerId: string; modelId: string };
	temperature: number;
	maxTokens?: number;
	source: 'request' | 'preset' | 'policy' | 'default';
}

export async function resolveSettings(
	functionType: 'judge' | 'improve' | 'council',
	options: {
		requestModel?: string;
		presetId?: number;
	}
): Promise<ResolvedSettings> {
	const policy = await getOpenCodePolicy();

	// 1. Request override (highest priority)
	if (options.requestModel && isModelAllowed(options.requestModel, policy)) {
		return {
			model: parseModelId(options.requestModel),
			temperature: policy[`${functionType}Temperature`],
			source: 'request'
		};
	}

	// 2. Preset lookup
	if (options.presetId) {
		const preset = await getPreset(options.presetId);
		if (preset?.model && isModelAllowed(preset.model, policy)) {
			return {
				model: parseModelId(preset.model),
				temperature: preset.temperature ?? policy[`${functionType}Temperature`],
				source: 'preset'
			};
		}
	}

	// 3. Policy default
	return {
		model: parseModelId(policy[`${functionType}DefaultModel`]),
		temperature: policy[`${functionType}Temperature`],
		source: 'policy'
	};
}
```

### Pattern 2: Execution Logging with Async Persistence

**What:** Fire-and-forget logging that doesn't block the main execution path
**When to use:** Every AI execution that needs audit trail or metrics
**Trade-offs:** Eventual consistency, but no latency impact on user-facing operations

**Example:**

```typescript
// execution-logger.service.ts
interface ExecutionLog {
	id?: number;
	functionType: 'judge' | 'improve' | 'council';
	promptVersionId?: number;
	modelId: string;
	providerId: string;
	temperature: number;
	tokensUsed?: number;
	durationMs: number;
	status: 'success' | 'error' | 'timeout';
	errorMessage?: string;
	metadata?: Record<string, unknown>;
}

// Async queue for batch writes
const logQueue: ExecutionLog[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export function logExecution(log: ExecutionLog): void {
	logQueue.push({ ...log, createdAt: new Date() });

	// Batch flush every 5 seconds or when queue > 50 items
	if (logQueue.length >= 50 || !flushTimeout) {
		flushTimeout = setTimeout(flushLogs, 5000);
	}
	if (logQueue.length >= 50) {
		flushLogs();
	}
}

async function flushLogs(): Promise<void> {
	if (logQueue.length === 0) return;

	const toWrite = logQueue.splice(0, logQueue.length);
	try {
		await db.insert(executionLogs).values(toWrite);
	} catch (err) {
		console.error('Failed to flush execution logs:', err);
		// Re-queue failed items at the end
		logQueue.push(...toWrite);
	}
}
```

### Pattern 3: Council Orchestrator (Orchestrator-Worker)

**What:** Lead agent coordinates, specialized subagents execute in parallel
**When to use:** Multi-step AI workflows that exceed single-agent capacity
**Trade-offs:** Higher token cost, but better quality for complex tasks

**Example:**

```typescript
// council.orchestrator.ts
interface CouncilStep {
	id: string;
	agent: string;
	input: unknown;
	status: 'pending' | 'running' | 'completed' | 'failed';
	output?: unknown;
	error?: string;
}

interface CouncilWorkflow {
	id: string;
	promptVersionId: number;
	steps: CouncilStep[];
	currentStep: number;
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	checkpoint?: Record<string, unknown>;
}

export class CouncilOrchestrator {
	private workflows = new Map<string, CouncilWorkflow>();

	async startWorkflow(
		promptVersionId: number,
		steps: Omit<CouncilStep, 'id' | 'status' | 'output' | 'error'>[]
	): Promise<string> {
		const workflowId = crypto.randomUUID();
		const workflow: CouncilWorkflow = {
			id: workflowId,
			promptVersionId,
			steps: steps.map((s, i) => ({ ...s, id: `${i}`, status: 'pending' })),
			currentStep: 0,
			status: 'running'
		};

		this.workflows.set(workflowId, workflow);
		await this.persistCheckpoint(workflow);
		await this.executeNextStep(workflow);

		return workflowId;
	}

	private async executeNextStep(workflow: CouncilWorkflow): Promise<void> {
		const step = workflow.steps[workflow.currentStep];
		if (!step) {
			workflow.status = 'completed';
			await this.persistCheckpoint(workflow);
			return;
		}

		step.status = 'running';
		const startTime = Date.now();

		try {
			const settings = await resolveSettings('council', {});
			const result = await executeAgentWithSession({
				model: settings.model,
				agent: step.agent,
				parts: [{ type: 'text', text: JSON.stringify(step.input) }],
				temperature: settings.temperature
			});

			step.output = result;
			step.status = 'completed';

			logExecution({
				functionType: 'council',
				modelId: settings.model.modelId,
				providerId: settings.model.providerId,
				temperature: settings.temperature,
				durationMs: Date.now() - startTime,
				status: 'success',
				metadata: { workflowId: workflow.id, stepId: step.id }
			});

			workflow.currentStep++;
			await this.persistCheckpoint(workflow);
			await this.executeNextStep(workflow);
		} catch (err) {
			step.status = 'failed';
			step.error = err instanceof Error ? err.message : String(err);
			workflow.status = 'failed';

			logExecution({
				functionType: 'council',
				durationMs: Date.now() - startTime,
				status: 'error',
				errorMessage: step.error
			});

			await this.persistCheckpoint(workflow);
		}
	}

	private async persistCheckpoint(workflow: CouncilWorkflow): Promise<void> {
		// Store workflow state for resumption after errors
		// This enables recovery from failures without restarting
	}
}
```

### Pattern 4: Snippet Variable Replacement

**What:** Template engine for prompt content with typed variables
**When to use:** Reusable prompt templates with dynamic content
**Trade-offs:** Additional validation layer, but enables powerful reuse

**Example:**

```typescript
// snippet.service.ts
interface SnippetVariable {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required: boolean;
	defaultValue?: unknown;
	description?: string;
}

interface Snippet {
	id: number;
	name: string;
	content: string; // Contains {{variable}} placeholders
	variables: SnippetVariable[];
}

export function renderSnippet(
	snippet: Snippet,
	values: Record<string, unknown>
): { content: string; errors: string[] } {
	const errors: string[] = [];

	// Validate required variables
	for (const v of snippet.variables) {
		if (v.required && !(v.name in values)) {
			errors.push(`Missing required variable: ${v.name}`);
		}
	}

	if (errors.length > 0) {
		return { content: '', errors };
	}

	// Replace placeholders with values
	let content = snippet.content;
	for (const v of snippet.variables) {
		const value = values[v.name] ?? v.defaultValue;
		const placeholder = new RegExp(`\\{\\{\\s*${v.name}\\s*\\}\\}`, 'g');
		content = content.replace(placeholder, String(value));
	}

	return { content, errors: [] };
}
```

## Data Flow

### Request Flow

```
[User Action]
     ↓
[Client Component] → [API Route] → [Service Layer] → [OpenCode Adapter] → [AI Provider]
     ↓                  ↓               ↓                  ↓
[UI Update]    ← [JSON Response] ← [Business Logic] ← [Agent Response]
```

### Settings Resolution Flow

```
[Request with optional overrides]
              ↓
     [Settings Resolver]
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[Request]  [Preset]  [Policy]
 Override   Default   Default
    ↓         ↓         ↓
    └────→ [Merge] ←────┘
              ↓
     [Resolved Settings]
              ↓
     [Policy Enforcement]
              ↓
     [Validated Config]
```

### Council Workflow Flow

```
[Start Request]
       ↓
[Orchestrator.create()]
       ↓
[Step 1: Analyze] ─────────────────┐
       ↓                           │
[Checkpoint Persist]               │
       ↓                           │
[Step 2: Research] ──→ [Subagent 1]├─→ [Parallel Execution]
       ↓                [Subagent 2]│
[Checkpoint Persist]   [Subagent 3]│
       ↓                           │
[Step 3: Synthesize] ←─────────────┘
       ↓
[Step 4: Validate]
       ↓
[Complete/Cancellation Point]
       ↓
[Final Result + Logs]
```

### Key Data Flows

1. **Settings → Execution:** Settings resolver provides validated model config to all execution services
2. **Prompt → Execution:** Prompt versions flow through judge/improve/council pipelines
3. **Execution → Logs:** All AI calls emit execution logs asynchronously
4. **Snippet → Prompt:** Rendered snippets can become prompt content

## Scaling Considerations

| Scale         | Architecture Adjustments                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| 0-1k users    | Monolith fine. In-memory log queue. Single DB.                               |
| 1k-100k users | Add connection pooling. Move log queue to Redis. Consider read replicas.     |
| 100k+ users   | Separate execution workers. Async job queue (BullMQ). Dedicated log service. |

### Scaling Priorities

1. **First bottleneck:** Database connections under concurrent AI executions
   - **Fix:** Connection pooling, batch log writes, read replicas for queries
2. **Second bottleneck:** Long-running council workflows blocking resources
   - **Fix:** External job queue, workflow persistence, async step execution

## Anti-Patterns

### Anti-Pattern 1: Direct SDK Calls in Routes

**What people do:** Call OpenCode SDK directly from API route handlers
**Why it's wrong:** Tight coupling, hard to test, no error mapping, inconsistent patterns
**Do this instead:** Always go through the service layer which wraps the SDK adapter

### Anti-Pattern 2: Synchronous Logging

**What people do:** Await database log writes in the main execution path
**Why it's wrong:** Adds latency to every AI call, database issues become user-facing errors
**Do this instead:** Use async fire-and-forget logging with batch flush

### Anti-Pattern 3: Settings in Environment Only

**What people do:** Read all settings from `process.env` at startup
**Why it's wrong:** Can't change settings without restart, no per-function configuration
**Do this instead:** Database-backed settings with resolution cascade and caching

### Anti-Pattern 4: Monolithic Workflow Functions

**What people do:** One giant async function for multi-step workflows
**Why it's wrong:** No checkpointing, can't resume after failure, hard to debug
**Do this instead:** Step-based orchestrator with explicit state persistence

## Integration Points

### External Services

| Service       | Integration Pattern                       | Notes                                     |
| ------------- | ----------------------------------------- | ----------------------------------------- |
| OpenCode SDK  | Adapter pattern via `opencode.service.ts` | Error mapping, retry logic, health checks |
| LLM Providers | Through OpenCode abstraction              | Don't call directly - use SDK             |

### Internal Boundaries

| Boundary            | Communication             | Notes                                          |
| ------------------- | ------------------------- | ---------------------------------------------- |
| Routes ↔ Services   | Direct function calls     | Services are stateless, inject via imports     |
| Services ↔ OpenCode | Through adapter interface | All SDK calls go through `opencode.service.ts` |
| Services ↔ Database | Through Drizzle ORM       | Centralized in `db/client.ts`                  |
| Services ↔ Settings | Async resolution          | Cache policy for performance                   |

## Build Order Implications

Based on dependency analysis, recommended implementation sequence:

### Phase 1: Foundation (Settings + Logging)

1. **Settings Resolver** - No dependencies, blocks all other work
2. **Execution Logger** - No dependencies, needed for all AI calls

### Phase 2: Core Features (Snippets)

3. **Snippet Service** - Depends on nothing, independent feature

### Phase 3: Advanced Features (Council)

4. **Council Orchestrator** - Depends on Settings Resolver + Execution Logger

### Dependency Graph

```
Settings Resolver ─────────────┬─────────────────→ Council Orchestrator
       │                       │                          │
       ▼                       │                          ▼
Execution Logger ──────────────┴─────────────────→ Council Orchestrator
                                                        │
Snippet Service (independent)                            │
                                                        ▼
                                              All depend on:
                                              - OpenCode Adapter (existing)
                                              - Drizzle ORM (existing)
```

## Sources

- **Anthropic Multi-Agent Architecture** - https://www.anthropic.com/engineering/multi-agent-research-system (HIGH confidence)
- **Vercel AI SDK Patterns** - Context7 `/websites/ai-sdk_dev` (HIGH confidence)
- **SvelteKit Architecture** - Context7 `/sveltejs/kit` (HIGH confidence)
- **Existing codebase patterns** - `src/lib/server/services/*.ts` (HIGH confidence)

---

_Architecture research for: Prompt Management + AI Execution Systems_
_Researched: 2026-02-14_
