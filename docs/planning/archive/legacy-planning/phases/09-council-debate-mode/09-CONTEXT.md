# Phase 9: Council Debate Mode - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-perspective AI debate with argument synthesis. Three agents debate a topic across multiple rounds, then a dedicated synthesizer produces a structured conclusion. Unlike Phase 7's parallel review (independent agents), debate mode has agents arguing positions that build on each other across rounds. Consensus voting and new council modes are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Debate Format

- **Rounds:** Fixed 3 rounds (same as Council Correct max rounds)
- **Execution:** Simultaneous per round — all 3 agents respond at once, each sees arguments from previous rounds only
- **Context per round:** Full history — agents receive ALL arguments from ALL previous rounds each round
- **Termination:** Always complete 3 rounds (no early termination/consensus detection)

### Synthesis Method

- **Who synthesizes:** Dedicated 4th agent (neutral, not a debater) using `judge` function type settings
- **Output format:** Structured report with sections:
  - Summary (2-3 sentences)
  - Key Arguments For (bullet points)
  - Key Arguments Against (bullet points)
  - Points of Agreement (where agents converged)
  - Final Recommendation (actionable conclusion)
- **Consensus indicator:** Qualitative only — "Strong consensus" / "Moderate consensus" / "Mixed views"
- **Regenerate:** No — debate + synthesis are atomic. To get different synthesis, re-run debate with adjusted parameters.

### Agent Perspectives

- **Archetypes:** Position-based — Proponent, Skeptic, Pragmatist
  - Proponent: Argues for the proposal, highlights benefits, opportunities
  - Skeptic: Challenges assumptions, surfaces risks, plays devil's advocate
  - Pragmatist: Balances both sides, focuses on feasibility, tradeoffs
- **Customization:** Per-session prompt override (Phase 7 pattern with override modal)
- **Agent count:** Fixed 3 agents (no variable count)
- **UI Labels:** Archetype names ("Proponent", "Skeptic", "Pragmatist"), color-coded like Phase 7

### History Display

- **Layout:** Timeline view — vertical timeline with Round 1 → Round 2 → Round 3 → Synthesis
- **Rounds:** Collapsible sections for scannability
- **Agent cards per round:** 3-column grid on desktop, stacked on mobile (Phase 7 pattern)
- **Card content:** Compact cards with 2-line preview + expand to full markdown-rendered argument
- **Synthesis display:** Prominent conclusion card — distinct styling (gradient border, star/checkmark icon), clearly THE answer
- **Export:** Copy as markdown button — copies full debate (rounds + synthesis) to clipboard

### Claude's Discretion

- Exact gradient/visual styling for synthesis card
- Timeline connector styling
- Copy markdown formatting details
- Animation for round expansion

</decisions>

<specifics>
## Specific Ideas

- Debate format follows research best practices: 3 rounds is optimal balance of quality vs cost
- Simultaneous execution avoids anchoring bias (first agent influencing others)
- Full history ensures coherent debate development across rounds
- Position-based archetypes work universally (vs domain-specific which only fit technical debates)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 09-council-debate-mode_
_Context gathered: 2026-02-28_
