# F12 — defer the DEAF-clone reach branch, on SCOPE, though the seam is one boolean

- **rework** = clean
- **confidence** = 82%
- **status** = ⏳ open — deferred at i074
- **where** = `src/contract/cli/invokeEnroll.ts` (the emit) ·
  `src/domain.operations/clone/asCloneReachBreadcrumb.ts` (the text)
- **dream** = `.dream/2026_09_06.reach-branch-fires-on-a-clone-that-cannot-hear.md`

## .the fork, stated fairly

the wisher's 2026-09-06 verdict split the enroll breadcrumb into a treestruct. that split
exposed an inaccuracy the fused one-liner had concealed: the BRANCH claims
`reachable at: rhx clone say …` on **every** tree-mode enroll, even one whose clone stood up
DEAF.

so the fork is:

| option | what it costs |
|---|---|
| **A — fix it now.** thread `socketEligible` into `asCloneReachBreadcrumb` and swap the branch for a DEAF variant | a second unit `given`, a second acceptance case, a new snapshot, and a glyph settled against the catalog |
| **B — defer it.** ship the treestruct as ruled, catch the defect as a dream | the inaccuracy stays live one more round, in the piped case only |

## .taken, and why AT THE TIME

**B.** the reason is scope, and it is the same reason F10 carries — stated as weakly as it
deserves rather than dressed up:

the diff is near ~293 files with zero commits on the branch, so `--diffs since-main` unions the
whole staged+untracked set. **9 of 11 review lanes have already overflowed their context window
and returned dark.** every artifact authored to answer a reviewer enlarges the diff that blinds
the next one, and that loop is itself the subject of a live escalation
(`blocker/5.1.execution.from_vision.md`).

option A is small in *source* and not small in *artifacts* — it adds a user-visible branch, and
this repo's own rules make a user-visible branch owe a unit case, an acceptance case, and a
snapshot. that is four new files' worth of diff to close a defect that **predates this branch**.

🚨 **the honest counter, recorded because it is strong:** I authored the treestruct that made
this visible, in this round, at the wisher's request. so *"it predates the branch"* is true of
the DEFECT and not of my ATTENTION — I found it here and chose not to close it. that is a
weaker position than F10's, whose subject was another module entirely.

## .rework, and why

**clean.** the seam is one added input on a transformer whose every caller is one line in
`invokeEnroll`. the extant unit file already locks the exact text of both rows, so the DEAF
variant lands as a fourth `given` beside the extant three. no caller hardens against the
current signature; no later work is built upon it.

⚠️ **and the F7 lesson is applied BEFORE the grade is filed, per F10's precedent.** the first
instinct was `dirty` — on the impression that a new branch means a wide fanout. it is not: a
grep of the transformer returns exactly two consumers (the emit, and its own unit file), and the
acceptance layer reads the line by string rather than by import. **measured, not assumed.**

## .confidence, and why it is 82%

the SCOPE fact is measured (~293 files, 9 dark lanes — both from the guard's own stamp). the
REWORK grade is measured (two consumers, by grep). what is **not** measured is the judgment that
four new artifacts would materially worsen the dark-lane condition rather than round to noise.

⇒ that last step is an estimate, and F7 is the extant caution about exactly this shape: a cost
estimate written once and never re-measured is what manufactures the permission to defer.
**the number is 82% because the third step is the un-measured one, and it is named as such.**

## .the expiry condition

this row reverses the moment **either** holds:

1. a commit quota is granted, so `since-main` narrows and the dark-lane pressure lifts — the
   scope argument then evaporates entirely, and option A should just be taken
2. a reviewer cites the two-channel disagreement as a blocker — in which case the deferral was
   wrong and the dream is the repair spec

## .the verdict

⏳ open.
