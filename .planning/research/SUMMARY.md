# Project Research Summary

**Project:** Prompt Management with AI Execution (OpenCode Integration)
**Domain:** AI Prompt Management + Multi-Agent Orchestration
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

This project sits at the intersection of three evolving categories: **prompt management tools** (versioning, testing), **AI playgrounds** (execution, comparison), and **multi-agent orchestration** (council, debate, consensus). The key differentiator is integrating all three with a **settings-first approach** that uses OpenCode SDK for actual prompt execution — not just storage.

The recommended approach builds on the existing SvelteKit 2.x + Svelte 5 foundation with minimal new dependencies: only `sveltekit-sse` for streaming and an update to OpenCode SDK 1.2.1. The architecture follows a layered pattern with services handling business logic, routes delegating to services, and all AI communication going through an SDK adapter. Function-level defaults (executor/judge/improve/council) reduce per-run friction and are unique in this market.

Key risks center on **model resolution ambiguity** (scattered settings without clear precedence) and **snippet variable injection attacks**. Both require upfront design of resolution cascades and escaping strategies. Council modes must enforce hard round limits to prevent state explosion. Mitigation is built into the phase structure: logging and settings resolution come before complex features.

## Key Findings

### Recommended Stack

The existing stack is solid and well-suited for this milestone. Only two additions needed: `sveltekit-sse` for streaming AI responses and an update to OpenCode SDK from 1.1.53 to 1.2.1 for improved session management.

**Core technologies:**

- **SvelteKit 2.51 + Svelte 5.51**: Full-stack framework with runes reactivity — already in use, streaming built-in
- **OpenCode SDK 1.2.1**: AI execution with session-based prompts — requires update for new features
- **sveltekit-sse 1.0.0**: SSE streaming — NEW, clean produce/source API for real-time updates
- **Drizzle ORM 0.45.1**: Database layer — already in use, type-safe, minimal overhead
- **Zod 4.3.6**: Schema validation — already in use, for settings and frontmatter validation

**Avoid:** Mustache/Handlebars (overkill for simple `{{VAR}}`), Vercel AI SDK (conflicts with OpenCode), WebSockets (SSE simpler for unidirectional streaming)

### Expected Features

Research identified 8 table stakes, 4 core differentiators, and 4 enhanced differentiators. The competitive gap is that **no competitor combines execution, council modes, AND function defaults**.

**Must have (table stakes):**

- Prompt CRUD with versions — basic content management, already implemented
- Model selection per execution — every playground has this
- Temperature/max tokens controls — standard LLM parameters
- Execution logging — cost tracking, debugging, reproducibility
- Error messages with context — users need to know WHY execution failed

**Should have (core differentiators):**

- Settings-first function defaults — configure once, use everywhere; unique to this product
- Snippet variables with live preview — `{{VAR}}` replacement with real-time preview
- Producer → Reviewer → Fix workflow — sequential council mode mimicking code review
- OpenCode SDK execution — actual execution via SDK, not just storage

**Defer (v2+):**

- A/B testing prompt versions — requires significant traffic
- Agent simulation — complex to implement
- Team collaboration — out of scope for PoC

### Architecture Approach

The architecture follows a **layered pattern** with clear separation: client pages → API routes → service layer → OpenCode adapter → persistence. This isolates business logic from routes and external SDK from internal services.

**Major components:**

1. **Settings Resolver** — cascading model resolution (Request > Preset > Function Default > Global Default) with policy enforcement
2. **Execution Logger** — async fire-and-forget logging with batch flush; captures model_source, tokens, duration, status
3. **Snippet Service** — variable replacement with injection validation, single-pass rendering
4. **Council Orchestrator** — step-based workflow with checkpoints, state persistence, round limits

**Key patterns:**

- Settings Resolution Cascade — deterministic precedence, logs source
- Async Logging — doesn't block execution path
- Orchestrator-Worker — lead agent coordinates, subagents execute

### Critical Pitfalls

Top 5 pitfalls from research with prevention strategies:

1. **Model Resolution Ambiguity** — Implement deterministic resolution chain (request > prompt > function > global), log resolved model AND source for every execution
2. **Snippet Variable Injection** — Escape `{{` and `}}` in variable values, single-pass replacement, validate against declared variables
3. **Execution Log Data Loss** — Design schema upfront with model_id, model_source, tokens, duration, status, error_code
4. **Council Mode State Explosion** — Hard round limits (max 3-5), token budget tracking, state isolation per round
5. **Synchronous Logging** — Use async fire-and-forget with batch flush, never block execution path

## Implications for Roadmap

Based on dependency analysis and pitfall prevention, recommended 4-phase structure:

### Phase 1: Settings Refactor + Execution Endpoint

**Rationale:** Foundation required by all subsequent work. Function defaults are useless without execution to use them.
**Delivers:** Function-level defaults (executor/judge/improve/council), execution via OpenCode SDK, model resolution with logging
**Addresses:** Model selection per execution, temperature/max tokens controls, execution logging (FEATURES.md)
**Avoids:** Model Resolution Ambiguity, Execution Log Data Loss (PITFALLS.md)
**Uses:** OpenCode SDK 1.2.1, Zod 4 for settings validation, sveltekit-sse for streaming

### Phase 2: Snippet Variables + Preview

**Rationale:** Independent feature that enhances execution. Preview is mandatory — users won't trust replacement without seeing result.
**Delivers:** `{{VAR}}` syntax with frontmatter declaration, live preview panel, variable validation
**Addresses:** Snippet variables with live preview (FEATURES.md core differentiator)
**Avoids:** Snippet Variable Injection Attacks (PITFALLS.md)
**Uses:** Custom regex implementation (no Mustache/Handlebars), Svelte 5 $state for reactive preview

### Phase 3: Council "Correct" Mode

**Rationale:** Validates council architecture before building complex multi-round patterns. Sequential Producer→Reviewer→Fix is most useful workflow.
**Delivers:** Sequential execution pipeline, producer (generate) → reviewer (judge) → fixer (improve), max 3 rounds
**Addresses:** Producer → Reviewer → Fix workflow (FEATURES.md core differentiator)
**Avoids:** Council Mode State Explosion (PITFALLS.md)
**Uses:** Council Orchestrator pattern, Execution Logger from Phase 1

### Phase 4: Council "Debate" and "Consensus" Modes

**Rationale:** Enhanced differentiators that add value but not essential for launch. Requires validated architecture from Phase 3.
**Delivers:** Parallel agents with voting/aggregation, configurable agent roles, multi-round debate
**Addresses:** Debate council mode, Consensus council mode (FEATURES.md enhanced differentiators)
**Avoids:** Council Mode State Explosion (enforce limits from Phase 3)

### Phase Ordering Rationale

- **Phase 1 first:** Settings resolver and execution logging have NO dependencies and BLOCK everything else
- **Phase 2 can parallel with Phase 1:** Snippet service is independent, but preview enhances execution
- **Phase 3 before Phase 4:** Sequential council validates architecture before complex concurrent patterns
- **Grouping rationale:** Phases 1-2 are foundation (single execution), Phases 3-4 are advanced (multi-agent)

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Council Correct):** Multi-agent orchestration has nuanced state management — may need `/gsd-research-phase` for step checkpoint patterns
- **Phase 4 (Debate/Consensus):** Voting/aggregation algorithms vary by use case — may need domain-specific research

Phases with standard patterns (skip research-phase):

- **Phase 1 (Settings + Execution):** Well-documented patterns in existing codebase, OpenCode SDK docs comprehensive
- **Phase 2 (Snippet Variables):** Simple template replacement, no external API complexity

## Confidence Assessment

| Area         | Confidence | Notes                                                                   |
| ------------ | ---------- | ----------------------------------------------------------------------- |
| Stack        | HIGH       | Existing stack verified, OpenCode SDK well-documented via Context7      |
| Features     | HIGH       | Competitor matrix clear, existing codebase shows partial implementation |
| Architecture | HIGH       | Patterns from Vercel AI SDK, Anthropic multi-agent, existing services   |
| Pitfalls     | HIGH       | OWASP LLM Top 10, multi-agent research, streaming best practices        |

**Overall confidence:** HIGH

### Gaps to Address

- **OpenCode SDK 1.2.1 migration:** Minor version bump appears safe (no breaking changes detected), but verify during Phase 1 implementation
- **Council aggregation algorithms:** Phase 4 may need specific research on voting/consensus strategies for different use cases
- **Token-aware rate limiting:** Mentioned in pitfalls but not deeply researched — may need attention in Phase 1

## Sources

### Primary (HIGH confidence)

- **Context7 /websites/opencode_ai** — OpenCode SDK session.prompt API, agent configuration, temperature/maxTokens
- **Context7 /razshare/sveltekit-sse** — SSE streaming patterns, produce/source API
- **Context7 /websites/zod_dev_v4** — Zod 4 schema validation, safeParse
- **Azure Architecture Center** — AI agent orchestration patterns (sequential, concurrent, group chat)
- **Anthropic Multi-Agent Architecture** — Research system design, orchestrator patterns
- **Existing codebase** — opencode.service.ts, admin-settings.service.ts, improvement.service.ts, judge.service.ts

### Secondary (MEDIUM confidence)

- **LangWatch Blog (2025-12-23)** — Prompt management tool comparison, evaluation patterns
- **Braintrust Docs** — Playground patterns, task/scorer/dataset structure
- **OWASP LLM Top 10 2025** — Prompt injection, sensitive information disclosure
- **LLM Observability Research 2024-2025** — Logging best practices, token tracking

### Tertiary (LOW confidence)

- **Medium multi-agent articles** — Council patterns, needs validation against official docs
- **General web search results** — Used for gap-filling, cross-referenced with primary sources

---

_Research completed: 2026-02-14_
_Ready for roadmap: yes_
