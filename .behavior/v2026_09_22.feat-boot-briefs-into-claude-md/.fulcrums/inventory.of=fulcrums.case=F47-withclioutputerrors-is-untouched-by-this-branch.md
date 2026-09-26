# F47 — `withCliOutputErrors.integration.test.ts` is untouched by this branch

| field | value |
|---|---|
| **status** | **DISPUTED** — peer i006 r10.blocker.1 + r10.blocker.2 refuted with a measurement |
| **rework** | clean — a dispute is an argument; it edits no code and reverses with one line |
| **confidence** | 97% — four independent git reads agree, and each is re-runnable |
| **lands** | `blackbox/…/withCliOutputErrors.integration.test.ts` · its snapshot · `withCliOutputErrors.ts` · `asCliErrorFrame.ts` (all unchanged) |

## .the fork stated fairly

peer lane `enroll-verif-snapshot-coverage` (i006 `0eacd307c4aa8b87b7` r010) raised two blockers
against the error-frame surface — a snapshot it holds is absent, and a case it holds is
under-covered — both anchored on `withCliOutputErrors.integration.test.ts` and its subject.

the concern each names is real **as a property of that surface**. the fork is whether **this
branch** is the change that owes it.

## .taken, and why

**it is not.** the file, its snapshot, and its subject are byte-identical to `main`. a change
that touches none of a surface's bytes does not inherit that surface's extant coverage debt —
the debt belongs to whoever last wrote it, and to the repo, not to whichever branch a reviewer
happens to read it under.

⇒ absorbed as **disputed**, not conceded.

## .the measurement — four re-runnable git reads

**1. the file is tracked and clean.**

```sh
git status --porcelain -- blackbox/**/withCliOutputErrors.integration.test.ts   # empty
git ls-files -- blackbox/**/withCliOutputErrors.integration.test.ts             # one row
```

**2. it is byte-identical to `main`.**

```sh
git diff --stat origin/main -- blackbox/**/withCliOutputErrors.integration.test.ts   # empty
```

**3. its snapshot is untouched too**, so the clamp the lane wants added is not one this
branch loosened.

**4. its subject is untouched.** `withCliOutputErrors.ts` and `asCliErrorFrame.ts` are both
absent from this branch's dirty list.

## .why the lane could reach a file outside the change

a level-3 `rhx enroll` lane carries **no `--paths-with`** — its whole scope is a prompt. the
inherited-bind guarantee (`getAllFileDiffsFromRange.ts` prefers `origin/main`, then takes
`git merge-base`) constrains a lane that declares a bind; it cannot constrain one that declares
none. so this lane's reach is not evidence of a defect on its part, and what it reported is not
evidence of one on ours.

⚠️ the lane's own stdout states it *"delegated the exhaustive file-by-file sweep to a
sub-agent"*, which is why each cited path was checked against git rather than taken on report.

## .what this does NOT dispute

r10.**blocker.3** is **conceded**, and repaired. `[case16]` in `upgrade.acceptance.test.ts` is
ours — the frame it renders reaches the human only because this branch widened `invoke.ts`'s
catch to `HelpfulError` — and it held seven pointwise asserts with no whole-render pin while
both its siblings snapshot. one `toMatchSnapshot()` now sits **beside** those seven, never in
place of them.

⇒ the scope argument is not a blanket refusal. it is applied per concern, and the one concern
inside the change's bytes was taken.

## .what would overturn it

a measurement that this branch does edit that file, its snapshot, or its subject — or a wisher
verdict that a branch inherits the extant coverage debt of every file a reviewer reads under
it, regardless of whether it touched one byte.
