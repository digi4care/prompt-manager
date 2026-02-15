# Phase 1: Settings Foundation - Research

**Researched:** 2026-02-15
**Domain:** SvelteKit + OpenCode SDK + Settings Management
**Confidence:** HIGH

## Summary

This phase implements a per-function model defaults system with a 3-level resolution cascade (Run > Prompt > Global). The user has already made key architectural decisions including table-based UI layout, OpenCode SDK integration for dynamic model fetching, and a repeater pattern for Council agents.

The implementation will build on existing patterns in the codebase: the OpenCode service layer, admin-settings service pattern, model-picker component, and Zod validation. The main new work involves creating the database schema for function defaults, prompt overrides, and council agents, plus building the settings table UI with real-time validation.

**Primary recommendation:** Follow the existing codebase patterns - extend admin-settings.service.ts for the new function_defaults table, reuse the model-picker component pattern for model selection, and implement inline validation using Zod's safeParse with a hybrid debounce strategy (300ms for numbers, on-blur for text).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Implementation Decisions

#### OpenCode Connection (PREREQUISITE)

**SDK Integratie:**

- **Auto mode (default):** `createOpencode()` start automatisch server
- **Custom mode:** `createOpencodeClient({ baseUrl })` verbindt met bestaande server
- **Mode keuze:** Auto indien gedefinieerd = custom URL als ingesteld, anders auto

**SDK Initialisatie:**

```javascript
// Auto mode (default)
const { client } = await createOpencode({ port: 4096 });

// Custom URL mode
const client = createOpencodeClient({ baseUrl: customUrl });
```

**UI Component:**

```
┌─────────────────────────────────────────────────────────────┐
│ OpenCode Connection                                         │
├─────────────────────────────────────────────────────────────┤
│ Mode: [● Auto (start server)] [○ Custom URL]               │
│ Custom URL: [http://127.0.0.1:4096    ] (if custom)        │
│                                                             │
│ Status: 🟢 Connected │ Providers: 3 │ Models: 45           │
│ [Test Connection]                                           │
└─────────────────────────────────────────────────────────────┘
```

**SDK API Calls:**
| Doel | SDK Call |
|------|----------|
| Health check | `client.global.health()` |
| Providers ophalen | `client.config.providers()` |
| Modellen lijst | Uit `providers[].models` |

#### Settings UI Layout

- **Table layout** — compact, alle 4 functies in één oogopslag vergelijkbaar
- **Kolommen:** Function | Model | Temperature | Max Tokens | Prompt | Reset
- **Provider logos** via `https://models.dev/logos/{provider}.svg`
- **Modellen dropdown** dynamisch via OpenCode SDK van geconfigureerde providers
- **Providers:** Gebruik bestaande OpenCode config (handmatig beheerd door gebruiker)
- **Ongeldig model:** Validation error — gebruiker moet nieuw model kiezen

#### Council Configuration

- **Repeater pattern** — minimaal 2 agents, automatisch nieuwe lege regel
- **Temperature per agent** — elk model eigen temp instelling
- **Duplicates toegestaan** — zelfde model meerdere keren mogelijk (voor consistentie tests)
- **Nieuwe regel verschijnt** na invullen van laatste lege regel

#### Prompt Per Functie

- **Prompt kolom** met [📝] icoon per functie
- **Klik op icoon** opent Prompt Selector Modal
- **Modal toont:** zoekveld, lijst bestaande prompts, "Create New Prompt" knop
- **Selecteren** koppelt prompt aan functie

#### Validation UX

- **Inline + Summary** — rode border op veld + foutenlijst boven tabel
- **Hybride validatie:**
  - Dropdowns: real-time (geen debounce nodig)
  - Numbers: real-time met 300ms debounce
  - Text: on blur
- **Save blocked** — kan niet opslaan zolang er fouten zijn
- **Fix Errors / Reset to Defaults / Cancel** opties bij blocked save

#### Cascade Visibility

- **3-level cascade:** Run Override > Prompt Override > Global Default
- **Badge per level:** `[run]` / `[prompt]` / `[default]`
- **Simplified:** Geen Presets, geen Policy (solo developer)

#### Per-Prompt Overrides

- **Prompt Editor** bevat optionele "Function Settings" sectie
- **Dropdown opties:** "Use Global" of specifiek model kiezen
- **Opgeslagen in database** — persistent per prompt
- **Reset [↺]** in Prompt Editor = terug naar "Use Global"

#### Run Overrides

- **Test Runner** heeft dropdowns per functie tab (Execute, Judge, Improve, Council)
- **Dropdown toont:** "Use Prompt Setting", "Use Global Default", of specifiek model
- **Niet persistent** — alleen voor huidige test sessie

#### Reset Behavior

- **Per-functie reset [↺]:** Reset alles (model, temp, tokens, prompt) + bevestiging modal
- **Reset All:** Extra waarschuwing met lijst van 4 functies + "This action cannot be undone"
- **Geen undo** — bevestiging is genoeg

#### Default Waarden (Hardcoded)

| Functie  | Temperature | Max Tokens |
| -------- | ----------- | ---------- |
| Executor | 0.7         | 4096       |
| Judge    | 0.3         | 2048       |
| Improve  | 0.7         | 4096       |
| Council  | 0.5         | 8192       |

Model default = eerste beschikbare model uit OpenCode SDK lijst

### Claude's Discretion

- Exact debounce implementatie (setTimeout vs library)
- Modal styling en animatie
- Exacte foutmelding teksten
- Badge kleuren en styling
- Provider logo fallback (als models.dev niet bereikbaar)

### Deferred Ideas (OUT OF SCOPE)

- **Preset systeem** — benoemde configuraties (creative, strict, etc.) — niet nodig voor solo dev
- **Policy niveau** — team/organisatie regels — niet nodig voor solo dev
- **Provider management UI** — aparte pagina om providers te kiezen/connecten — handmatig via OpenCode config
- **Audit log** — wie heeft wat gewijzigd — nice to have voor later

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @opencode-ai/sdk | ^1.1.53 | OpenCode server communication | Already in project, provides model catalog |
| zod | ^4.3.6 | Schema validation | Already in project, type-safe validation |
| drizzle-orm | ^0.45.1 | Database ORM | Already in project, SQLite/libsql |
| svelte-sonner | ^1.0.7 | Toast notifications | Already in project, consistent UX |
| bits-ui | ^2.15.5 | UI primitives | Already in project, accessible components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @lucide/svelte | ^0.563.1 | Icons | For UI icons (📝, ↺, etc.) |
| clsx + tailwind-merge | ^2.1.1 / ^3.4.0 | Class utilities | For conditional styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom debounce | lodash.debounce | Native setTimeout is simpler, no dependency |
| Custom dialog | bits-ui dialog | bits-ui exists but current custom dialog is simpler |

**No additional installation required** — all dependencies already in package.json.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   └── schema.ts          # Add new tables here
│   │   └── services/
│   │       ├── function-defaults.service.ts  # NEW: CRUD for function_defaults
│   │       ├── prompt-function-settings.service.ts  # NEW: Per-prompt overrides
│   │       └── council-agents.service.ts  # NEW: Council repeater CRUD
│   └── components/
│       └── admin/
│           └── function-settings/
│               ├── settings-table.svelte      # Main settings table
│               ├── model-dropdown.svelte      # Provider-grouped model selector
│               ├── prompt-selector-modal.svelte  # Prompt picker modal
│               ├── reset-confirm-modal.svelte    # Reset confirmation
│               └── validation-summary.svelte     # Error summary display
└── routes/
    ├── admin/
    │   └── settings/
    │       └── +page.svelte        # Settings page (NEW or extend ai-settings)
    └── api/
        └── admin/
            └── function-defaults/
                └── +server.ts      # API endpoints for settings
```

### Pattern 1: OpenCode SDK Integration

**What:** Two modes for connecting to OpenCode - auto (starts server) or custom URL
**When to use:** For the OpenCode Connection settings component

**Example:**
```typescript
// Source: Context7 /websites/opencode_ai
import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';

// Auto mode - starts server automatically
const { client } = await createOpencode({ port: 4096 });

// Custom URL mode - connect to existing server
const client = createOpencodeClient({ baseUrl: 'http://localhost:4096' });

// Health check
const health = await client.global.health();
console.log(health.data.version);

// Get provider/model catalog
const { providers, default: defaults } = await client.config.providers();
```

### Pattern 2: Svelte 5 Reactive Form State

**What:** Using runes for form state management with validation
**When to use:** Settings table with real-time validation

**Example:**
```svelte
<!-- Source: Context7 /websites/svelte_dev -->
<script lang="ts">
  let settings = $state<FunctionSettings[]>([]);
  let errors = $state<Record<string, string>>({});
  
  // Derived: has any errors?
  let hasErrors = $derived(Object.keys(errors).length > 0);
  
  // Derived: count errors
  let errorCount = $derived(Object.keys(errors).length);
  
  // Effect: validate on settings change
  $effect(() => {
    validateSettings(settings);
  });
  
  function validateSettings(settings: FunctionSettings[]) {
    const newErrors: Record<string, string> = {};
    for (const setting of settings) {
      if (setting.temperature < 0 || setting.temperature > 2) {
        newErrors[`${setting.functionType}.temperature`] = 'Temperature must be 0-2';
      }
    }
    errors = newErrors;
  }
</script>
```

### Pattern 3: Zod Validation with safeParse

**What:** Non-throwing validation that returns success/errors
**When to use:** Form validation with inline feedback

**Example:**
```typescript
// Source: Context7 /websites/zod_dev
import { z } from 'zod';

const functionSettingSchema = z.object({
  functionType: z.enum(['executor', 'judge', 'improve', 'council']),
  modelId: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(1000000),
  promptId: z.number().optional()
});

// Validate single field for real-time feedback
function validateField(field: string, value: unknown): string | null {
  const result = functionSettingSchema.shape[field].safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

// Validate entire object
function validateSettings(data: unknown) {
  const result = functionSettingSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.join('.')] = issue.message;
  }
  return { success: false, data: null, errors };
}
```

### Pattern 4: Debounce Implementation

**What:** Simple debounce using setTimeout/clearTimeout
**When to use:** Number input validation (300ms delay per requirements)

**Example:**
```typescript
// No library needed - native implementation
function createDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

// Usage in component
const debouncedValidate = createDebounce((field: string, value: number) => {
  const error = validateField(field, value);
  if (error) {
    errors = { ...errors, [field]: error };
  } else {
    const { [field]: _, ...rest } = errors;
    errors = rest;
  }
}, 300);
```

### Pattern 5: Model Dropdown with Provider Logos

**What:** Grouped dropdown showing providers with logos and their models
**When to use:** Model selection in settings table

**Example:**
```svelte
<script lang="ts">
  // Provider logo URL: https://models.dev/logos/{provider}.svg
  const getLogoUrl = (providerId: string) => 
    `https://models.dev/logos/${providerId}.svg`;
  
  // Handle logo load failure with fallback
  function handleLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
</script>

<select>
  <optgroup label="Use Settings">
    <option value="">Use Global Default</option>
  </optgroup>
  {#each providers as provider}
    <optgroup label={provider.name}>
      <img 
        src={getLogoUrl(provider.id)} 
        alt={provider.name}
        onerror={handleLogoError}
        class="w-4 h-4 inline mr-2"
      />
      {#each Object.values(provider.models) as model}
        <option value="{provider.id}/{model.id}">
          {model.name}
        </option>
      {/each}
    </optgroup>
  {/each}
</select>
```

### Anti-Patterns to Avoid

- **Don't use `$:` reactive statements** — Svelte 5 uses runes ($state, $derived, $effect)
- **Don't call Zod `.parse()` directly** — throws on error, use `.safeParse()` instead
- **Don't fetch providers on every render** — use existing TTL cache pattern from opencode.service.ts
- **Don't hardcode model lists** — always fetch from OpenCode SDK for dynamic catalog
- **Don't validate on every keystroke for text** — use on-blur per requirements

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast | svelte-sonner | Already integrated, consistent API |
| Model catalog fetching | Custom fetch | opencode.service.ts | Has TTL cache, error mapping |
| Dialog/modal | Custom modal | Existing dialog component | Already tested, accessible |
| Form validation | Manual validation | Zod safeParse | Type-safe, detailed errors |
| Debounce | lodash.debounce | Native setTimeout | Zero dependency, simple enough |
| Class merging | Manual concatenation | cn() utility | Already exists in $lib/utils |

**Key insight:** The codebase already has well-tested patterns for OpenCode integration, validation, and UI components. Extend these rather than creating new implementations.

## Common Pitfalls

### Pitfall 1: Temperature Range Confusion
**What goes wrong:** Using 0-1 range instead of 0-2 for temperature
**Why it happens:** OpenAI uses 0-2, some UI patterns default to 0-1
**How to avoid:** Context requirements specify 0-2 range. Use `z.number().min(0).max(2)` for validation
**Warning signs:** Users reporting "temperature seems to have no effect" or validation errors

### Pitfall 2: Model ID Format Mismatch
**What goes wrong:** Storing model ID without provider prefix (e.g., "gpt-4" vs "openai/gpt-4")
**Why it happens:** Inconsistent handling between catalog and storage
**How to avoid:** Always use `{providerID}/{modelID}` format. Existing model-picker already does this.
**Warning signs:** Model not found errors, wrong model selected

### Pitfall 3: Cascade Level Tracking
**What goes wrong:** Losing track of which level provided a value (run/prompt/global)
**Why it happens:** Multiple sources can provide same setting
**How to avoid:** Store source level alongside resolved value. Add `model_source` field per requirements.
**Warning signs:** Can't trace why a specific model was used

### Pitfall 4: Council Repeater State Management
**What goes wrong:** Empty rows persisting, duplicate IDs, race conditions on add/remove
**Why it happens:** Complex state with dynamic rows
**How to avoid:** Use array with stable IDs, only add new row when last row is "complete", clean up empty rows on save
**Warning signs:** Duplicate agents, missing agents, validation confusion

### Pitfall 5: Stale Model Catalog
**What goes wrong:** Showing models that are no longer available or missing new ones
**Why it happens:** Not refreshing catalog, caching too long
**How to avoid:** Use existing 5-minute TTL cache, provide manual refresh button, validate model exists before save
**Warning signs:** "Invalid model" errors, user can't find their model

### Pitfall 6: Validation Timing
**What goes wrong:** Showing errors too aggressively or not enough
**Why it happens:** Mixing validation strategies incorrectly
**How to avoid:** Follow hybrid approach: dropdowns immediate, numbers debounced (300ms), text on-blur
**Warning signs:** Annoying validation flashes, stale errors

## Code Examples

### Database Schema (Drizzle ORM)

```typescript
// Source: Existing schema.ts pattern + Context requirements
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// OpenCode Connection Config (singleton)
export const opencodeConnection = sqliteTable('opencode_connection', {
  id: integer('id').primaryKey().check(sql`id = 1`), // Singleton
  mode: text('mode').$type<'auto' | 'custom'>().notNull().default('auto'),
  baseUrl: text('base_url'), // null for auto mode
  lastConnected: integer('last_connected', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Function Defaults (Global Settings)
export const functionDefaults = sqliteTable('function_defaults', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  functionType: text('function_type').$type<'executor' | 'judge' | 'improve' | 'council'>().notNull().unique(),
  modelId: text('model_id').notNull(),
  temperature: real('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(4096),
  promptId: integer('prompt_id').references(() => prompts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Per-Prompt Overrides
export const promptFunctionSettings = sqliteTable('prompt_function_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  promptId: integer('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  functionType: text('function_type').$type<'executor' | 'judge' | 'improve' | 'council'>().notNull(),
  modelOverride: text('model_override'), // null = use global
  temperature: real('temperature'), // null = use global
  maxTokens: integer('max_tokens'), // null = use global
  promptLinkId: integer('prompt_link_id').references(() => prompts.id)
}, (table) => ({
  uniquePromptFunction: unique().on(table.promptId, table.functionType)
}));

// Council Agents (Repeater)
export const councilAgents = sqliteTable('council_agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentType: text('parent_type').$type<'global' | 'prompt'>().notNull(),
  parentId: integer('parent_id').notNull(), // function_defaults.id or prompt_function_settings.id
  agentOrder: integer('agent_order').notNull(), // 1, 2, 3...
  modelId: text('model_id').notNull(),
  temperature: real('temperature').notNull().default(0.5),
  maxTokens: integer('max_tokens').notNull().default(8192),
  promptLinkId: integer('prompt_link_id').references(() => prompts.id)
});
```

### Settings Service Pattern

```typescript
// Source: Existing admin-settings.service.ts pattern
import { db } from '../db/client';
import { functionDefaults, type FunctionDefault, type NewFunctionDefault } from '../db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_FUNCTION_SETTINGS: Record<string, Omit<NewFunctionDefault, 'id' | 'createdAt' | 'updatedAt'>> = {
  executor: { functionType: 'executor', modelId: '', temperature: 0.7, maxTokens: 4096 },
  judge: { functionType: 'judge', modelId: '', temperature: 0.3, maxTokens: 2048 },
  improve: { functionType: 'improve', modelId: '', temperature: 0.7, maxTokens: 4096 },
  council: { functionType: 'council', modelId: '', temperature: 0.5, maxTokens: 8192 }
};

export async function getFunctionDefaults(): Promise<FunctionDefault[]> {
  const defaults = await db.select().from(functionDefaults);
  
  if (defaults.length === 0) {
    // Initialize with defaults
    return initializeDefaults();
  }
  
  return defaults;
}

export async function updateFunctionDefault(
  functionType: string,
  data: Partial<NewFunctionDefault>
): Promise<FunctionDefault> {
  const existing = await db
    .select()
    .from(functionDefaults)
    .where(eq(functionDefaults.functionType, functionType))
    .limit(1);
  
  if (existing.length > 0) {
    const [updated] = await db
      .update(functionDefaults)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(functionDefaults.functionType, functionType))
      .returning();
    return updated;
  }
  
  const [inserted] = await db
    .insert(functionDefaults)
    .values({ functionType, ...data })
    .returning();
  return inserted;
}

export async function resetFunctionDefault(functionType: string): Promise<FunctionDefault | null> {
  const defaults = DEFAULT_FUNCTION_SETTINGS[functionType];
  if (!defaults) return null;
  
  return updateFunctionDefault(functionType, {
    modelId: '', // Will need to be set to first available model
    ...defaults
  });
}
```

### Validation Schema for Settings

```typescript
// Source: Existing prompt-metadata.ts pattern + Context7 Zod docs
import { z } from 'zod';

export const functionSettingSchema = z.object({
  functionType: z.enum(['executor', 'judge', 'improve', 'council']),
  modelId: z.string().min(1, 'Model is required'),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2'),
  maxTokens: z
    .number()
    .int('Max tokens must be a whole number')
    .min(1, 'Max tokens must be at least 1')
    .max(1000000, 'Max tokens cannot exceed 1,000,000'),
  promptId: z.number().optional().nullable()
});

export const councilAgentSchema = z.object({
  modelId: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(1000000),
  promptLinkId: z.number().optional().nullable()
});

export const settingsTableSchema = z.object({
  executor: functionSettingSchema,
  judge: functionSettingSchema,
  improve: functionSettingSchema,
  council: functionSettingSchema,
  councilAgents: z.array(councilAgentSchema).min(2, 'Council requires at least 2 agents')
});

// Real-time field validation
export function validateField(
  schema: z.ZodTypeAny,
  value: unknown
): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message ?? 'Invalid value';
}
```

### Cascade Resolution Pattern

```typescript
// Model resolution cascade: Run > Prompt > Global
type SourceLevel = 'run' | 'prompt' | 'global';

interface ResolvedModel {
  modelId: string;
  temperature: number;
  maxTokens: number;
  source: SourceLevel;
}

export function resolveModelSettings(options: {
  runOverride?: Partial<ResolvedModel> | null;
  promptOverride?: Partial<ResolvedModel> | null;
  globalDefault: ResolvedModel;
}): ResolvedModel {
  // 1. Check run-level override first
  if (options.runOverride?.modelId) {
    return {
      modelId: options.runOverride.modelId,
      temperature: options.runOverride.temperature ?? options.globalDefault.temperature,
      maxTokens: options.runOverride.maxTokens ?? options.globalDefault.maxTokens,
      source: 'run'
    };
  }
  
  // 2. Check prompt-level override
  if (options.promptOverride?.modelId) {
    return {
      modelId: options.promptOverride.modelId,
      temperature: options.promptOverride.temperature ?? options.globalDefault.temperature,
      maxTokens: options.promptOverride.maxTokens ?? options.globalDefault.maxTokens,
      source: 'prompt'
    };
  }
  
  // 3. Fall back to global default
  return { ...options.globalDefault, source: 'global' };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 reactive `$:` | Svelte 5 runes (`$state`, `$derived`, `$effect`) | Svelte 5 release | More explicit reactivity, better TypeScript support |
| Hardcoded model lists | Dynamic catalog from OpenCode SDK | This project | Always current, no manual updates |
| Global settings only | 3-level cascade (Run > Prompt > Global) | This phase | Maximum flexibility without complexity |
| Validation on submit | Hybrid real-time validation | This phase | Better UX, immediate feedback |

**Deprecated/outdated:**
- `export let` for props → Use `$props()` rune
- Reactive `$:` statements → Use `$derived()` or `$effect()`
- Manual class concatenation → Use `cn()` utility

## Open Questions

1. **OpenCode Auto-Mode Implementation Detail**
   - What we know: `createOpencode()` starts server automatically
   - What's unclear: Does it need explicit cleanup? What port conflicts handling?
   - Recommendation: Test in development, add graceful shutdown handling

2. **Provider Logo Fallback Strategy**
   - What we know: `models.dev/logos/{provider}.svg` is the URL pattern
   - What's unclear: What happens when models.dev is down? What's the fallback image?
   - Recommendation: Use `onerror` to hide broken image, show provider name as text fallback

3. **Council Agent Parent ID Reference**
   - What we know: `council_agents.parent_id` references either `function_defaults.id` or `prompt_function_settings.id`
   - What's unclear: How to enforce referential integrity without polymorphic foreign keys in SQLite
   - Recommendation: No FK constraint, rely on application-level cleanup on delete

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/opencode_ai` - OpenCode SDK API (createOpencode, createOpencodeClient, client.config.providers, client.global.health)
- Context7 `/websites/zod_dev` - Zod validation patterns (safeParse, number ranges, error handling)
- Context7 `/websites/svelte_dev` - Svelte 5 runes ($state, $derived, $bindable, $effect)
- Existing codebase: `src/lib/server/services/opencode.service.ts` - OpenCode integration pattern
- Existing codebase: `src/lib/server/services/admin-settings.service.ts` - Settings service pattern
- Existing codebase: `src/lib/validators/prompt-metadata.ts` - Zod validation pattern

### Secondary (MEDIUM confidence)
- Google Search verified: models.dev logo URL format (`https://models.dev/logos/{provider}.svg`)
- WebSearch verified: JavaScript debounce implementation (setTimeout/clearTimeout pattern)

### Tertiary (LOW confidence)
- None identified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project, well-understood
- Architecture: HIGH - Following existing patterns, user decisions locked
- Pitfalls: MEDIUM - Based on general development experience, some domain-specific

**Research date:** 2026-02-15
**Valid until:** 30 days (stable technologies, low churn)
