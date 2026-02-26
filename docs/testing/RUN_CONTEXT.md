# Run Context

Generated at: 2026-02-26 00:00
Mode: brownfield (auto-detected)
Scope: repository-wide testing workflow for settings and AI settings surfaces
Feature: establish deterministic test operating system for future work
Output dir: `docs/testing`
Strict: true

## Repository Signals

- Stack: SvelteKit + TypeScript + Vite + Drizzle + OpenCode SDK integration
- Test frameworks: Vitest (unit/integration), Playwright (e2e)
- CI/test commands: `npm run check`, `npm run test`, `npm run test:e2e`, `npm run test:e2e:all`, `npm run test:coverage`
- Existing testing docs: `docs/plans/ai-settings-architecture/test/*`, `AGENTS.md`, `docs/spec/SPEC-08-test-strategy.md`

## Execution Intent

- Run mode: plan artifacts generated and populated (P0..P10 ready)
- Requested deliverables: complete `docs/testing/*` with cross-boundary FE/BE enforcement
- Critical constraints: no omitted domains, good+bad coverage required, bugfix regression-first
