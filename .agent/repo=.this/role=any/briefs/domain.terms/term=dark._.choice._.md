# domain.term: dark

term.chosen   = dark
term.kind     = adj
term.synonyms.forbidden:
- silent
- empty
- missing
- skipped

## .what

a review lane is **dark** when it produced **no readable finding** — it emitted a verdict a
reader cannot act on, whether because its prompt overflowed before it graded, or because it
tallied a count and named no item.

dark describes the **artifact**, never the reviewer's opinion. a dark lane holds no position for
you to answer.

## .the two shapes

| shape | what the lane emitted |
|---|---|
| **overflow** | no verdict at all — `constraint ✋`, dead at *"prompt exceeds 75% of context window"* |
| **contentless** | a verdict with no finding — `1 blocker, 0 nitpicks` and not a word on what |

both read as *"the lane spoke"* on the ladder. neither can be converged by argument.

## .dark is a TASK, never a verdict

this is the whole point of the word. a dark lane is not a reviewer who disagrees with you — it is
a lane whose lens never landed. so:

| the lane is… | you must… |
|---|---|
| dark | **re-run it** (`rule.always.rerun-dark-review-lanes-scoped`) |
| rejected | converge — repair, or refute with cited evidence |

⇒ to write a `.taken` against a dark lane is to answer a point that does not exist. the taken
converges naught, and the round burns.

## .not `blocked`, not `exhausted`, not `malfunction`

adjacent, and each distinct:

| term | says |
|---|---|
| **dark** | the finding is unreadable — a property of the ARTIFACT |
| `malfunction` | the guard's VERDICT class for a review it could not read |
| `exhausted` | budget spent against a reviewer that could not be satisfied |
| `blocked` | the stone is held |

`malfunction` is the verdict the guard files; `dark` is the state of the lane that earned it.
a lane can be dark while its verdict reads `rejected` — the contentless shape does exactly that,
and that mismatch is what makes the word necessary.

## .refs

- `.agent/repo=.this/role=any/briefs/rule.always.rerun-dark-review-lanes-scoped.md` — the rule that governs the response
- `rule.always.diagnose-reviewer-malfunctions` (bhrain/driver) — the diagnose-before-escalate twin

## .reason

see the ref-level cluster beside this choice:
- `term=dark._.choice.reason.md` — etymology, disputes, evidence
