# F31 — the roster header counts the specs it measured; the receipt names the one set aside

- **fork**: add a set-aside count to the roster header (`1 boot spec — 1 budgeted, all within budget, 1 set aside below`); or keep the header a tally of measured specs, with the 🟡 receipt as the one place a set-aside spec is named
- **taken**: keep the header as is
- **why**:
  - the header's claim is true as stated: every spec it counts is within budget. a spec that will not parse has no token count, so it is outside that claim, not a breach of it
  - the same render ends on `🟡 boot set aside 1 role content defect`, which names the spec and its fix. a human who reads the roster reads both
  - the header shape is shared with every roster render, clean or not, and a dozen snapshots lock it. a new clause moves each for a case the receipt already covers
- **counter (5.3 i004 r11 nitpick.3)**: "all within budget" reads green while one spec went unmeasured
- **rework**: clean. one clause in the header, gated on a non-empty set-aside list
- **confidence**: 70%
- **where**: 5.3 peer review i004 r11 nitpick.3
- **verdict**: open
