# F1 — the local arrow goes in every actor dir

## .the fork
- A: the arrow only in the repo actor's brain dir (the wish: "scope it to the repo actor")
- B: the arrow in every actor's brain dir, via the one layout findsert

## .taken = B, and why
`rule.forbid.brain-dir-layout-divergence` grades a repo-actor-only file as a blocker, and one layout
means one code path. the wish's reason for A is that the arrow is dead weight in a clone's dir. that is
true, but a symlink costs no reads: claude reads the local layer relative to the cwd, never the config
dir, and every clone spawns with `--setting-sources user`.

## .rework = clean
A is one branch on the repo actor in `setRepoActorBrainDirLayout`, or a flag on the op. no caller hardens
against B.

## .confidence = 85%, low because
the wish states A explicitly. B overrides a stated scope on the strength of a repo rule the wish's author
may not have weighed.

## .where
`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`

## .verdict
B, ruled by the wisher, 2026-10-16. the "dead weight" premise above is struck: every plain `claude` is
an ambiently enrolled clone of the repo actor (`define.invariant.unenrolled-claude-is-ambiently-enrolled`)
and loads the arrow, so it is live where clones run by default.
