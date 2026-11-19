# F14 · one drift renderer serves the inspector and the nudge

## .the fork

- **a.** `asCloneBootDriftLines({ for: 'nudge' | 'inspect' })`, one shared body for the counts and
  size rows
- **b.** two renderers, `asCloneBootDriftNudgeLines` and `asCloneBootDriftInspectLines`

## .taken = a

the two trees share their middle rows (blocks drifted, lines carried, threshold) word for word, and
the readout must say those the same way to a clone and to its editor, or the editor's check and the
clone's nudge disagree on one drift. two renderers duplicate those rows and let them drift apart.
the discriminator decides only the head and the tail.

## .rework = clean

split the file in two; the two callers sit in `invokeCloneBoot.ts`.

## .confidence = 70%, why

`rule.prefer.wet-over-dry` leans to (b) under three callers; the shared rows lean to (a).

## .where

`src/domain.operations/clone/asCloneBootDriftLines.ts`. answers r4.nitpick.3.

## .verdict

owed — a council rules at the close.
