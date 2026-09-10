# Grain Planner golden — prototype `819f163`

`prototype-819f163.json` pins the ported domain (`app/lib/planner/grain`) to the behaviour of the
standalone prototype `codex/grain-planner-v0.5 @ 819f163`. It was captured once and must not be
regenerated to make a failing test pass: a mismatch means the port drifted.

- `fixtures` / `editChain` — the answer sets for users A, B, C1, C2, the prototype's DEMO, and the
  three batch #3 edits applied in sequence to DEMO.
- `logic` / `edits` — produced by executing the prototype's own `app/planner-logic.ts` in Node.
- `dom` — scraped with Playwright from the running prototype after walking each scenario through
  its real UI (1440 × 900). It covers values the prototype computed inside `planner.tsx`:
  readiness, completed-theme summaries, preliminary-brief rows, driver explanations,
  clarification cards, comparison-matrix cells, diagram labels and the rendered change notes.
  Whitespace is normalised (`\s+` → one space), so the prototype's non-breaking thousands
  separator appears as a plain space here; the tests normalise the port's output the same way.

Re-baseline only when the product intentionally changes behaviour, and record that decision in
the commit that changes this file.
