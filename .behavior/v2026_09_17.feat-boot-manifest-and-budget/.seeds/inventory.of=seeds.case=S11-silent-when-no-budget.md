# S11 — a spec that declares no budget gets no output at all

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, on the blocker's row 7
- **kind** = contract — it settles requirement 4's reach

---

## .said

> yeah, do nothing if no budget in manifest

---

## .settled

**`F9`'s `🟡 no budget declared` warn is cut.** a manifest that declares no budget renders exactly
as it does today, and emits no advisory of any kind.

⇒ this reads requirement 4 — *"a boot.yml with no `budget` renders as it does today"* — at its
word. a warn is a render change, so an uncapped boot that warns does **not** render as it does
today.

🟡 **and the warn fired on a file that broke no rule**, which is what makes it worse than merely
out of scope: the budget is opt-in by construction (requirement 4), so a spec with no budget has
exercised a sanctioned choice. to advise against it is to grade a decision the contract grants.

---

## .landed

- `F9` — verdict reversed from `implement` to `cut`
- `asBootUncappedWarnLines.ts` — deleted, with its call site
- its acceptance + integration cases — deleted
- the yield's cons list — the "uncapped manifest is a first-class path to the extant defect" row
  loses its stated mitigation, and keeps the risk honestly unmitigated
