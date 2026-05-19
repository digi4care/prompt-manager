# 05 -- User Stories & Product Backlog

## Backlog Operating Rules
- Product backlog is ordered from top priority to lower priority.
- Every backlog item has a work type, priority, estimate, status, and evidence.
- No current-iteration build/fix item may span more than one primary seam.

## Status Lifecycle
proposed -> refined -> ready -> in_progress -> verified -> done

## Work Types
build | fix | research | enable | verify | release

## Completed Epics (Beads traceable)

### Epic 1: Authentication & Better Auth
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-1.1 | Install Better Auth library | done | prompt-management-vtl |
| US-1.2 | Configure Better Auth environment | done | prompt-management-1yz |
| US-1.3 | Create Better Auth instance | done | prompt-management-3qo |
| US-1.4 | Extend users schema with auth fields | done | prompt-management-up0 |
| US-1.5 | Implement SvelteKit hooks | done | prompt-management-526 |
| US-1.6 | Set up session management | done | prompt-management-01t |
| US-1.7 | Add admin role check | done | prompt-management-7sv |
| US-1.8 | Create /login page | done | prompt-management-6mi |
| US-1.9 | Create /register page | done | prompt-management-afy |
| US-1.10 | Add login/logout UI nav | done | prompt-management-2nc |
| US-1.11 | Write auth flow unit tests | done | prompt-management-yt5 |
| US-1.12 | Write E2E tests for /admin protection | done | prompt-management-rbv |
| US-1.13 | Security review and audit | done | prompt-management-8ji |

### Epic 2: Login Refactor (Server Actions)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-2.1 | Implement server action with Zod validation | done | prompt-management-tu7 |
| US-2.2 | Refactor login form to use SvelteKit enhance | done | prompt-management-rot |
| US-2.3 | Test login flow success/error paths | done | prompt-management-ut3 |
| US-2.4 | Remove obsolete API endpoint | done | prompt-management-8zd |
| US-2.5 | Refactor admin login to Server Actions | done | prompt-management-ssv |
| US-2.6 | Update SECURITY-REVIEW.md | done | prompt-management-ibn |

### Epic 3: Settings Schema Registry
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-3.1 | API route persists settings to DB | done | prompt-management-8d3 |
| US-3.2 | Hidden settings blocking save fix | done | prompt-management-e50 |
| US-3.3 | Dotted same-block dependencies fix | done | prompt-management-dyb |
| US-3.4 | KeyValueEditor sync bug fix | done | prompt-management-r48 |
| US-3.5 | maxTokens lost in legacy migration fix | done | prompt-management-d30 |

## Active Work

### Epic 4: Planning Migration
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-4.1 | Inventory all planning artifacts | done | prompt-management-65j |
| US-4.2 | Create canonical directory structure | in_progress | prompt-management-2a1 |
| US-4.3 | Port legacy .planning/ content | pending | prompt-management-k8q |
| US-4.4 | Port docs/spec/ content | pending | prompt-management-116 |
| US-4.5 | Port docs/plans/ content | pending | prompt-management-416 |
| US-4.6 | Create index.md with state machine | pending | prompt-management-4l5 |
| US-4.7 | Map Beads issues to planning docs | pending | prompt-management-m8m |
| US-4.8 | Document brownfield baseline | pending | prompt-management-9dw |
| US-4.9 | Validate canonical structure | pending | prompt-management-j9a |
| US-4.10 | Archive legacy directories | pending | prompt-management-1il |

## Refinement Queue
| Item | Work Type | Why not ready | Next action |
|------|-----------|---------------|-------------|
| Settings route cleanup (merge /settings-new into /settings) | build | Waiting on registry validation | Complete migration first |
| Model picker modal bug fix | fix | Needs debugging | Add to next iteration |
| Council debate mode UI | build | Phase 09-01 backend done | Implement frontend |
| Council consensus mode | build | P3 priority | Defer |
