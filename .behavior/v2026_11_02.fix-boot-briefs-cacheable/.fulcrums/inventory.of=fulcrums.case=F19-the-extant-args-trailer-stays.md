# F19 — the extant `[args]` trailer on a cli refusal stays as it is in this tree

## .the fork

a peer read the `[args] init,--roles,…` line in eleven `init.incremental` and `rhx` snapshots as debug
noise. the line is written by `src/contract/cli/emitCliErrorAndExit.ts:41`, the generic top-level
handler, and `invoke.unclassifiedThrow.integration.test.ts` asserts it on purpose ("the `[args]` trailer
still rides along"). none of the eleven lines is in this branch's diff of those snapshots; each one
predates it.

- **A** — leave the trailer; this tree does not touch the cli error handler
- **B** — drop the trailer from the handler here

## .taken

A. B changes a cli surface every unclassified refusal shares, against a test that pins it, in a tree
whose wish is the boot cache. the `[args]` shape is a real ergonomic question for the cli as a whole, so
it is caught as a dream with its owner, never a rider on this change.

## .rework

clean: a change to the handler moves those snapshots in one pass, with no caller here bound to the
trailer.

## .confidence — 85%

the lines are read in the diff against main as untouched; the one judgment is scope.

## .where

- `src/contract/cli/emitCliErrorAndExit.ts`
- `blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap`, `rhx.acceptance.test.ts.snap`
- dream `.dream/v2026_11_04.fix.cli-refusal-args-trailer-reads-as-debug-noise.md`

## .verdict

open, for the fulcrum council
