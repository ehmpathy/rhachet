# F22 · the drift command's two arms keep their own serial-to-clone lookup

## .the fork

- **a.** `runInspect` and `runHookOnStop` each look up serial → repo → clone → dirs in the contract
  file, with `asCloneDirs` beside them
- **b.** one domain lookup for "the clone of this process", shared by every clone verb

## .taken = a

the lookup is shared with `clone whoami`, `clone say` and others that this pr does not touch. one
lookup for all of them is a rename across files and contracts, which fails the CLEAN test of
scouts-honor in a fast follow. it is caught as a dream
(`one-resolver-for-the-clone-of-this-process`), with the shape of the fix.

## .rework = clean

the two arms call the shared lookup once it lands; `asCloneDirs` moves with it.

## .confidence = 85%, why

the dream is caught; the only doubt is that a third copy appears before it lands.

## .where

`src/contract/cli/invokeCloneBoot.ts`. answers r11.nitpick.2 (level 3, i004).

## .verdict

owed — a council rules at the close.
