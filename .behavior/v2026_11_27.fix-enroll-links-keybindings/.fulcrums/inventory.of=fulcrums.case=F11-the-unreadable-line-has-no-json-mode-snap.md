# fulcrum F11: the unreadable line has no `--output json` snap

## .the fork

a peer (5.3, r2) asked for a `--output json` case of the unreadable keybindings line.

- **A** snap the line in tree mode only ([case2g] [t5])
- **B** add a `--output json` case of the same path

## .taken: A

- the line goes to stderr by `console.error`, gated on `result.spawn !== null`, apart from the mode
  branch. the json handoff goes to stdout (`invokeEnroll.ts:908`) and never holds the line
- so a json caller parses the same stdout either way, and the stderr bytes in json mode equal the
  bytes [t5] already snaps
- the grove line, its nearest peer, has the same tree-only snap

## .rework: clean

one `when` in [case2g], with `--output json` and the same masks.

## .confidence: 90%

the residue: a future change that folds stderr notices into the json handoff would need that case,
and would meet the grove line's gap at the same time.

## .where

`src/contract/cli/invokeEnroll.ts`; `blackbox/cli/enroll.acceptance.test.ts` [case2g] [t5].

## .verdict

open — for the commander, with the pr.
