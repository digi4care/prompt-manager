# Feature Research

**Domain:** Prompt Management with AI Execution (OpenCode Integration)
**Researched:** 2026-02-14
**Confidence:** HIGH (verified with Context7, official docs, competitor analysis, existing codebase)

---

## Executive Summary

This research covers the feature landscape for a prompt management application with OpenCode SDK integration. The domain sits at the intersection of three evolving categories:

1. **Prompt Management Tools** (LangWatch, PromptLayer, LangSmith) — Version, test, evaluate, deploy prompts
2. **AI Playgrounds** (OpenAI Playground, Braintrust, Agenta) — Execute, compare, iterate on prompts
3. **Multi-Agent Orchestration** (Azure patterns, Semantic Kernel, LangChain) — Council, debate, consensus workflows

The target product differentiates by **integrating these three domains** with a settings-first approach that leverages OpenCode SDK for actual prompt execution — not just storage and versioning.

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature                                    | Why Expected                 | Complexity | Notes                                                                            |
| ------------------------------------------ | ---------------------------- | ---------- | -------------------------------------------------------------------------------- |
| **Prompt CRUD with versions**              | Basic content management     | LOW        | Already implemented. Users expect version history, rollback.                     |
| **Model selection per execution**          | Every playground has this    | MEDIUM     | Users expect to choose model for each run. Must show resolved model prominently. |
| **Temperature/max tokens controls**        | Standard LLM parameters      | LOW        | Part of any execution interface. Must be in UI, not buried in settings.          |
| **Execution logging**                      | Cost tracking, debugging     | MEDIUM     | Who ran what, when, with which model, how much it cost.                          |
| **Prompt editor with syntax highlighting** | Code-like editing experience | LOW        | Monaco editor already integrated. Non-negotiable for developer UX.               |
| **Diff view for versions**                 | See what changed             | LOW        | Already implemented. Standard expectation for versioned content.                 |
| **Search/filter prompts**                  | Find prompts quickly         | LOW        | Basic list management. Title, tags, purpose filtering.                           |
| **Error messages with context**            | Debug failed executions      | MEDIUM     | Users need to know WHY execution failed, not just "error".                       |

---

## Differentiators

Features that set the product apart. Not expected, but valued.

### Tier 1: Core Differentiators (Build First)

| Feature                                | Value Proposition                                                                                                                         | Complexity | Notes                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| **Settings-first function defaults**   | Configure once, use everywhere. Executor/Judge/Improve/Council each have their own default model + temperature. Reduces per-run friction. | MEDIUM     | Unique to this product. Most tools require model selection every time.                     |
| **Snippet variables with preview**     | `{{VAR}}` replacement shows live preview as you type. Declare variables in frontmatter, see resolved prompt before execution.             | MEDIUM     | PromptHub and Latitude have this, but not integrated with execution.                       |
| **Producer → Reviewer → Fix workflow** | Sequential council mode: generate output, review for issues, fix problems. Mimics human code review.                                      | HIGH       | Azure calls this "sequential orchestration with maker-checker loop". Rare in prompt tools. |
| **OpenCode SDK execution**             | Actual prompt execution via SDK, not just storage. Results captured with model provenance.                                                | MEDIUM     | LangSmith does this but without council modes. Unique integration.                         |

### Tier 2: Enhanced Differentiators (Build After Validation)

| Feature                            | Value Proposition                                                                        | Complexity | Notes                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| **Debate council mode**            | Multiple agents argue different perspectives, synthesize conclusion.                     | HIGH       | Azure "group chat" pattern. Good for complex decisions.                                          |
| **Consensus council mode**         | Parallel agents vote, coordinator aggregates.                                            | HIGH       | Azure "concurrent" pattern. Better accuracy through diversity.                                   |
| **Judge scoring with rubric**      | Score prompts 1-10 on clarity, completeness, specificity. Already partially implemented. | MEDIUM     | LangWatch and PromptLayer have evaluations. Differentiator is integration with improve workflow. |
| **Improvement loop with variants** | Generate N prompt variants from judge feedback, select best.                             | MEDIUM     | Already implemented. Differentiator is per-run model selection + presets.                        |
| **Execution cost tracking**        | Token counts, estimated cost per execution.                                              | MEDIUM     | Table stakes for production tools, but often missing in prompt managers.                         |

### Tier 3: Future Differentiators (Defer)

| Feature                         | Value Proposition                                     | Complexity | Notes                                                               |
| ------------------------------- | ----------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| **A/B testing prompt versions** | Statistical comparison of prompt performance.         | HIGH       | PromptLayer's flagship feature. Requires significant traffic.       |
| **Agent simulation**            | Test full agent workflows, not just single prompts.   | HIGH       | LangWatch's differentiator. Complex to implement.                   |
| **Trace replay**                | Replay production traces against new prompt versions. | HIGH       | Debugging production issues. Requires observability infrastructure. |
| **Team collaboration**          | Shared workspaces, permissions, comments.             | HIGH       | PromptHub's strength. Out of scope for PoC.                         |

---

## Anti-Features

Features to explicitly NOT build. Prevent scope creep.

| Anti-Feature                        | Why Requested                       | Why Problematic                                                                    | What to Do Instead                                                |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Real-time collaborative editing** | "Like Google Docs for prompts"      | Massive complexity, WebSocket infrastructure, conflict resolution. Not core value. | Single-user editing. Version history for collaboration.           |
| **Fine-tuning integration**         | "Train custom models on my prompts" | Entirely different domain. Requires ML infrastructure, GPU management.             | Focus on prompt engineering, not model training.                  |
| **Built-in LLM provider**           | "Don't want to manage API keys"     | Infrastructure nightmare, billing complexity, margin pressure.                     | Require users to bring their own OpenCode connection.             |
| **Complex workflow builder**        | "Visual drag-and-drop for agents"   | UX nightmare, edge cases explode, debugging impossible.                            | Pre-defined council modes with configuration, not visual builder. |
| **Analytics dashboard**             | "Show me trends over time"          | Requires significant data aggregation, visualization library.                      | Basic execution logs. Defer analytics to later phase.             |
| **Plugin/extension system**         | "Let users add custom functions"    | Security nightmare, API surface explosion.                                         | Fixed set of function types (executor, judge, improve, council).  |
| **Mobile app**                      | "Manage prompts on the go"          | Completely different UX, limited screen real estate.                               | Web-first responsive design. Mobile browser sufficient.           |

---

## Feature Dependencies

```
Settings Refactor (Phase 1)
    └──required for──> Prompt Execution (resolves model from defaults)
                            └──required for──> Council Modes (each step executes)

Snippet Variables (Phase 2)
    └──enhances──> Prompt Execution (variables resolved before execution)
    └──requires──> Preview Panel (see resolved prompt)

Judge Scoring (exists)
    └──required for──> Improvement Loop (uses gaps/recommendations)

Improvement Loop (exists)
    └──enhances──> Council "correct" mode (can use improve as fix step)
```

### Dependency Notes

- **Settings Refactor requires Execution Endpoint:** Function defaults are useless if there's no execution to use them. Must build execution first.
- **Snippet Variables require Preview Panel:** Users won't trust variable replacement if they can't see the result before executing. Preview is mandatory.
- **Council Modes require Execution Endpoint:** Each council step is an execution. Can't build council without execution foundation.
- **Debate/Consensus require "correct" mode:** Simpler council mode validates architecture before building complex multi-round patterns.

---

## Competitor Feature Matrix

| Feature            | LangWatch | PromptLayer | LangSmith | PromptHub | This Product |
| ------------------ | --------- | ----------- | --------- | --------- | ------------ |
| Prompt versioning  | ✅        | ✅          | ✅        | ✅        | ✅ (exists)  |
| Model selection    | ✅        | ✅          | ✅        | ✅        | ✅ (planned) |
| Execution via SDK  | ✅        | ❌          | ✅        | ✅        | ✅ (planned) |
| Template variables | ✅        | ✅          | ❌        | ✅        | ✅ (planned) |
| Live preview       | ❌        | ❌          | ❌        | ✅        | ✅ (planned) |
| Judge/evaluation   | ✅        | ✅          | ✅        | ✅        | ✅ (exists)  |
| Improvement loop   | ❌        | ❌          | ❌        | ❌        | ✅ (exists)  |
| Council modes      | ❌        | ❌          | ❌        | ❌        | ✅ (planned) |
| Function defaults  | ❌        | ❌          | ❌        | ❌        | ✅ (planned) |
| A/B testing        | ✅        | ✅          | ✅        | ❌        | ❌ (defer)   |
| Agent simulation   | ✅        | ❌          | ✅        | ❌        | ❌ (defer)   |

**Key insight:** No competitor combines execution, council modes, AND function defaults. This is the differentiation gap.

---

## MVP Definition

### Phase 1: Settings Refactor + Execution Endpoint (Must Have)

**Goal:** Users can configure function-level defaults and execute prompts with those defaults.

| Feature                                            | Why Essential                                  |
| -------------------------------------------------- | ---------------------------------------------- |
| Function defaults (executor/judge/improve/council) | Core differentiator, reduces friction          |
| Prompt execution via OpenCode SDK                  | Foundation for all future features             |
| Model resolution with logging                      | Debugging, reproducibility, cost tracking      |
| Temperature/max tokens per function                | Standard controls, user expectation            |
| Execution log schema                               | Cost tracking, debugging, analytics foundation |

**Success criteria:**

- User sets "judge" default to claude-3-sonnet, "improve" to gpt-4
- User executes prompt, sees which model was used and why
- Execution log shows model_id, model_source, tokens, duration

### Phase 2: Snippet Variables + Preview (Should Have)

**Goal:** Users can create reusable prompt templates with variable substitution.

| Feature                                    | Why Essential                          |
| ------------------------------------------ | -------------------------------------- |
| `{{VAR}}` syntax in prompts                | Reusability, DRY principle             |
| Variable declaration in frontmatter        | Explicit contract, validation          |
| Live preview panel                         | Trust, debugging, injection prevention |
| Variable validation (required vs optional) | Error prevention                       |

**Success criteria:**

- User creates prompt with `{{TOPIC}}` variable
- User types value in preview panel, sees resolved prompt
- Preview updates on every keystroke
- Missing required variable shows clear error

### Phase 3: Council "Correct" Mode (Should Have)

**Goal:** Sequential producer → reviewer → fix workflow.

| Feature                        | Why Essential                    |
| ------------------------------ | -------------------------------- |
| Sequential execution pipeline  | Foundation for all council modes |
| Producer step (generate)       | Creates initial output           |
| Reviewer step (judge)          | Identifies issues                |
| Fix step (improve)             | Resolves issues                  |
| Round limit (max 3)            | Prevent infinite loops           |
| State management between steps | Context passing                  |

**Success criteria:**

- User runs "correct" mode on prompt
- System generates output, reviews it, fixes issues
- User sees all three outputs with clear progression
- System stops if no issues found after review

### Phase 4: Council "Debate" and "Consensus" (Nice to Have)

**Goal:** Multi-perspective analysis and voting.

| Feature                                | Why Valuable         |
| -------------------------------------- | -------------------- |
| Concurrent execution (parallel agents) | Diverse perspectives |
| Voting/aggregation logic               | Decision synthesis   |
| Configurable agent roles               | Customization        |
| Multi-round debate                     | Deeper analysis      |

**Success criteria:**

- User runs "debate" mode, sees 3 agents argue different perspectives
- System synthesizes conclusion from arguments
- User runs "consensus" mode, sees vote breakdown

---

## Feature Prioritization Matrix

| Feature             | User Value | Implementation Cost | Phase |
| ------------------- | ---------- | ------------------- | ----- |
| Function defaults   | HIGH       | MEDIUM              | P1    |
| Execution endpoint  | HIGH       | MEDIUM              | P1    |
| Execution logging   | HIGH       | MEDIUM              | P1    |
| Snippet variables   | HIGH       | MEDIUM              | P2    |
| Preview panel       | HIGH       | MEDIUM              | P2    |
| Council "correct"   | HIGH       | HIGH                | P3    |
| Council "debate"    | MEDIUM     | HIGH                | P4    |
| Council "consensus" | MEDIUM     | HIGH                | P4    |
| A/B testing         | MEDIUM     | HIGH                | P5+   |
| Agent simulation    | MEDIUM     | HIGH                | P5+   |
| Team collaboration  | LOW        | HIGH                | P5+   |

---

## Council Mode Patterns (Detailed)

Based on Azure Architecture Center and Semantic Kernel research:

### Sequential (Producer → Reviewer → Fix)

```
Input → [Producer] → Output1 → [Reviewer] → Issues → [Fixer] → Final Output
                                              ↓
                                         (no issues? done)
```

**When to use:** Quality assurance workflows, code review patterns, content refinement.

**Implementation:**

1. Producer: Execute with "executor" defaults, generate output
2. Reviewer: Execute with "judge" defaults, identify issues
3. Fixer: If issues exist, execute with "improve" defaults, fix
4. Loop: Max 3 rounds, then return best result

### Concurrent (Voting/Consensus)

```
                    ┌→ [Agent A: Technical] ─→ Vote A ─┐
Input → Dispatcher ─┼→ [Agent B: Business]  ─→ Vote B ─┼→ Aggregator → Final
                    └→ [Agent C: Creative]  ─→ Vote C ─┘
```

**When to use:** Diverse perspectives needed, classification tasks, risk assessment.

**Implementation:**

1. Dispatcher: Send same input to N agents in parallel
2. Each agent: Independent analysis, return structured vote
3. Aggregator: Apply voting rule (majority, weighted, consensus)

### Group Chat (Debate)

```
Input → [Agent A] ←→ [Agent B] ←→ [Agent C] → [Coordinator] → Final
           ↑_______________________________↓
                    (iterate until consensus or max rounds)
```

**When to use:** Complex decisions, creative brainstorming, policy analysis.

**Implementation:**

1. All agents see shared message history
2. Round-robin or dynamic turn-taking
3. Coordinator decides when to stop (consensus, max rounds, timeout)

---

## Integration with Existing Features

The new features integrate with existing capabilities:

| Existing Feature      | New Feature Integration                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| **Judge evaluations** | Uses new "judge" function defaults instead of per-run selection             |
| **Improvement loop**  | Uses new "improve" function defaults; can be called as council "fix" step   |
| **Prompt versions**   | Snippet variables stored in version content; preview shows resolved version |
| **Admin settings**    | Becomes "global defaults"; function defaults can override per-function-type |
| **Model catalog**     | Function defaults validated against catalog; UI shows available models      |

---

## Sources

### High Confidence (Context7, Official Docs)

- **LangWatch Blog (2025-12-23):** Prompt management tool comparison, evaluation patterns
- **Braintrust Docs:** Playground patterns, task/scorer/dataset structure
- **Azure Architecture Center:** AI agent orchestration patterns (sequential, concurrent, group chat, handoff, magentic)
- **Latitude.so:** Template syntax basics, variable interpolation, control flow

### Medium Confidence (Web Research, Multiple Sources)

- **Medium (2025-06-25):** Voting-based council patterns, implementation with LangChain/Semantic Kernel
- **Promptaa (2025-12-04):** Prompt management tools feature comparison
- **Google Developer Blog (2025-12-16):** Multi-agent patterns in ADK

### Codebase Analysis (HIGH Confidence)

- **opencode.service.ts:** Execution patterns, session management, catalog caching
- **admin-settings.service.ts:** Settings structure, policy validation
- **improvement.service.ts:** Variant generation, model selection, preset integration
- **judge.service.ts:** Evaluation flow, retry logic, model resolution
- **schema.ts:** Database structure, existing features

---

_Feature research for: Prompt Management with OpenCode Integration_
_Researched: 2026-02-14_
