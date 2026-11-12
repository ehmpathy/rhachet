# F3 — a global rhx that differs from the pin is named, never refused

- **fork:** (a) name the skew and proceed, (b) warn loud, or (c) refuse when the global rhx differs from
  the tree's pin
- **taken:** (a) for this pr. the measured boots that matter (prepare, this repo's hooks) already run
  the pin; a refusal would break every human who keeps a newer global rhx
- **rework:** clean — a check at the cli entry, added later if the commander asks
- **confidence:** 75%. the wish asks "say whether the boot should refuse", which invites a verdict
- **where:** `1.vision.yield.md` → cause 6, open question 3
- **verdict:** —
