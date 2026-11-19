# F19 · the drift reader re-derives the delta, not a persisted drift record

## .the fork

- **a.** the writer persists the drift markdown only; the reader re-computes the delta from the
  revision's boot and the actor's boot, and holds it against the file
- **b.** the writer persists `{ drift, lines, counts, outside, bootCurrentHash }` beside `CLAUDE.md`;
  the reader checks one hash

## .taken = a

a holds one source of truth: the two boots. the drift file is a render of them, and the reader's
re-derivation is the check that the render reached it, which is the stale fault. b adds a second
artifact that must agree with the first and must be written under the same lock, so it adds a state
(record and markdown disagree) that a cannot reach. the cost a pays is one delta per stop of one
clone, measured at 31ms for a boot-sized corpus (`asBootDelta.test` case7).

## .the case against a, added at i005

the drift hash is the hash of the rendered markdown, so a release that edits the renderer's copy (a
title line, the outside-the-briefs text, the cap) marks every extant drift file stale, and moves the
`drift = <hash>` a clone is told to hold, so the told-latch fires again. b, or a hash over the
structured delta, would hold the identity across such a release.

the window is bounded: a package bump runs `prepare:rhachet`, which runs `rhx init`, and every
`rhx enroll` re-renders; each re-writes every revision's drift under the new renderer. so the stale
fault lives from the bump to the next init, and a second nudge per clone is the cost of a renderer
change, which is rare.

## .rework = clean

add one json file per revision and split `asBootDelta` into compute and render. the readout,
command, and hook contracts do not change.

## .confidence = 70%, why

if the stop hook's latency is ever felt on a large actor, b is the cure. not measured on a live
stop.

## .where

`src/domain.operations/clone/getOneCloneBootDrift.ts`, `src/domain.operations/boot/setActorBootDrift.ts`.
answers r11.blocker.5 (level 3, i004) and r11.blocker.2 (level 3, i005).

## .verdict

owed — a council rules at the close.
