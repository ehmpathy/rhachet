# F11 — the hook-sync block snapshot keeps its joined form

## .the fork

review r6 nitpick.2: `asEnrolledActorsHookSyncLines.test.ts` snaps `lines.join('\n')`, while
`asBrainDirSyncReportLines.test.ts` snaps the line array. switch the new `[case6]` and `[case7]` to
the array form, switch the whole file, or keep the joined form.

## .taken, and why at the time

keep the joined form. the four extant snapshot cases in that file, all on `origin/main`, snap the joined
string; a new case in the array form would split one file across two shapes, the same blemish the
reviewer names, moved one level down. a switch of the whole file rewrites four extant snapshots
that this pr has no other reason to touch. every new case also asserts its exact line array with
`toEqual`, so the tree shape is legible in the test itself.

## .rework — clean

a switch is one `.join('\n')` removed per case plus a resnap, in a pr of its own or this one.

## .confidence — 85%

## .where

`src/domain.operations/init/hooks/asEnrolledActorsHookSyncLines.test.ts`

## .verdict

unruled.
