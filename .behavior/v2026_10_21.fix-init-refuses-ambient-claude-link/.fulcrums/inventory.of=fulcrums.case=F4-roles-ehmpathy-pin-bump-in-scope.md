# F4 — the `rhachet-roles-ehmpathy >= 1.39.5` pin bump rides this pr

- **fork:** (a) bump the pin in this pr, or (b) ship only rhachet's clamps and bump in a separate pr
- **taken:** (a). the bump is the direct cure for the measured cloud fault (cause 1, proven); without it
  a fresh cloud tree still fails at the mechanic init, so the outcome "a fresh tree boots a crew on
  cloud" is unmet. `1.39.7` is already staged in this tree, with the bhrain and bhuild bumps beside it
- **rework:** clean — revert the lockfile hunk
- **confidence:** 85%
- **where:** `1.vision.yield.md` → cause 1, open question 4
- **verdict:** (a), ruled by the director 2026-11-02 — keep `rhachet-roles-ehmpathy` at `1.39.7`, the
  version that fixes the read-only grove. the flipped `invokeInit` assertion and the three
  `init.incremental` snapshot hunks stay
