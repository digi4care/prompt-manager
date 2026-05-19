# 03 -- Product Vision

## Vision Statement
A spec-driven prompt management application where every execution is deterministic, auditable, and improvable through AI-powered workflows.

## Core Value Proposition
**Settings-first execution** -- Every prompt execution resolves model/temperature/parameters through a deterministic precedence chain (run > prompt > default).

## Goals
- [x] Prompt CRUD with metadata and versioning
- [x] Diff visualization for version comparison
- [x] AI-powered improvement loop with variant generation
- [x] Rubric-based judging with score and feedback
- [x] Admin settings with model catalog and policies
- [x] Better Auth authentication with admin protection
- [x] Rate limiting and security headers
- [ ] Settings refactor for function defaults (executor, judge, improve, council)
- [ ] Execution logging with tokens, duration, model source
- [ ] Snippet variables ({{VAR}}) with rendering
- [ ] Streaming execution via SSE
- [ ] Council modes: correct, debate, consensus

## Non-Goals
- Cost optimization engine
- Full enterprise RBAC
- Background queue workers
- JavaScript snippet sandboxing
- Mobile app

## Success Metrics
- All prompt executions resolve model via cascade
- 100% of executions create audit log
- Settings changes take effect immediately
- Zero auth bypass incidents
