# F10 — the extant defensive essays a review cites stay; this pr trims only its own

## .the fork

a peer review (repo-rules, r001 blocker.3) cites defensive-essay docblocks in five files. the
diff against `origin/main` shows every cited block is extant: the `"` terminator note in
`invokeRhachetCliBinary.ts`, the `kill` allowlist note in `spawnRhachetCliBackground.ts`, the
`[case4]` table in `genBrainCliPtyClone.integration.test.ts`, the file header of
`asSnapshotSafe.test.ts`, the pty-device note in `genBrainCliPtyClone.ts`. this pr added one
essay of its own (the group-signal note on `kill`). the pr may trim all of them, or its own.

## .taken, and why

trim its own (the group-signal note now states the escalation in present tense), and leave the
extant blocks. `rule.forbid.defensive-essay-docblocks` binds what a change writes; a rewrite of
comments the change did not touch is the bulk sweep `rule.prefer.scouts-honor` bounds to "small,
in scope". five essays across two domains (the snapshot mask, the pty clone) are neither, and
each moves a line a reviewer of #748 would then have to read.

## .rework

clean — a follow-up pr that trims the five blocks, with no code change.

## .confidence — 80%, why not higher

scouts-honor asks for a small fix in a file one touches, and four of the five files are touched.
a reader may hold that a trim of a block in a touched file is in scope.

## .where

the five files above.
