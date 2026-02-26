# Test Strategy

## Scope

- In scope: settings and AI settings interactions across frontend, API, services, validators, and persistence.
- In scope: connection, providers, models, policy, function defaults, council agents, model catalog, improve presets.
- Out of scope: unrelated product domains and feature implementation beyond test-workflow governance.

## Test Layers

- Unit: pure validation/derivation logic (`validate-settings`, model-variant rules, policy parsing).
- Integration: route/service persistence and contract behavior (`/api/admin/*`, `/api/opencode/*`).
- Component: Svelte interaction states (loading/success/error, picker behaviors).
- E2E: user-visible flows across FE/BE boundaries in settings/admin pages.

## Dependency Order

1. Connection health and auth readiness.
2. Provider availability and provider metadata.
3. Model listing/filtering/availability.
4. Policy constraints and variant rules.
5. Derived flows: function defaults and council agents.
6. Catalog consistency and caching behavior.
7. Improve presets behavior.

## Coverage Policy

- Every feature requires good + bad behavior tests.
- Bug fixes require regression test first.
- FE/BE interaction changes require cross-boundary contract tests.
- Cross-boundary changes must include contract IDs and E2E IDs in matrix rows.

## Definition of Done

- Matrix and traceability are synchronized with concrete file targets.
- Required pre-apply gates pass (including cross-boundary gates where applicable).
- `npm run check` and `npm run test` pass; relevant e2e scope is selected for changed flows.
