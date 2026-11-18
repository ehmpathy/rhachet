# F22 — mods composes the boot, brains and link reads; it never reimplements them

## .the fork

the r005, r010 and r011 peer lanes of i003 read the mods subdomain as a scope leak. they flag:

- `mods/` imports the boot, brains and link reads (the boot spec parser, the hook reader, the
  linked refs), and the boot and cost paths import `mods/` back
- the view sync walks every linked role of the repo, not just the roles of the actor in render
- the hook reader loads the role packages, which an unmodded render never needs
- `run --skill` on the bun fast path reads the view on disk and never calls the sync
- the onStop hook throws a second error after its readout, as the budget gate does

the choice: **a — mods composes the extant reads, and each surface calls one sync** (taken), or
**b — mods owns copies of the reads it needs, and each caller syncs only its own roles**.

## .taken, and why

a. a mod changes a role dir that every actor of the repo shares, so its view is one artifact per
repo, never one per actor (`rule.forbid.per-clone-config`). a sync scoped to one actor would leave
the other actors over a view that disagrees with the mod. so the sync is repo-wide by design.

a copy of the boot parser or the hook reader inside `mods/` would be a second path that drifts from
the first. the mods code calls the same reads the boot calls, so a mod sees the role exactly as the
boot sees it.

the cost is bounded where it would bite:

- an unmodded repo takes no lock and loads no package (`syncRoleModdedViews`, the `isRepoModded`
  guard)
- the hook reader loads the role packages only when a mod nots a `skills/` path, and the import is
  lazy (`rule.require.thinnest-import-path`)
- `run --skill` reads the per-file links on disk, which the last render wrote; a stale view fails
  the boot and the cost sweep, so the bun path needs no sync of its own (F13, F14)
- the second error of the onStop hook gives the exit code the hook contract reads, after a readout
  a human scans; it mirrors the budget gate on the same hook

## .rework

clean. a later split moves the imports behind one port; no contract moves.

## .confidence — 85%, and why it is low

- the repo-wide sync is reasoned from the sync invariant, never timed on a repo with many roles
- the bun fast path relies on the last render; a hand edit of the view between renders is caught by
  the boot, not by `run --skill`

## .risk

low. no credential, no prod write. the worst case is a slower render on a repo with mods.

## .where

- `src/domain.operations/mods/syncRoleModdedViews.ts`
- `src/domain.operations/mods/getAllRoleModDriftsOfSoundMods.ts`
- `src/contract/cli/invokeRolesCost.ts`

## .verdict

open. taken in execution and flagged for the commander's review of #702.
