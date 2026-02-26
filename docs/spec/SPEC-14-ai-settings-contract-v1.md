# SPEC-14 AI Settings Contract v1

## AIC-001 Purpose

Define concrete variant-aware contracts for AI settings so UI, backend, and runtime remain deterministic and policy-compliant.

## AIC-002 Scope

In scope:

- AI settings contracts for connection, providers/catalog, policy-linked defaults, council
- `model + variant` persistence and runtime propagation
- hard-fail behavior for invalid/disallowed/unavailable variants
  Out of scope:
- non-settings prompt CRUD
- provider-specific billing agreements

## AIC-003 Canonical References

- Policy precedence and fallback: `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`)
- Settings schema baseline: `SPEC-10-settings-schema.md` (`SET-003`, `SET-004`, `SET-005`)
- Error payload/retry behavior: `SPEC-11-error-catalog.md` (`ERR-002`, `ERR-003`, `ERR-004`)
- Contract testing baseline: `SPEC-08-test-strategy.md` (`TST-008`)

## AIC-004 Shared Types

- `FunctionType`: `executor | judge | improve | council`
- `PolicyScope`: `executor | judge | improve | council`
- `ModelId`: canonical `provider/model`
- `ModelVariant`: variant id (example: `low`, `medium`, `high`, `xhigh`)

```json
{
	"modelId": "openai/codex",
	"modelVariant": "high"
}
```

## AIC-005 Endpoint Matrix

| Endpoint                                 | Auth                             | Contract Role                                           |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `GET /api/opencode/providers`            | authenticated admin page context | Catalog v2 (capabilities + variants + policy overlay)   |
| `PUT /api/admin/function-defaults/:type` | admin                            | Save role defaults including `modelVariant`             |
| `GET /api/admin/function-defaults/:type` | admin                            | Read role defaults including `modelVariant`             |
| `POST /api/admin/council-agents`         | admin                            | Create council member with `modelVariant`               |
| `PATCH /api/admin/council-agents/:id`    | admin                            | Update council member model/variant                     |
| `GET /api/admin/council-agents`          | admin                            | Read council members including variant                  |
| `POST /api/prompts/:id/execute`          | authenticated user               | Runtime result includes resolved model + variant source |
| `POST /api/judge/evaluate`               | authenticated user               | Runtime result includes resolved model + variant source |
| `POST /api/prompts/:id/improve`          | authenticated user               | Runtime result includes resolved model + variant source |

## AIC-006 Request Contracts

### AIC-006A PUT /api/admin/function-defaults/:type

```json
{
	"modelId": "openai/codex",
	"modelVariant": "high",
	"temperature": 0.7,
	"maxTokens": 4096,
	"promptId": null
}
```

Rules:

- `modelId` must be canonical `provider/model`.
- `modelVariant` required when selected model has multiple policy-allowed variants for the target scope.
- `modelVariant` optional only when exactly one allowed variant exists; server normalizes to that value.

### AIC-006B POST/PATCH /api/admin/council-agents

Create/update body includes:

- `modelId` (required on create)
- `modelVariant` (required under same rule as defaults)
- optional `temperature`, `maxTokens`, `promptLinkId`, `agentOrder`
  Validation scope is always `council`.

### AIC-006C GET /api/opencode/providers (Catalog v2)

Query:

- `refresh?` boolean
  No body.

## AIC-007 Success Response Contracts

### AIC-007A Defaults/Council responses

```json
{
	"modelId": "openai/codex",
	"modelVariant": "high",
	"temperature": 0.7,
	"maxTokens": 4096
}
```

### AIC-007B Catalog v2 payload

Top-level:

- `providers[]`
- `cached`, `cachedAt`, `ttlSeconds`
  Per provider:
- `id`, `name`, `connected`, `authConfigured`, `source`
  Per model:
- `id`, `name`, `status`, `contextWindow`, `maxOutputTokens`
- `capabilities` (`vision`, `tools`, `jsonMode`, `streaming`, `reasoning`)
- `variants[]` with `id`, `label`, `isDefault`
- `policyOverlay`: `allowed`, `scopeAllowed`, `allowedVariants[]`, `blockedReason`

### AIC-007C Runtime result additions

Runtime responses include:

- `resolvedModel` (`provider/model`)
- `resolvedVariant`
- `modelSource` (`run_override | prompt_override | function_default | fallback`)
- `variantSource` (`run_override | prompt_override | function_default | policy_default | provider_default`)

## AIC-008 Validation Rules

Mandatory checks on save and runtime resolution:

- model exists in current catalog
- provider is connected when required by mode/policy
- model allowed for scope by policy matrix
- variant allowed for scope by policy variant map
- selected variant exists under selected model in catalog
  Unknown key/type/range errors still follow `SET-004`.

## AIC-009 Default/Override/Fallback/Error

Model precedence remains canonical per `POL-002` and `POL-003`.
Variant precedence:

1. run override variant
2. prompt override variant
3. function default variant
4. policy/provider default variant
   Hard-fail rule:

- if resolved variant is disallowed or unavailable, return terminal error
- no automatic fallback to another variant

## AIC-010 Error Mapping Additions

| Code                        | HTTP | Retryable | Trigger                                               |
| --------------------------- | ---: | --------- | ----------------------------------------------------- |
| `MODEL_VARIANT_REQUIRED`    |  400 | false     | Variant omitted while multiple allowed variants exist |
| `MODEL_VARIANT_NOT_ALLOWED` |  422 | false     | Variant blocked by policy/scope                       |
| `MODEL_VARIANT_UNAVAILABLE` |  422 | false     | Variant not provided by active provider/model catalog |

Payload shape remains `ERR-003`.

## AIC-011 Backward Compatibility + Versioning

- Contract version: v1 (additive extension over existing settings endpoints)
- Clients omitting `modelVariant` remain valid only for models with exactly one allowed variant
- For multi-variant models, omission returns `MODEL_VARIANT_REQUIRED`
- Future variant metadata expansion must be additive and backward compatible

## AIC-012 Contract Test Mapping

Required tests (mapped to `TST-008`):

- defaults/council save rejects missing variant for multi-variant model
- defaults/council save rejects disallowed variant per scope
- runtime fails with typed variant error when stored variant becomes invalid
- catalog payload includes `variants[]` and `policyOverlay` keys
- runtime payload includes `resolvedVariant` and `variantSource`

## AIC-013 Implementation Notes

- Before implementation, extend `SPEC-11` with the three variant error codes in `AIC-010`.
- Keep policy authority in `SPEC-06`; avoid duplicating rule logic outside canonical IDs.
