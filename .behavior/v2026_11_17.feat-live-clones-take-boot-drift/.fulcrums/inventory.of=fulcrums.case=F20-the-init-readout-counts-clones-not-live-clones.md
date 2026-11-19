# F20 · the init readout counts clones that refer to a revision, not live clones

## .the fork

- **a.** the readout says how many clones refer to the revisions it rewrote, live or dead
- **b.** the readout splits live from dead, via `getOneCloneLiveCountForActor`, as vision case=6
  sketched

## .taken = a

the liveness count probes each clone's socket. init renders every actor dir in a repo, so b adds a
socket probe per clone to every `rhx init`, on the path `rule.require.thinnest-import-path` and the
render's latency guard. a dead clone with a ref is harmless to count: the line tells the human that
clones exist which a compaction can update, and `rhx clone list` names which are live.

## .rework = clean

one call per actor in the reach, and one readout variant. no file layout changes.

## .confidence = 65%, why

the vision named the split; a human who reads "3 clones" when 0 are live could act on a wrong
belief. the copy says "refer to", never "live", so it does not claim more than it knows.

## .where

`src/domain.operations/init/boots/getOneActorBootDriftReach.ts`,
`src/domain.operations/boot/asBrainDirSyncReportLines.ts`. answers r11.blocker.7 (level 3, i004).

## .verdict

owed — a council rules at the close.
