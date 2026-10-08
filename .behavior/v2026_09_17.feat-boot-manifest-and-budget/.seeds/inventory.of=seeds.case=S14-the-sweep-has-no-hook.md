# S14 — a human may sweep; a hook may not

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, on `F31` and the lane that graded it
- **kind** = contract — it settles who may invoke the repo-wide sweep

---

## .said

shown a table that split the sweep by caller — a human who types it, versus an `onStop` hook that
fires it unprompted — the wisher ruled:

> yes, correct

and then, on the command itself:

> yeha dude, bring back the command ; just no the hook

---

## .settled

**the sweep keeps its human caller and loses its hook.**

| the caller | verdict | why |
|---|---|---|
| a **human** who types it | ✅ **keep** | they asked. a gate a human cannot inspect is a gate they cannot trust — the same verdict that kept the command callable at all |
| an **`onStop` hook** that fires it | 🔴 **cut** | nobody asked. it renders a roster into every session's close, forever, on a question that session never posed |

⇒ 🔴 **the split is by CALLER, and that is what makes `F31` dissolve rather than resolve.**

`F31` asked *how loud the sweep should be when every spec is under* — a roster of all, or a terse
`✅ none over`? **that question existed only because the sweep fired unprompted.** an unasked report
owes its reader brevity; a report a human typed owes them the population they asked for.

🔴 **with no hook, every invocation is a human who asked.** so the fork has no case left to decide —
it is **moot**, never deferred and never fixed.

🟡 **and the lane that graded `F31` a blocker was right about the noise and wrong about the fix.** it
argued the sweep needed a quieter voice. the sweep needed no unprompted voice at all.

---

## .landed

- `syncRhachetHooksIntoEachBrainRepl.ts` · `syncRhachetHooksIntoOneBrainRepl.ts` — deleted
- `asBudgetSweepCaller.ts` + the `--when hook.$event` flag — deleted with them
- 🔴 **gate 2 of the vision's three gates** — struck. the yield's `requirement 9` section goes with it
- `case=9.onstop-holds-the-stop` — deleted; axis **H** loses a position
- 🔴 **`F31`** — resolved **moot**
- 🔴 **`S5` and `S7` both narrowed** — each declared a gate this seed removes
