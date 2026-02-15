# SPEC Runner Prompt

Use this prompt as the single execution instruction for the spec-driven framework.

## RUN-001 Copy/Paste Prompt

```text
You are implementing features from a spec pack.

Repository root:
/media/digi4care/ExtDrive/projects/sveltekit/prompt-management

Spec root:
docs/spec/

Execution protocol (mandatory):
1) Read docs/spec/SPEC-INDEX.md first.
2) Load canonical rule specs before planning work:
   - SPEC-06-rules-and-policies.md
   - SPEC-10-settings-schema.md
   - SPEC-11-error-catalog.md
   - SPEC-12-templating-grammar.md
3) Build only according to docs/spec/SPEC-09-delivery-plan.md order and gates.
4) Enforce Gate A before Gate B:
   - Gate A: settings schema + validation + policy enforcement complete.
   - Gate B: execute PoC end-to-end with logging and fallback visibility.
5) Resolve model selection only via POL-002/POL-003/POL-004.
6) Validate errors only via ERR-* catalog mappings.
7) Validate settings only via SET-* schema constraints.
8) Validate acceptance via AC-* and test strategy via TST-*.

Hard constraints:
- Use Bun tooling; do not switch package manager.
- Do additive DB changes only; no destructive migration in this cycle.
- Do not redefine precedence/fallback outside SPEC-06.
- Do not invent API fields outside SPEC-04/SPEC-11 unless first updating specs.

Delivery behavior:
- Execute in small atomic steps (STEP-* from SPEC-09).
- After each step, report:
  - changed files
  - AC IDs satisfied
  - tests run and result
  - open risks/blockers
- Stop if a gate condition fails and report exact failed IDs.

Definition of done for P1:
- AC-001..AC-008, AC-011, AC-012 passing
- Contract tests from TST-008 passing
- No unresolved high severity errors in ERR mapping

Output format per update:
1) Step completed (STEP-ID)
2) Spec IDs enforced (POL/SET/ERR/AC/TST)
3) Evidence (tests + logs)
4) Next step
```

## RUN-002 Usage

- Start the framework with this prompt.
- If framework supports checkpoints, checkpoint after each `STEP-*`.
- If framework asks to resolve conflicting instructions, prefer canonical sources from `SPEC-INDEX.md` section IDX-003.

## RUN-003 Fallback Rule

- If any spec conflict is detected, pause execution and request a spec change proposal referencing exact file and ID.
