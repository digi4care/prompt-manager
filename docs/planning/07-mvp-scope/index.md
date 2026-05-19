# 07 -- MVP Scope

## Brownfield Baseline

The following capabilities already exist in the codebase:

### Complete Domains
- [x] **Auth:** Better Auth with SvelteKit hooks, login/register/logout, admin protection
- [x] **Prompts:** Full CRUD, Monaco editor, frontmatter, execution, versioning, improvement
- [x] **Snippets:** CRUD, categories, tags, preview
- [x] **Council:** Correct mode, debate mode, review mode
- [x] **Admin:** Dashboard, AI settings, model catalog
- [x] **OpenCode:** Connection, health check, SDK boundary

### Partial Domains
- [ ] **Settings:** Dual system (legacy /settings + experimental /settings-new)
  - Legacy: 756-line monolithic page
  - New: Schema registry with 177 passing tests
  - Known bug: model picker modal not opening

### Technical Debt
- 57 svelte-check warnings (pre-existing)
- 3 failing tests in judge.api.test.ts (ws module issue)
- Better-auth instrumentation shim needed for Vite

## MVP Cut
The MVP is the existing product baseline. The migration epic does not change product behavior.

## Out of Scope
- Cost optimization engine
- Full enterprise RBAC
- Background queue workers
- JavaScript snippet sandboxing
- Mobile app
- Council consensus mode (P3)

## Assumptions
- Existing codebase is the baseline
- Settings registry will replace legacy settings
- All tests pass before merge to master
