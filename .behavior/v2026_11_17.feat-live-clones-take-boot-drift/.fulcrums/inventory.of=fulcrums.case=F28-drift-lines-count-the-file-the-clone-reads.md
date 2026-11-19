# F28 · drift lines count the rendered file the clone reads, header copy included

## .the fork

- **a.** `lines` is the line count of the rendered drift `CLAUDE.md`, copy included, so the nudge
  threshold and the cap measure the very file the brain cli loads as memory
- **b.** `lines` is a property of the delta (the carried block lines), apart from the render, so a
  copy edit moves neither the threshold nor the file bytes

## .taken = a

- the threshold exists because a memory file past ~200 lines costs adherence; what costs adherence
  is the file loaded, header and all, so the honest count is of that file
- a copy edit changes the file the clone would load, so a rewrite of every drift on a copy edit is
  correct, not waste: the bytes on disk must match what the reader expects
- the header is a handful of lines against a 200 line threshold; it moves the edge by a few lines,
  never by a class

## .rework = clean

count the block lines in `asBootDelta` and add the header's fixed size at render; one function moves.

## .confidence = 75%, why

the split is cleaner as code, and a reader who thinks of `lines` as "how much changed" will be
surprised by the header's few lines.

## .where

`src/domain.operations/boot/asBootDelta.ts`. answers r11.nitpick.9 (level 3, i006).

## .verdict

owed — a council rules at the close.
