# S13 — a repo-wide sweep is a COST report, not a second noun

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, after `S14` cut the sweep's hook
- **kind** = premise — it strikes a noun the drive had treated as given

---

## .said

> why is there a separate command at all?

and, when the drive laid out the two options:

> fold into cost obviously

---

## .settled

**`roles budget` is closed. the repo-wide sweep becomes `roles cost --all`.**

⇒ 🔴 **`S10`, one level up.** `S10` closed a fork between two *readings* of one fact; this closes a
fork between two *commands* that answer one question. a human who types `roles cost` and a human who
types `roles budget` both ask **"what do these specs cost?"** — one question, so one command.

| the command | the question it answers |
|---|---|
| `roles cost` | what does **this** spec cost? |
| `roles cost --all` | what do **all** the specs cost? |
| ~~`roles budget`~~ | 🔴 the same question, under a second noun |

**the noun `budget` names a LIMIT, never a report.** the limit lives in the spec and the halt lives
at `boot`; a command named for the limit that renders a report was named for the wrong half.

🔴 **and the fold forces one behavior change: `cost` reports, it does not throw.**
`assertRepoBootSpecsWithinBudget` threw on an over-budget spec, which was right while it was a gate.
under `cost` it renders the row and exits 0 — **a report that throws is not a report**, and the halt
already lives at `boot`.

---

## .landed

- `invokeRolesBudget.ts` · `asBudgetSweepCaller.ts` — deleted, with `--when`
- `assertRepoBootSpecsWithinBudget` — the throw becomes a report; the halt string retargeted
- `invokeRolesCost.ts` — gains `--all`
- its acceptance suite + snapshots — renamed onto `cost`
- 🔴 **`F31` moot** — see `S14`
