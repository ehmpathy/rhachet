# F27 · the init readout names the drift's reach, not its size against the threshold

## .the fork

- **a.** init's drift branch names how many revisions were re-written, how many clones refer to
  them, and how many sit outside the drift; the size of one clone's drift is read via
  `rhx clone boot drift --of`, and the nudge where a role declares the hook
- **b.** init also prints the largest drift's line count against the 200 line threshold

## .taken = a

- the editor's question at init is reach: "do my live clones get this?" (case=6). size is a
  per-revision fact, and one actor can hold several revisions of different sizes, so a single
  "largest" line names no clone the editor can act on
- `--of` answers size per clone, with the threshold and the cap, and the hook recipe brief
  (`howto.declare-the-boot-drift-hook`) is the path to a nudge with no editor in the loop
- the pr body states at its top that outcome 3 is the verb plus a role's declaration, not yet
  declared by a role in this repo

## .rework = clean

the sweep already returns each revision's `lines`; one row in `asBrainDirSyncReportLines` that names
the largest against the threshold.

## .confidence = 65%, why

with no role hook declared, an editor reads init and not `--of`, so a large drift between 200 and
2000 lines loads with no word on any channel they watch; the row would be the one signal.

## .where

`src/domain.operations/boot/asBrainDirSyncReportLines.ts`. answers r10.nitpick.7 (level 3, i006).

## .verdict

owed — a council rules at the close.
