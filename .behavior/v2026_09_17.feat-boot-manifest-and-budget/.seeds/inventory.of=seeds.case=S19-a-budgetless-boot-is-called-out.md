# S19 — a spec with no budget is called out as budgetless, in its own stats

- **raised** = 2026-09-30, after `5.3.verification`, on a read of requirement 4's delivery
- **kind** = contract — it rewrites requirement 4, and reverses `S11`

---

## .said

> we should add a line that says tokens ~= 4210 / unlimited budget ; those folks should be called
> out for being budgetless - No budget declared: output is byte-identical to today, and a test pins
> that.

---

## .settled

**a boot whose spec declares no budget is never refused, and is always called out.** its `<stats>`
total line reads `tokens ≈ N / unlimited budget`, in the block every reader of the boot sees.

- the cap stays **opt-in** — no default budget, no halt, no warn on stderr
- the absence of a budget is **visible**, rather than byte-identical to a world where budgets did
  not exist
- the number stays the `chars ÷ 4` **estimate**, marked `≈`. the measured count needs the
  tokenizer, whose ~1.8s construction an unbudgeted boot must never pay — so the perf shield of
  requirement 4 holds; only its render guarantee is struck

⇒ **`S11` is reversed.** it read *"renders as it does today"* at its word and cut every advisory.
the callout here is in-band and refuses naught, but it is a render change, which `S11` forbade.

---

## .landed

- 🔴 **wish requirement 4** — rewritten: *renders as today* → *never refused, called out as budgetless*
- `asBootStatsLinesUnbudgeted.ts` — the total line gains `/ unlimited budget`
- `roles.boot.budget.acceptance.test.ts` `[case1]` — the negative no-advisory pin becomes a positive
  callout assertion plus an empty-stderr assertion
- `invokeRolesBoot.budget.integration.test.ts` — the unbudgeted manifest case, likewise
- every unbudgeted acceptance snapshot — resnapped; no budgeted snapshot moves
- `case=5` — the narrative and bdd sketch rewritten to the callout
