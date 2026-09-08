# fulcrum F6 — `Libc`'s third member keeps `'unknown'`

- **caught** 2026-09-02, i041, mid-`.taken` for the `enroll-impl-arch-defects` r011 nitpick
- **rework** clean · **confidence** 72% · **status** ⚠️ **REVERSED at i042 — see below**
- **where** `src/domain.operations/clone/pty/asLibcFromReport.ts`

## 🚨 .the reversal — the deferral lasted ONE round, and that is the record's whole value

`Libc` now reads `'glibc' | 'musl' | 'unreadable'`. the deferral below was taken at i041 and undone
at i042, on the trigger this entry itself named.

**what triggered it:** the deferral rested on one cost — *"the arch lanes cannot run, so do not add
files to their diff"* — and named its own expiry outright: *"the moment the arch lanes are re-scoped
so they can run, the argument evaporates."*

⇒ **`enroll-impl-arch-defects` ran to approval at i042, and `enroll-impl-behavior-intent` then cited
this very entry back at me** — that the trigger was met, that there was no `.taken` answer to it
anywhere in the trail, and that a 72% confidence is a reason to close rather than to defer a third
time. all three were correct.

**the cost was as estimated:** the type, the transformer, two test files, one consumer. the compiler
found every site, `--what types` passed, and the pty unit suite stayed green at 23/23.

⚠️ **one hazard the rename created, and it is guarded in code.** `getPtyPlatformSupport` now holds
BOTH words on adjacent lines — `if (input.libc === 'unreadable') return 'unknown';` — which reads
like a typo and is not. a comment there names the boundary, because the next reader's instinct will
be to "fix" it.

## .what this entry is worth, now that it is closed

the low confidence was the useful part. at 72% it said *"this is likely wrong within a round"*, and
it was wrong within a round — so the number did its job, and a deferral recorded at 95% would have
read as settled and sat unexamined.

⇒ **a confidence below ~80% on a clean rework is a note that the fork is not settled, only postponed.**

---

# the original entry, as taken at i041

## .the fork, stated fairly

the peer lane found three "honest ignorance" sentinels across two domains and asked for a record so
a fourth instance does not invent a fourth word. the record is uncontroversial. the fork opened
underneath it:

**our own glossary already settled the word, and one extant contract disagrees with it.**

`term=unreadable` names *"the probe ran and established no answer."* `getLibcFromProcess` runs a
real probe — `process.report.getReport()` — against libc itself. so by our own settled term, that
union's third member reads `'unreadable'`, and it currently reads `'unknown'`.

| the option | what it costs |
|------------|---------------|
| **conform now** — rename the member across the type, the transformer, its tests, and 4 consumers | ~8 more changed files, no behavior change |
| **record the rule, defer the member** ← taken | one extant contract stays off the settled word |

## .taken, and why AT THE TIME

the arch review lanes were dark for thirteen consecutive rounds on context overflow — 115 files /
455.3k tokens against a 1M budget — and that bound does not lift on its own. **a rename with no
behavior change would spend the one budget the one gate that cannot run is already short of.**

and the reviewer's own read pointed the same way: it graded this a nitpick, cited
`rule.prefer.wet-over-dry`'s rule of three as the point to **begin observation** rather than to
abstract, and asked to **record**, never to refactor.

⇒ so the durable half was taken in full and the cosmetic half was deferred. the boundary rule that
stops a fourth sentinel is what the ask was actually for, and it is landed:
`term=unreadable._.choice._.md`'s *"the second boundary"* section, plus a dated OPEN dispute in its
`.reason`.

## .why the rework is clean

a rename of a union member with no caller hardened against it. the type is exported from one file,
consumed by four, and every consumer compares it as a literal — so the compiler finds all of them
and a `sedreplace` performs the whole edit. no persisted value carries the word, no snapshot pins
it, and no external contract publishes it.

## .why the confidence is only 72%

the deferral rests on a cost that is real but **transient**. the moment the arch lanes are re-scoped
so they can run — which the reviewer's own process note asks for — the argument against the rename
evaporates and only the glossary violation remains.

⇒ so this is a fork whose right answer likely **changes** with the next round rather than one that
was settled. that is what the percentage records.

## .the verdict

**ruled at i042 — the rename was taken.** the deferral held for exactly one round, and the peer lane
that made the trigger true is the same one that called it in.
