# R9 — no cap on the sum in one `boot.md`

**status:** 🟡 gap

each `budget.tokens` caps one spec. `boot.md` concatenates every role a brain dir holds, so N
roles each within budget can still sum past any sane bound. measured this session: `boot.md`
≈ 368k tokens, 37% of a 1m window, resident before turn one.

open question for the wisher: a per-brain-dir budget (where declared — actor? repo?), or out of
scope for this behavior. it rides the same render-time gate as R3 option A, so the mechanism is free
once A lands.
