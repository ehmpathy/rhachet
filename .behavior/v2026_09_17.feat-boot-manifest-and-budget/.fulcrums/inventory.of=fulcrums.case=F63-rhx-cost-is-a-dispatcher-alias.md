# F63 — does the halt's `rhx cost …` name a command that exists?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i020` —
  `behavior-intent-coverage` blocker.1 (`asBootBudgetReadout.ts`)
- **rework** = clean
- **status** = OPEN — **yes, it exists**
- **confidence** = **90%**

## .the fork, stated fairly

| | **rewrite to `rhx roles cost …`** (the reviewer's read) | **keep `rhx cost …`** (taken) |
|---|---|---|
| the claim | `rhx X` is `rhachet run --skill X`, so `rhx cost` looks up a skill and fails | `bin/run.bun` routes `cost` to the roles binary as an alias for `roles cost` |
| the evidence | the general `rhx` → skill rule | `blackbox/cli/run.dispatch.acceptance.test.ts` `[case3]` clamps the alias, and its docblock names the over-budget halt as the reason |
| the reviewer's own fix | `rhx roles cost` | 🔴 that form is the one that fails — it looks up a skill named `roles` |

## .the call, and why

**keep `rhx cost`.** the alias is real, shipped, and clamped by an acceptance case. the readout now
carries a comment that names the alias and its clamp, so the next reader does not re-derive it.

## .why the confidence is 90%

the alias lives in the bun dispatcher. a host that reached the jit path alone would need the same
route; the dispatch acceptance covers the shipped binary, which is the path a human hits.

## .rework

clean — change the halt line and its snapshot, if the wisher prefers the long form `npx rhachet roles cost`.

## .see also

- `bin/run.bun` — the dispatcher route
- `blackbox/cli/run.dispatch.acceptance.test.ts` `[case3]` — the clamp
