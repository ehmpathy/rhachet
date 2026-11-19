# F30 · the clone layer's path and dir-test owners are left as found, not unified in this pr

## .the fork

- **a.** leave `join(actorDir, 'clones')` hand-joined at its four sites, `isCloneDirEntry` beside
  `asCloneSerialFromDirName`, and `getOneBootDriftFileContent` in `boot/`, as found
- **b.** add a `getActorClonesRootDir`, retire one of the two clone-dir tests, and move the file
  read to a neutral home with a neutral name, in this pr

## .taken = a

- three of the four joins, and both clone-dir tests, sit in clone files this pr does not touch;
  a pull-in would move callers across the clone layer inside a feature about boot drift
  (`rule.always.fix-forward-under-scouts-honor`: safe, not clean)
- the one join this pr owns (`getOneActorBootDriftReach`) names a fault path, not a read path;
  it joins once and reads naught there
- the file read serves the drift reader and its clone records; its name says what it reads for
  today. a neutral home is a rename across both layers, a clean follow-up

## .rework = clean

one getter, four call sites, one import move. no behavior moves.

## .confidence = 80%, why

the rename is cheap enough that a reviewer may judge it in scope; it would not move a test.

## .where

`src/domain.operations/clone/` (`getAllClonesForActor`, `getAllCloneDirsForActor`, `getCloneDir`),
`src/domain.operations/init/boots/getOneActorBootDriftReach.ts`,
`src/domain.operations/boot/getOneBootDriftFileContent.ts`. answers r11 item 9 (level 3, i007).

## .verdict

owed — a council rules at the close.
