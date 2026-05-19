---
currentState: draft
scaleProfile: Large
---
# Prompt Management System -- Planning Index

## Status Summary
**Scale profile:** Large
**currentState:** draft
**lifecycleStage:** planning
**Complete:** no
**Next action:** Complete migration validation and archive legacy directories
**Primary blocker:** 12 open Beads issues (migration tasks)

> Brownfield baseline documented; migrating from legacy .planning/ structure.
> Legacy content has been ported to canonical 12-directory structure.
## Source-of-Truth Map
| Truth | Source | Current status | Evidence |
|-------|--------|----------------|----------|
| Product/spec | docs/planning/ (canonical) | Migrated | 12 directories populated |
| Execution | Beads | 72 closed, 12 open | prompt-management-* issues |
| Design | docs/planning/12-diagram-driven-design/ | Ported | SPEC-02, SPEC-03 content added |
| Verification | tests + checks | Active | 1200+ tests, bun run check |

## Planning State Gates
| State | Pass/Blocked | Evidence | Missing |
|-------|--------------|----------|---------|
| draft | Pass | Project exists with specs | - |
| problem_validated | Pass | PROJECT.md defines problem | - |
| requirements_ready | Pass | 43 requirements in 06-requirements/ | - |
| diagram_ready | Pass | Architecture and data model specs ported | Renderable Mermaid diagrams pending |
| backlog_ready | Pass | Beads has 73 issues; epics mapped in 05-user-stories/ | - |
| mvp_scoped | Pass | SPEC-01 ported to 07-mvp-scope/ | - |
| iteration_ready | Pass | Migration tasks 3-5 complete | Complete tasks 6-10 |
| implementation_ready | Blocked | 12 open Beads issues | Close migration tasks |
| verification_ready | Blocked | 12 open Beads issues | Close migration tasks |
| release_ready | Blocked | 12 open Beads issues | Close migration tasks |

## Document Map
| # | Document | Status | Last Updated |
|---|----------|--------|-------------|
| 01 | [Personas](01-persona/index.md) | Ported | 2026-05-19 |
| 02 | [Problem Statement](02-problem/index.md) | Ported | 2026-05-19 |
| 03 | [Product Vision](03-vision/index.md) | Ported | 2026-05-19 |
| 04 | [Architecture](04-architecture/index.md) | Ported | 2026-05-19 |
| 05 | [User Stories & Backlog](05-user-stories/index.md) | Ported | 2026-05-19 |
| 06 | [Requirements](06-requirements/index.md) | Ported | 2026-05-19 |
| 07 | [MVP Scope](07-mvp-scope/index.md) | Ported | 2026-05-19 |
| 08 | [MVP Plan](08-mvp-plan/index.md) | Ported | 2026-05-19 |
| 09 | [Testing Strategy](09-testing/index.md) | Ported | 2026-05-19 |
| 10 | [Release Strategy](10-release/index.md) | Ported | 2026-05-19 |
| 11 | [Design Log](11-design-log/index.md) | Ported | 2026-05-19 |
| 12 | [Diagram-Driven Design](12-diagram-driven-design/index.md) | Ported | 2026-05-19 |

## Brownfield Note
This is a brownfield migration. The codebase already contains:
- Auth (Better Auth), Prompts, Snippets, Council, Admin, OpenCode integration
- Settings dual system (legacy + experimental schema registry)
- 1200+ tests, 3-fase testing strategy
- 73 Beads issues tracking execution history

Legacy planning artifacts have been ported from:
- .planning/ (85 artifacts) → canonical directories
- docs/spec/ (17 artifacts) → canonical directories
- docs/plans/ (2 artifacts) → canonical directories

See reports/INVENTORY.md for full mapping.

## Open Questions
- [x] Should old .planning/ be archived or deleted after migration? → Archive to docs/planning/archive/
- [x] Are there uncommitted planning changes in working tree? → No, all ported
- [x] Should SPEC-IDs be preserved or mapped to new FR/NFR IDs? → Preserved in legacy sections
