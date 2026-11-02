# F8 — init's ambient focus lives in `actor.via.repo=ambient/roles.foci.json`

## .the fork

`rhx init --roles mechanic::101` must remember the focus, so the repo actor's `boot.md` and every
bare enroll render mechanic at `101`. a link is a whole role dir, so the link cannot carry it.
three homes:

- (a) a record in the repo actor dir, `actor.via.repo=ambient/roles.foci.json`, shaped
  `{ role: subjects[] }`
- (b) read the focus back from `prepare:rhachet` in `package.json`
- (c) a marker inside the linked role dir (`.agent/repo=X/role=Y/`)

## .taken — (a), and why at the time

the ambient roleset is the repo actor's config, and an actor owns its config
(`catalog.of=actor-clone-design`), so its focus lives in its dir. (b) makes every enroll parse
`package.json` and couples the render to the install replay, which `--prep` may omit. (c) writes
into a symlink target that a package owns (`define.invariant.a-symlink-under-agent-is-foreign`).

an exact `--roles` set replaces the record; a delta upserts or drops each named role (F6). the
write holds the file mutex and lands only on a change.

## .rework — clean

one reader (`getRepoAmbientRoleFoci`) and one writer (`setRepoAmbientRoleFoci`). a move to
another home swaps those two; the render, the enroll, and the delta re-derive read through the
reader alone.

## .confidence — 75%, and why it is low

the vision left this home open, so it was settled here in execution. the actor dir is
per-worktree and gitignored, so a fresh clone of the repo holds no focus until `rhx init` runs;
`prepare:rhachet` replays that init on install, which closes the gap, but only where `--prep`
was used.

## .where

`src/domain.operations/roles/focus/ambient/` · `invokeInit.ts` · `invokeEnroll.ts` ·
`setRepoActorBrainDir.ts` · `setDeltaActorsOndisk.ts`

## .verdict

open.
