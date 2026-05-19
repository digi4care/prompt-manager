# Prompt Management System -- Planning Index

## Status Summary
- **Scale profile:** Large (brownfield, multi-domain, multi-stakeholder)
- **Current state:** Brownfield baseline documented; migrating from legacy .planning/ structure
- **Complete:** no
- **Next action:** Port legacy content into canonical 12-directory structure
- **Primary blocker:** Legacy .planning/ content not yet migrated

## Source-of-Truth Map
| Truth | Source | Current status | Evidence |
|-------|--------|----------------|----------|
| Product/spec | docs/planning/ (canonical) | In migration | INVENTORY.md exists |
| Execution | Beads | 72 closed, 1 open | prompt-management-* issues |
| Design | docs/planning/12-diagram-driven-design/ | Not yet created | Legacy specs contain architecture |
| Verification | tests + checks | Active | 1200+ tests, bun run check |

## Planning State Gates
| State | Pass/Blocked | Evidence | Missing |
|-------|--------------|----------|---------|
| draft | Pass | Project exists with specs | - |
| problem_validated | Pass | PROJECT.md defines problem | - |
| requirements_ready | Pass | 43 requirements mapped | Need to port into 06-requirements/ |
| diagram_ready | Blocked | Legacy diagrams in .planning/ | Need to port into 12-diagram-driven-design/ |
| backlog_ready | Pass | Beads has 73 issues | Need to map to 05-user-stories/ |
| mvp_scoped | Pass | SPEC-01 defines scope | Need to port into 07-mvp-scope/ |
| iteration_ready | Blocked | Migration epic in progress | Complete migration first |
| implementation_ready | Blocked | Migration in progress | - |
| verification_ready | Blocked | Migration in progress | - |
| release_ready | Blocked | Migration in progress | - |

## Document Map
| # | Document | Status | Last Updated |
|---|----------|--------|-------------|
| 01 | [Personas](01-persona/index.md) | Scaffold | 2026-05-19 |
| 02 | [Problem Statement](02-problem/index.md) | Scaffold | 2026-05-19 |
| 03 | [Product Vision](03-vision/index.md) | Scaffold | 2026-05-19 |
| 04 | [Architecture](04-architecture/index.md) | Scaffold | 2026-05-19 |
| 05 | [User Stories & Backlog](05-user-stories/index.md) | Scaffold | 2026-05-19 |
| 06 | [Requirements](06-requirements/index.md) | Scaffold | 2026-05-19 |
| 07 | [MVP Scope](07-mvp-scope/index.md) | Scaffold | 2026-05-19 |
| 08 | [MVP Plan](08-mvp-plan/index.md) | Scaffold | 2026-05-19 |
| 09 | [Testing Strategy](09-testing/index.md) | Scaffold | 2026-05-19 |
| 10 | [Release Strategy](10-release/index.md) | Scaffold | 2026-05-19 |
| 11 | [Design Log](11-design-log/index.md) | Scaffold | 2026-05-19 |
| 12 | [Diagram-Driven Design](12-diagram-driven-design/index.md) | Scaffold | 2026-05-19 |

## Brownfield Note
This is a brownfield migration. The codebase already contains:
- Auth (Better Auth), Prompts, Snippets, Council, Admin, OpenCode integration
- Settings dual system (legacy + experimental schema registry)
- 1200+ tests, 3-fase testing strategy
- 73 Beads issues tracking execution history

Legacy planning artifacts are being ported from:
- .planning/ (85 artifacts)
- docs/spec/ (17 artifacts)
- docs/plans/ (2 artifacts)

See reports/INVENTORY.md for full mapping.

## Open Questions
- [ ] Should old .planning/ be archived or deleted after migration?
- [ ] Are there uncommitted planning changes in working tree?
- [ ] Should SPEC-IDs be preserved or mapped to new FR/NFR IDs?
