# fulcrum F15 — defer `execUpgrade`'s per-class hook policy, on a SURVEY cost

- **taken** = 2026-09-07 (i076), appended at the moment the deferral was made
- **rework** = **clean⇢dirty, per survey** — and that is the point of this entry
- **confidence** = 71%
- **status** = ⏳ open — deferred

## .the fork, stated fairly

r011 raised that `execUpgrade` hands one `lifecycleHooks: 'skip'` to an install list of three
package classes, only one of which is surveyed. the fork:

| option | what it costs |
|---|---|
| **A — fix it now** | survey three brain packages' hooks, then carry the policy per package and split the invocation by policy |
| **B — defer with a dream (taken)** | the gap stays open for a *future* package inside an extant class; the present risk is measured at naught |

## 🚨 .why the `rework` grade is UNDETERMINED, and why that is the honest entry

F7's lesson on this inventory is that a `dirty` grade is what **manufactures the permission to
defer**, so an unmeasured `dirty` is worse than no grade. I nearly filed this row `dirty` on the
step-3 ripple (*"one install becomes up to two, and ~8 `packages:` assertions in
`execUpgrade.test.ts` move"*).

⚠️ **that grade would have been an artifact of an assumption, not of the fork.** step 3 exists only
if the survey finds a class that needs `run`. if the survey confirms `skip` for all three, the entire
fix is step 4 — **add a clamp** — and the rework was **clean** the whole time.

⇒ so the grade is stated as a **function of an unrun measurement**, never as a number I do not have:

```
survey says "skip is right for all three"  ⇒  rework = clean   (a clamp, no behavior change)
survey finds a class that needs "run"      ⇒  rework = dirty   (split install, ~8 assertions move)
```

## .what the deferral ACTUALLY rests on

**not the ripple. the survey.** `execUpgrade.ts`'s own note already draws this line, verbatim:

> *"`skip` is retained for them only because it is the extant behavior and a change here belongs to
> its own drive with its own evidence, never to a rider on this one"*

⇒ a survey of third-party brain-package lifecycle hooks is a research task with its own evidence
bar, and it is unrelated to node-pty's install. to fold it into this wish would be a scope leak
whichever way it came out.

## .the counter-argument against my own deferral

stated per F12's precedent, because a scope justification must earn its weight:

🔴 **the defect class is the one this whole wish exists to retire.** node-pty was broken on linux
because a build hook that was needed did not run and nobody was told. to close that instance while a
twin instance stays open, one file away, is a genuinely uncomfortable position — and *"it belongs to
its own drive"* is the same sentence anyone would have written about node-pty a month ago.

**what makes the deferral hold anyway**, and it is a measurement rather than a preference:

- the one class that carries a live hook (`rhachet` → node-pty) is proven a **no-op** by `[case7]` of
  `getPtyModuleOrNull.consumer.integration.test.ts`
- the other two declare **no hook at all** in the packages currently shipped
- so the gap is a **future** package, never a present one — where node-pty's was live and shipped

⇒ the risk is real and it is **latent**, and the difference between latent and live is exactly the
difference between a dream and a fix on this drive.

## .the expiry condition — stated as a command, per F6 and F13

this deferral is not open-ended. it closes the moment either fires:

```sh
# 1. the survey — the cheap half, and the half that decides the grade
rhx git.repo.get lines --repos 'ehmpathy/rhachet-brains-*' --paths 'package.json'
```

2. **or: a fourth package class, or a new brain package, enters `buildInstallList`.** the type forces
   a reader past the note for a new *class*; a new package *inside* a class is the case that does not,
   and it is the trigger this entry exists to catch.

## .where

- `src/domain.operations/upgrade/execUpgrade.ts` — the note beside `lifecycleHooks: 'skip'`
- `.dream/2026_09_07.upgrade-applies-one-hook-policy-to-three-package-classes.dream.md` — the work
- `…r011._.taken.by_self.enroll-impl-arch-defects.md` — nitpick.1, where the fork was raised

## .the verdict, once ruled

⏳ open.
