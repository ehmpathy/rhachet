# F26 · the drift sweep re-parses each revision on each render, with no current-boot stamp

## .the fork

- **a.** each render re-computes every revision's delta and skips only the write when the bytes on
  disk match; the skip by a stamp of the current boot hash is caught as a dream
- **b.** stamp each revision with the current boot hash it was computed against, and skip the parse
  when it matches

## .taken = a

- one delta of a 441KB boot costs ~31ms, and a repo holds one revision per distinct boot a clone
  spawned on; at today's counts the sweep adds tens of milliseconds to a render
- the stamp adds a third file to each revision, where F23 holds the layout at two, and a second fact
  the reader must keep in step with the drift
- the count is bounded: `rhx clone prune --mode apply` reaps each revision no clone refers to;
  the stamp is caught as `v2026_11_18.feat.boot-drift-sweep-skips-a-revision-stamped-current`

## .rework = clean

one stamp file per revision, one read before the parse in `setActorBootDrift`; no contract moves.

## .confidence = 70%, why

the cost at hundreds of revisions is extrapolated, not measured; a long-lived repo that never runs
`clone prune` could reach it.

## .where

`src/domain.operations/boot/setActorBootDrift.ts`, `setActorBootDrifts.ts`. answers r10.nitpick.6
(level 3, i006).

## .verdict

owed — a council rules at the close.
