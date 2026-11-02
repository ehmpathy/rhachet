# F1 — every real-tui clamp survives, folded into one shared session

## .the fork

- (a) a minimal set: tui reach, memory load, dead login, sdk door. the probe suites retire, their
  findings imitated by mock modes
- (b) keep all 6 realbrain suites as they are, each with its own boot
- (c) keep every clamp the realbrain suites carry, but fold the tui clamps (multi-turn reach, bulk
  say, queued say, screen read) into one shared real-haiku session; memory load, dead login, and
  sdk door keep their own spawn
- (d) a single smoketest: the joker reach round-trip alone

## .taken

(c). (a) was the first guess, and a read of each probe's docblock refuted it: `saybulk-probe`,
`transcript-lag`, `modalprobe`, and `screen-dogfood` are not measurements to retire — each clamps a
real-tui behavior rhachet's design rests on, and `transcript-lag` clamps it both ways. to retire
them drops a guarded behavior (`rule.forbid.dropped-behavioral-requirements`). (c) keeps every
clamp and cuts the cost the wish is about: six boots become one, on haiku.

## .rework

clean — a clamp moves between the shared session and its own suite without a change to what it
asserts.

## .confidence — 70%

the shared session couples the clamps: one wedged turn can fail the rest. the joker suite already
runs 5 turns in one boot, so the shape is proven, but a longer walk widens the blast radius. the
wisher may also count "essential" smaller than seven seams.

## .where

`1.vision.yield.md` — `### the smoketest set`

## .verdict

ruled 2026-11-02 by the director: taken as best-guessed. the real-terminal checks stay smoketests, in one shared haiku session. a live brain is reached only by precommit guards and acceptance smoketests (seed S1).
