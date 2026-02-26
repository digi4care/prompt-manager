# Follow-up: AI Settings Variant Feature Implementatie

## Wat is er al gebouwd:

### 1. DB Schema (voltooid)

- `src/lib/server/db/schema.ts` - variant kolommen toegevoegd:
  - `function_defaults.model_variant`
  - `prompt_function_settings.model_variant_override`
  - `council_agents.model_variant`
  - `improve_presets.model_variant`
- Migratie: `drizzle/migrations/0002_typical_may_parker.sql`

### 2. Centrale Validator (voltooid)

- `src/lib/server/validators/model-variant.validator.ts`
- Functies: `parseModelId`, `isModelAllowedForScope`, `isVariantAllowedForScope`, `findModelInCatalog`, `validateModelVariantScope`
- Hard-fail gedrag (geen auto-fallback)
- Error codes: `MODEL_NOT_FOUND`, `MODEL_NOT_ALLOWED`, `PROVIDER_NOT_CONNECTED`, `VARIANT_REQUIRED`, `VARIANT_NOT_ALLOWED`, `VARIANT_NOT_AVAILABLE`

### 3. Policy Service (voltooid)

- `src/lib/server/services/admin-settings.service.ts`
- `OpenCodePolicy.allowedVariants: Record<string, string[]>` (model -> toegestane variants)
- `getOpenCodePolicy()` laadt `opencode_allowed_model_variants`

### 4. API Updates (voltooid)

- `src/routes/api/admin/function-defaults/[type]/+server.ts` - PUT valideert model+variant
- `src/routes/api/admin/council-agents/+server.ts` - POST valideert model+variant
- `src/routes/api/admin/council-agents/[id]/+server.ts` - PUT/PATCH valideert model+variant
- `src/lib/validators/function-settings.ts` - `modelVariant` in schema

### 5. Cascade Service (voltooid)

- `src/lib/server/services/settings-cascade.service.ts`
- `ResolutionResult.modelVariant` + `RunOverrides.modelVariant`

### 6. Runtime Services (voltooid)

- `src/lib/server/services/execution.service.ts` - `ExecutionResult.variant`
- `src/lib/server/services/judge.service.ts` - `EvaluationResult.modelVariant`
- `src/lib/server/services/improvement.service.ts` - `ImproveResult.metadata.variant`

### 7. Documentatie (voltooid)

- `docs/plans/ai-settings-architecture/` - architectuur analyse, DB audit, refactor blueprint, diagrammen
- `docs/spec/SPEC-14-ai-settings-contract-v1.md` - API contract spec

---

## Wat nog moet gebeuren:

### 1. LSP Error fixen

- `src/lib/server/validators/model-variant.validator.ts` regel 236: `'VARIANT_NOT_ALLOWED_FOR_SCOPE'` moet `'VARIANT_NOT_ALLOWED'` zijn

### 2. Frontend variant pickers

- `src/lib/components/admin/function-settings/FunctionDefaultsList.svelte` - variant dropdown toevoegen
- `src/lib/components/admin/function-settings/CouncilMembersList.svelte` - variant dropdown toevoegen
- `src/lib/components/admin/ai-settings/improve-presets.svelte` - variant dropdown toevoegen

### 3. Settings page server load

- `src/routes/settings/+page.server.ts` - variant data meesturen naar frontend

### 4. Tests

- Unit tests voor validator
- API tests voor variant validatie

---

## Belangrijke ontwerpkeuzes:

- **Geen scope matrix** - simpel model whitelist + variant whitelist per model
- **Hard-fail** - geen auto-fallback bij ongeldige variant
- **Variant verplicht** als model meerdere toegestane variants heeft

---

## Commands:

```bash
# Dev server starten
npm run dev

# Tests runnen
npm run test

# TypeScript check
npm run check
```
