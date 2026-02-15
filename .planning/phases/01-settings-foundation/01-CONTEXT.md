# Phase 1: Settings Foundation - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning
**Updated:** After OpenCode SDK integration analysis

<domain>
## Phase Boundary

Per-function model defaults met deterministic resolution cascade (3 levels: Run > Prompt > Global). Users can configure defaults for executor, judge, improve, and council functions. Includes prompt linking per function, Council repeater for multiple agents, en OpenCode SDK integratie voor modellen en executie.

</domain>

<decisions>
## Implementation Decisions

### OpenCode Connection (PREREQUISITE)

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

### Settings UI Layout

- **Table layout** — compact, alle 4 functies in één oogopslag vergelijkbaar
- **Kolommen:** Function | Model | Temperature | Max Tokens | Prompt | Reset
- **Provider logos** via `https://models.dev/logos/{provider}.svg`
- **Modellen dropdown** dynamisch via OpenCode SDK van geconfigureerde providers
- **Providers:** Gebruik bestaande OpenCode config (handmatig beheerd door gebruiker)
- **Ongeldig model:** Validation error — gebruiker moet nieuw model kiezen

### Council Configuration

- **Repeater pattern** — minimaal 2 agents, automatisch nieuwe lege regel
- **Temperature per agent** — elk model eigen temp instelling
- **Duplicates toegestaan** — zelfde model meerdere keren mogelijk (voor consistentie tests)
- **Nieuwe regel verschijnt** na invullen van laatste lege regel

### Prompt Per Functie

- **Prompt kolom** met [📝] icoon per functie
- **Klik op icoon** opent Prompt Selector Modal
- **Modal toont:** zoekveld, lijst bestaande prompts, "Create New Prompt" knop
- **Selecteren** koppelt prompt aan functie

### Validation UX

- **Inline + Summary** — rode border op veld + foutenlijst boven tabel
- **Hybride validatie:**
  - Dropdowns: real-time (geen debounce nodig)
  - Numbers: real-time met 300ms debounce
  - Text: on blur
- **Save blocked** — kan niet opslaan zolang er fouten zijn
- **Fix Errors / Reset to Defaults / Cancel** opties bij blocked save

### Cascade Visibility

- **3-level cascade:** Run Override > Prompt Override > Global Default
- **Badge per level:** `[run]` / `[prompt]` / `[default]`
- **Simplified:** Geen Presets, geen Policy (solo developer)

### Per-Prompt Overrides

- **Prompt Editor** bevat optionele "Function Settings" sectie
- **Dropdown opties:** "Use Global" of specifiek model kiezen
- **Opgeslagen in database** — persistent per prompt
- **Reset [↺]** in Prompt Editor = terug naar "Use Global"

### Run Overrides

- **Test Runner** heeft dropdowns per functie tab (Execute, Judge, Improve, Council)
- **Dropdown toont:** "Use Prompt Setting", "Use Global Default", of specifiek model
- **Niet persistent** — alleen voor huidige test sessie

### Reset Behavior

- **Per-functie reset [↺]:** Reset alles (model, temp, tokens, prompt) + bevestiging modal
- **Reset All:** Extra waarschuwing met lijst van 4 functies + "This action cannot be undone"
- **Geen undo** — bevestiging is genoeg

### Default Waarden (Hardcoded)

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

</decisions>

<specifics>
## Specific Ideas

- "Table layout is best practice voor settings vergelijking"
- "Provider logos van models.dev API zorgen voor visuele herkenbaarheid"
- "Hybride validatie met debounce is beste UX voor table forms"
- "3-level cascade (Run > Prompt > Global) geeft maximale flexibiliteit zonder complexiteit"

</specifics>

<database>
## Database Schema

### opencode_connection (SDK Config)

```sql
CREATE TABLE opencode_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- singleton
  mode TEXT DEFAULT 'auto',              -- 'auto' or 'custom'
  base_url TEXT,                         -- null for auto mode
  last_connected TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row
INSERT INTO opencode_connection (id, mode) VALUES (1, 'auto');
```

### function_defaults (Global Settings)

```sql
CREATE TABLE function_defaults (
  id INTEGER PRIMARY KEY,
  function_type TEXT NOT NULL UNIQUE, -- 'executor', 'judge', 'improve', 'council'
  model_id TEXT NOT NULL,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  prompt_id INTEGER REFERENCES prompts(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### prompt_function_settings (Per-Prompt Overrides)

```sql
CREATE TABLE prompt_function_settings (
  id INTEGER PRIMARY KEY,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id),
  function_type TEXT NOT NULL, -- 'executor', 'judge', 'improve', 'council'
  model_override TEXT, -- null = use global
  temperature REAL, -- null = use global
  max_tokens INTEGER, -- null = use global
  prompt_link_id INTEGER REFERENCES prompts(id),
  UNIQUE(prompt_id, function_type)
);
```

### council_agents (Council Repeater)

```sql
CREATE TABLE council_agents (
  id INTEGER PRIMARY KEY,
  parent_type TEXT NOT NULL, -- 'global' or 'prompt'
  parent_id INTEGER NOT NULL, -- function_defaults.id or prompt_function_settings.id
  agent_order INTEGER NOT NULL, -- 1, 2, 3...
  model_id TEXT NOT NULL,
  temperature REAL DEFAULT 0.5,
  max_tokens INTEGER DEFAULT 8192,
  prompt_link_id INTEGER REFERENCES prompts(id)
);
```

</database>

<ui_components>

## UI Components Needed

### 1. Settings Table Component

- Table with 4-6 rows (functions) + Council agents
- Editable dropdowns for model selection
- Number inputs for temperature (0-2) and tokens
- Prompt selector icon [📝]
- Per-row reset button [↺]
- Global "Reset All" button

### 2. Prompt Selector Modal

- Search input
- List of existing prompts with radio selection
- "Create New Prompt" button
- Select/Cancel actions

### 3. Validation Summary Component

- Error count badge
- List of errors with click-to-jump
- Dismiss option

### 4. Reset Confirmation Modal

- Simple for per-function reset
- Enhanced warning for Reset All (lists all 4 functions)

### 5. Model Dropdown Component

- Groups: "Use [level] Setting" | Available Models
- Provider logos from models.dev
- Badge showing current source level

</ui_components>

<deferred>
## Deferred Ideas

- **Preset systeem** — benoemde configuraties (creative, strict, etc.) — niet nodig voor solo dev
- **Policy niveau** — team/organisatie regels — niet nodig voor solo dev
- **Provider management UI** — aparte pagina om providers te kiezen/connecten — handmatig via OpenCode config
- **Audit log** — wie heeft wat gewijzigd — nice to have voor later

</deferred>

---

_Phase: 01-settings-foundation_
_Context gathered: 2026-02-14_
