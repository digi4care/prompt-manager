# Pitfalls Research

**Domain:** Prompt Management with AI Execution (OpenCode Integration)
**Researched:** 2026-02-14
**Confidence:** HIGH (verified with Context7, official docs, multiple web sources)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Model Resolution Ambiguity

**What goes wrong:**
Model selection logic is scattered across multiple sources (prompt metadata, user preferences, admin settings, function defaults) without clear precedence. Different code paths resolve to different models for the "same" execution, making results non-reproducible and debugging impossible.

**Why it happens:**

- Settings exist in multiple places: admin_settings table, prompt frontmatter, user session, hardcoded defaults
- No single source of truth for resolution order
- Backward compatibility concerns lead to fallback chains that hide which model was actually used

**How to avoid:**
Implement a deterministic resolution chain documented in one place:

```
1. Explicit override (API call parameter)
2. Prompt-level setting (YAML frontmatter)
3. Function-type default (executor/judge/improve/council)
4. Global default (admin settings)
```

Every execution MUST log the resolved model AND which source provided it.

**Warning signs:**

- Same prompt produces different results "randomly"
- Debug logs show model ID without indicating source
- Multiple `getSetting()` calls with fallback chains
- Settings API returns different values than execution logs

**Phase to address:** Phase 1 (Settings Refactor + Execution Endpoint)

---

### Pitfall 2: Snippet Variable Injection Attacks

**What goes wrong:**
`{{VAR}}` replacement allows prompt injection when user-controlled data flows into template variables. Attackers can inject instructions that override the prompt's intended behavior, exfiltrate data, or bypass guardrails.

**Why it happens:**

- Naive string replacement treats all `{{...}}` as variables
- No distinction between "trusted" prompt content and "untrusted" variable values
- Variables may contain `{{` or `}}` that create nested injection points
- YAML frontmatter makes it easy to forget that content is still user-editable

**How to avoid:**

1. **Escape variable values**: Any `{{` or `}}` in variable values must be escaped
2. **Single-pass replacement**: Replace all variables in one pass, then scan for any remaining `{{` and reject/log
3. **Validate allowed variables**: Only replace declared variables from frontmatter
4. **Audit trail**: Log original prompt + variables + rendered result

```typescript
// WRONG: Simple string replace
prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');

// RIGHT: Escape, validate, single-pass
function renderSnippet(template: string, variables: Record<string, string>): string {
	const declaredVars = extractDeclaredVariables(template);
	const escapedVars: Record<string, string> = {};

	for (const key of declaredVars) {
		if (!(key in variables)) throw new Error(`Missing required variable: ${key}`);
		// Escape any braces in the value
		escapedVars[key] = variables[key].replace(/\{/g, '\\{').replace(/\}/g, '\\}');
	}

	let rendered = template;
	for (const [key, value] of Object.entries(escapedVars)) {
		rendered = rendered.replaceAll(`{{${key}}}`, value);
	}

	// Check for unprocessed variables (possible injection)
	const remaining = rendered.match(/\{\{[^}]+\}\}/g);
	if (remaining) {
		throw new Error(`Unprocessed variables after rendering: ${remaining.join(', ')}`);
	}

	return rendered;
}
```

**Warning signs:**

- Variables containing `{{` are rendered without escaping
- No validation of declared vs. provided variables
- Preview panel shows rendered prompt without audit logging
- Missing unit tests for injection edge cases

**Phase to address:** Phase 2 (Snippet Variables + Preview)

---

### Pitfall 3: Execution Log Data Loss

**What goes wrong:**
Execution logs capture incomplete information, making debugging and cost tracking impossible. Critical missing pieces: which model was actually used, where the model came from (source), token breakdown (input/output), duration, and error context.

**Why it happens:**

- Logging added as afterthought, not designed upfront
- Token counts returned asynchronously or from streaming responses
- Error handling swallows context before logging
- Schema designed without execution analytics in mind

**How to avoid:**
Design execution log schema to capture:
| Field | Why Needed |
|-------|------------|
| `model_id` | Exact model used |
| `model_source` | 'prompt' \| 'function_default' \| 'global_default' \| 'override' |
| `input_tokens` | Cost calculation |
| `output_tokens` | Cost calculation |
| `duration_ms` | Performance monitoring |
| `status` | 'success' \| 'error' \| 'timeout' \| 'rate_limited' |
| `error_code` | Stable error classification |
| `error_message` | Debug context (sanitized) |
| `prompt_id` | Traceability |
| `rendered_prompt_hash` | Reproducibility (hash of final prompt) |

**Warning signs:**

- Can't answer "how much did this prompt cost last month?"
- Debugging requires re-running prompts
- Error logs show stack traces but not input that caused error
- Token counts missing from some executions

**Phase to address:** Phase 1 (Execution Endpoint + Logging)

---

### Pitfall 4: Council Mode State Explosion

**What goes wrong:**
Multi-agent council modes (debate, consensus) accumulate unbounded state as agents exchange messages. Memory grows, context windows overflow, and the system either crashes or produces degraded results.

**Why it happens:**

- Each agent response added to context for next agent
- No message pruning or summarization
- Council "rounds" don't have hard limits
- Error states leave partial state that corrupts retry

**How to avoid:**

1. **Hard round limits**: Maximum 3-5 rounds for debate/consensus
2. **Token budget**: Track cumulative tokens, stop before context limit
3. **State isolation**: Each round starts fresh, only conclusion passed forward
4. **Recovery strategy**: Define what happens when council fails (fallback to single agent?)

```typescript
// Council execution with guardrails
interface CouncilConfig {
	maxRounds: number; // Default: 3
	maxTokensPerRound: number; // Default: 4000
	fallbackModel?: string; // If council fails
}

async function executeCouncil(prompt: string, config: CouncilConfig): Promise<CouncilResult> {
	const state: CouncilState = {
		rounds: [],
		totalTokens: 0,
		status: 'in_progress'
	};

	for (let round = 0; round < config.maxRounds; round++) {
		const roundResult = await executeRound(prompt, state, config);
		state.rounds.push(roundResult);
		state.totalTokens += roundResult.tokens;

		if (state.totalTokens > config.maxTokensPerRound * config.maxRounds) {
			return { status: 'token_budget_exceeded', partialResult: summarize(state) };
		}

		if (roundResult.consensus) {
			return { status: 'consensus_reached', result: roundResult.conclusion };
		}
	}

	return { status: 'max_rounds_reached', partialResult: summarize(state) };
}
```

**Warning signs:**

- No maximum rounds configured
- Council execution time grows unbounded
- Memory pressure during council execution
- No fallback when council fails to reach consensus

**Phase to address:** Phase 3 (Council Mode 'correct') and Phase 4 (Council modes 'debate'/'consensus')

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                         | Immediate Benefit                          | Long-term Cost                              | When Acceptable                     |
| -------------------------------- | ------------------------------------------ | ------------------------------------------- | ----------------------------------- |
| In-memory rate limiting          | Simple implementation, no Redis dependency | Lost on restart, doesn't scale horizontally | Single-instance development only    |
| Skip token logging for streaming | Faster initial implementation              | No cost visibility, can't optimize          | Never - token tracking is essential |
| Hardcode model in function       | No settings lookup                         | Can't change model without code deploy      | Proof of concept only               |
| Log full prompt text             | Easier debugging                           | PII leakage, storage costs                  | Development with synthetic data     |
| Ignore streaming errors          | Simpler error handling                     | Silent failures, corrupted state            | Never                               |
| Cache provider catalog forever   | No API calls to OpenCode                   | Stale model list, missing new models        | Never - always use TTL              |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration        | Common Mistake                               | Correct Approach                           |
| ------------------ | -------------------------------------------- | ------------------------------------------ |
| OpenCode SDK       | Using `as any` to bypass typing              | Create typed interfaces, submit PR to SDK  |
| OpenCode SDK       | Assuming session persists                    | Create fresh session per execution         |
| OpenCode SDK       | Not checking `status` field in model catalog | Filter out 'deprecated' and 'alpha' models |
| OpenCode streaming | Not handling abort/cancel                    | Implement cleanup in finally block         |
| Provider catalog   | Trusting catalog order is stable             | Sort by explicit criteria, not array order |
| Admin settings     | Caching settings indefinitely                | Refresh on each execution or short TTL     |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap                       | Symptoms                            | Prevention                                      | When It Breaks            |
| -------------------------- | ----------------------------------- | ----------------------------------------------- | ------------------------- |
| N+1 settings queries       | Slow execution, many DB calls       | Batch load all settings once per request        | 10+ concurrent executions |
| Uncapped execution history | Database bloat, slow queries        | Implement retention policy (30-90 days)         | 10,000+ logged executions |
| No execution timeout       | Hung requests, resource exhaustion  | Set max duration (60s default)                  | First long-running prompt |
| Synchronous streaming      | Event loop blocked                  | Use async iteration, don't buffer full response | 100+ concurrent streams   |
| Full prompt in logs        | Disk space exhaustion, PII exposure | Store hash, truncate to 500 chars               | 1,000+ executions/day     |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake                                             | Risk                                 | Prevention                                                    |
| --------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| User input in prompt templates without sanitization | Prompt injection, data exfiltration  | Escape all `{{` and `}}`, validate against declared variables |
| Logging full prompt content                         | PII leakage, credential exposure     | Hash prompts, log metadata only                               |
| No model access control                             | Users can use expensive models       | Implement `opencode_allowed_models` allowlist                 |
| Missing execution audit trail                       | Can't investigate security incidents | Log user, timestamp, model, prompt_id for every execution     |
| CORS allows any origin for API                      | Cross-site request forgery           | Require explicit origin allowlist                             |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall                            | User Impact                                   | Better Approach                         |
| ---------------------------------- | --------------------------------------------- | --------------------------------------- |
| Preview shows stale variables      | Confusion when execution differs from preview | Re-render preview on variable change    |
| No progress during streaming       | User thinks it's frozen                       | Show typing indicator, stream tokens    |
| Model selection buried in settings | Users don't know which model they're using    | Show resolved model prominently in UI   |
| Error messages are technical codes | Users can't fix problems                      | Map errors to actionable guidance       |
| No execution history               | Can't compare results over time               | Show recent executions with key metrics |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Snippet Variables:** Often missing injection validation — verify `{{` escaping in variable values
- [ ] **Execution Logging:** Often missing model source — verify log shows where model was resolved from
- [ ] **Preview Panel:** Often missing real-time updates — verify preview re-renders on variable change
- [ ] **Error Handling:** Often swallows context — verify errors are logged with prompt_id and model
- [ ] **Rate Limiting:** Often only checks request count — verify token-aware rate limiting
- [ ] **Streaming:** Often missing abort handling — verify cleanup on client disconnect
- [ ] **Council Mode:** Often missing round limits — verify max rounds enforced

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                    | Recovery Cost      | Recovery Steps                                                                          |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Model resolution ambiguity | MEDIUM             | Add logging, audit executions, backfill model_source from timestamps                    |
| Variable injection         | HIGH               | Audit all rendered prompts, identify compromised executions, rotate any exposed secrets |
| Execution log data loss    | LOW (forward only) | Add missing fields, accept historical gaps                                              |
| Council state explosion    | LOW                | Kill hung processes, add limits, retry with smaller context                             |
| Rate limit bypass          | MEDIUM             | Identify abusive users, implement retroactive limits, consider billing adjustments      |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                      | Prevention Phase            | Verification                                |
| ---------------------------- | --------------------------- | ------------------------------------------- |
| Model Resolution Ambiguity   | Phase 1: Settings Refactor  | Log shows model_source for every execution  |
| Snippet Variable Injection   | Phase 2: Snippet Variables  | Unit tests cover `{{` in variable values    |
| Execution Log Data Loss      | Phase 1: Execution Endpoint | Can query cost by prompt for any date range |
| Council Mode State Explosion | Phase 3: Council 'correct'  | Hard limit on rounds, timeout enforced      |
| Rate Limiting                | Phase 1: Execution Endpoint | Token-aware limits tested                   |
| Streaming Error Handling     | Phase 1: Streaming (SSE)    | Cleanup runs on abort, no resource leaks    |
| Preview Sync                 | Phase 2: Preview Panel      | Preview updates on every variable keystroke |

---

## OpenCode SDK-Specific Pitfalls

Issues specific to the `@opencode-ai/sdk` integration.

### SDK Typing Gaps

**What goes wrong:** The SDK uses `any` in many places, leading to runtime errors that TypeScript doesn't catch.

**Prevention:** Create local type definitions for all SDK interactions. Never trust SDK types without verification.

```typescript
// Create src/lib/server/opencode/types.ts
export interface OpencodeSession {
	prompt(params: SessionPromptParams): Promise<OpencodeResponse>;
}

export interface SessionPromptParams {
	model: { providerID: string; modelID: string };
	agent: string;
	parts: Array<{ type: 'text'; text: string }>;
	temperature?: number;
	maxTokens?: number;
}
```

### Session Lifecycle

**What goes wrong:** Sessions are created but not properly managed, leading to resource leaks or stale state.

**Prevention:** Always create fresh session per execution. Never reuse sessions across requests.

### Provider Catalog Cache

**What goes wrong:** In-memory cache isn't shared across server instances, leading to stale data in multi-instance deployments.

**Prevention:** Accept this limitation for P1, plan for Redis-backed cache in P2 if horizontal scaling needed.

---

## Sources

- **Context7 / Vercel AI SDK**: Streaming error handling, token tracking, callback patterns (HIGH confidence)
- **OWASP LLM Top 10 2025**: Prompt injection, sensitive information disclosure, improper output handling (HIGH confidence)
- **LLM Observability Research 2024-2025**: Logging best practices, token tracking, error categorization (HIGH confidence)
- **Multi-Agent Research 2024-2025**: Council mode state management, consensus mechanisms, round limits (MEDIUM confidence)
- **SSE Best Practices 2024-2025**: Connection handling, reconnection, heartbeat messages (HIGH confidence)
- **Codebase Analysis**: Existing `opencode.service.ts`, `admin-settings.service.ts`, `CONCERNS.md` (HIGH confidence)

---

_Pitfalls research for: Prompt Management with AI Execution_
_Researched: 2026-02-14_
