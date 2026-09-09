# domain.term.choice.reason: chrome

## .etymology

`chrome` is borrowed from interface design, where it names **the frame around the content** — the
toolbars, tabs and scrollbars a browser draws around a page it did not author. jef raskin coined
the sense; it is why google's browser is named for it. the borrow is exact: node's code frame,
stack, and version footer are drawn around a render node did not author.

the word was reached for because the repo already had two terms for fact-free bytes and neither
fit:

- **`hollow`** (`term=report._.choice.reason.md`) — a leaf that is fact-SHAPED and fact-free
  (`{}`, `[]`, an all-null object). chrome is not hollow; node's stack is full of true facts. they
  are simply not this surface's facts
- **`echo`** — content the `fix` leaf already spells. an echo is a repeat WITHIN one author's
  render; chrome is a second author entirely

so the gap the word fills is **authorship**, which neither extant term names.

## .the rejected alternatives, and why each fails

| word | why rejected |
|---|---|
| `noise` | a verdict, not a source. it says the bytes are unwanted and stays silent on who wrote them — which is the one fact that decides the remedy |
| `debug noise` | **already taken, for the opposite case.** `rule.forbid.snapshot-visual-blemishes` uses it for a dump the SUBJECT emitted (`DEBUG: internal state = …`). to reuse it here would overload one term across two authors and point every repair at the wrong layer (`rule.forbid.domain-term-ambiguity`) |
| `boilerplate` | means repeated code an author wrote on purpose. chrome is written by someone else, once per invocation |
| `wrapper` | a code construct (`withLogTrail`, a hof). chrome is output, never a construct |
| `harness output` | two words where one serves, and `harness` is this repo's test infra — node is not the harness, it is what the harness spawned |
| `cruft` / `decoration` | both are judgments of worth. chrome can be genuinely useful to a human at a terminal; it is simply not the contract |

## .evidence

### the discovery — a scenario narrative

the round that produced this term ran the same distinction three times, and got it wrong twice
before the word existed:

1. a snapshot of an sdk refusal pinned node's code frame, `at` frames, and `Node.js vX.Y.Z`. the
   `at` frames were cut on the stated ground *"a consumer catches the error and shows its message,
   never its frames"* — and the code frame and footer were left, though that identical ground
   covers them. **with no word for the class, the rule was applied to one member of it.**
2. the footer was then MASKED to `$NODE_VERSION` — treated as a volatile value the contract holds.
   it is not; the contract holds no node version at all
3. the name echo (`ConstraintError: ✋ ConstraintError:`) was DECLINED as third-party render, on a
   claim that a consumer sees the same doubled prefix. only true if they log the whole error
   object; `err.message` holds it once. the first prefix is node's, and once the class had a name
   it was plainly a fourth member of it

⇒ the word's value is precisely that it makes the class enumerable. with it, the four pieces are
one decision; without it, they were three separate arguments and two wrong calls.

### the dimensional walk

two axes decide what a snapshot does with a byte:

| | the contract HOLDS it | the contract does NOT hold it |
|---|---|---|
| **stable** | snap it | cut it — chrome |
| **volatile** | mask it | cut it — chrome |

the bottom row collapses, and that collapse IS the term: **once a byte is chrome, its stability no
longer matters.** the pre-term instinct read the table down the *volatile* column and reached for
a mask; the term reads it across the *does not hold* row and reaches for a cut.

### the invariant

- chrome is cut, never masked
- a masked token in a contract snapshot asserts the contract holds that value ⇒ to mask chrome
  states a falsehood about the contract
- a cut is sanctioned only where the cut content carries no fact **of this surface** — which is
  exactly what chrome means

## .disputes

none open.

`debug noise` was considered and rejected rather than disputed: it is not a synonym that competes
for one concept, it is an extant term for a **different** concept (subject-authored, versus
harness-authored). to merge them would be an overload, not a rename — so the two coexist, and
`chrome`'s `.what` spells the boundary.
