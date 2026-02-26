# Analysis Todo

## Tasks

| ID      | Task                                                                | Priority | Depends On                | Owner   | Acceptance                                                |
| ------- | ------------------------------------------------------------------- | -------- | ------------------------- | ------- | --------------------------------------------------------- |
| ANA-001 | Inventory test stack and commands from `package.json` + `AGENTS.md` | P0       | -                         | planner | Commands captured in `RUN_CONTEXT.md`                     |
| ANA-002 | Map settings/ai-settings routes and services                        | P0       | ANA-001                   | planner | Route/service list added to universe                      |
| ANA-003 | Map existing unit/integration/e2e tests                             | P0       | ANA-001                   | planner | Baseline inventory linked in strategy/matrix              |
| ANA-004 | Identify FE/BE cross-boundary interactions and error mapping points | P0       | ANA-002                   | planner | Cross-boundary requirements reflected in matrix/checklist |
| ANA-005 | Decide mode and brownfield policy                                   | P0       | ANA-001                   | planner | Decision recorded with rationale                          |
| ANA-006 | Build dependency test matrix with good/bad behavior rows            | P0       | ANA-002, ANA-003, ANA-004 | planner | Matrix includes concrete IDs + target files               |
| ANA-007 | Build rule-to-test traceability map                                 | P1       | ANA-006                   | planner | Trace IDs map to matrix IDs and files                     |
| ANA-008 | Final omission audit for critical domains                           | P0       | ANA-006, ANA-007          | planner | No unresolved critical gaps                               |
| ANA-009 | Create implementation plan and execution todo for next run          | P1       | ANA-008                   | planner | Plan + TODO files ready for apply phase                   |

## Notes

- Keep tasks atomic.
- One domain owner per task.
- Mark blockers explicitly.
