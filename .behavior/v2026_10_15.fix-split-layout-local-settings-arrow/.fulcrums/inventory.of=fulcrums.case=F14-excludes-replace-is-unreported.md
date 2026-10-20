# F14 — the `claudeMdExcludes` replace in `settings.of.repo.json` names each entry it drops

## .the fork
- A: keep the whole-key replace, and report each prior entry it drops as a row under
  `🧠 brain://repo=ambient`
- B: manage only the entries rhachet derives, and leave a human's own entries in place
- C: keep the whole-key replace, unreported — rhachet owns the key, as enroll does at spawn

## .taken = A, and why
- rhachet still owns the key: `settings.of.repo.json` is derived from the repo's roles, and B cannot
  drop an entry rhachet itself no longer derives, so a stale exclude would live forever
- but a hand-added exclude is a human's work, and a silent drop of it is the loss "never silent"
  forbids. A keeps the owner and names the loss
- the first pass took C for its cost (a second report site); peer r1 blocker.2 named that a
  deferral of small found work. the cost was one list threaded the way `settingsReplaced` already
  travels

## .what landed
- `setRepoActorClaudeMdExcludes` returns `excludesDropped` — each prior string entry the derived
  list lacks; an entry rhachet still derives is not named
- the pre-inits step runs the excludes before it prints, so one tree names the arrows and the drop;
  a code defect in the excludes is held until the arrows are named, then thrown
- the boot sync carries the same list to its report, for a bare `rhx init` / `--hooks`
- the row: `unexcluded` / `<entry> — a claudeMdExcludes entry rhachet does not derive; rhachet owns
  this key, so it was dropped`

## .the clamps
- `setRepoActorBrainDirLayout.integration.test.ts` [case4][t1] — the hand entry is named, a derived
  one is not, a second run drops naught; [case7] — stdout names it, snapshot
- `asBrainDirSyncReportLines.test.ts` [case9] — the drop alone is news; snapshot

## .rework = clean
drop the group in `asBrainDirLayoutReportGroups` and the list goes quiet again; no other contract
reads it.

## .confidence = 85%, low because
the row names no place a durable exclude can live: no role mechanism writes `claudeMdExcludes` today,
so the human learns of the loss but not of a home for the entry.

## .where
`src/domain.operations/init/boots/setRepoActorClaudeMdExcludes.ts` ·
`src/domain.operations/init/boots/setRepoActorBrainDirLayout.ts` ·
`src/domain.operations/boot/asBrainDirLayoutReportGroups.ts`

## .raised by
r011 enroll-impl-arch-defects, i005 nitpick.4 · 5.3 peer r1 blocker.2

## .verdict
owed — for the wisher at the close.
