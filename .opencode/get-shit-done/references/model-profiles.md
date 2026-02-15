# Model Profiles

Model profiles control which AI model each GSD agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent                    | `quality`             | `balanced`                       | `budget`                         |
| ------------------------ | --------------------- | -------------------------------- | -------------------------------- |
| gsd-planner              | openai/gpt-5.3-codex  | openai/gpt-5.3-codex             | zai-coding-plan/glm-5            |
| gsd-roadmapper           | openai/gpt-5.3-codex  | zai-coding-plan/glm-5            | zai-coding-plan/glm-5            |
| gsd-executor             | openai/gpt-5.3-codex  | zai-coding-plan/glm-5            | zai-coding-plan/glm-5            |
| gsd-phase-researcher     | openai/gpt-5.3-codex  | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-project-researcher   | openai/gpt-5.3-codex  | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-research-synthesizer | zai-coding-plan/glm-5 | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-debugger             | openai/gpt-5.3-codex  | zai-coding-plan/glm-5            | zai-coding-plan/glm-5            |
| gsd-codebase-mapper      | zai-coding-plan/glm-5 | minimax-coding-plan/MINIMAX-M2.5 | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-verifier             | zai-coding-plan/glm-5 | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-plan-checker         | zai-coding-plan/glm-5 | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |
| gsd-integration-checker  | zai-coding-plan/glm-5 | zai-coding-plan/glm-5            | minimax-coding-plan/MINIMAX-M2.5 |

## Model IDs

| Profile      | Model ID                           | Use Case                                            |
| ------------ | ---------------------------------- | --------------------------------------------------- |
| **quality**  | `openai/gpt-5.3-codex`             | Maximum reasoning power, critical architecture work |
| **balanced** | `zai-coding-plan/glm-5`            | Smart allocation, good balance of quality and cost  |
| **budget**   | `minimax-coding-plan/MINIMAX-M2.5` | Minimal cost, high-volume work                      |

## Profile Philosophy

**quality** - Maximum reasoning power

- GPT-5.3 Codex for all decision-making agents
- GLM-5 for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation

- GPT-5.3 Codex only for planning (where architecture decisions happen)
- GLM-5 for execution and research (follows explicit instructions)
- GLM-5 for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal GPT usage

- GLM-5 for anything that writes code
- MiniMax M2.5 for research and verification
- Use when: conserving quota, high-volume work, less critical phases

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. Look up agent in table above
4. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/gsd-set-profile <profile>`

Per-project default: Set in `.planning/config.json`:

```json
{
	"model_profile": "balanced"
}
```

## Design Rationale

**Why GPT-5.3 Codex for gsd-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why GLM-5 for gsd-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why GLM-5 (not MiniMax) for verifiers in balanced?**
Verification requires goal-backward reasoning - checking if code _delivers_ what the phase promised, not just pattern matching. GLM-5 handles this well; MiniMax may miss subtle gaps.

**Why MiniMax for gsd-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.
