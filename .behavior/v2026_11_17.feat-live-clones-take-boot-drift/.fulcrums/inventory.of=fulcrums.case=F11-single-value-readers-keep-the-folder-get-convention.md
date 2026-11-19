# F11 · the new single-value clone readers keep the folder's bare `get*` names

## .the fork

- **a.** `getCloneBootSpawnedRef`, `getCloneBootDriftTold`, `getCloneBootDrift`,
  `getCloneBootDriftFileContent`, `getActorOndiskDirOfBrainDir` — the bare `get*` the clone and actor
  folders already use for one-value path and ondisk reads (`getCloneDir`, `getActorOndiskDir`,
  `getBrainOndiskDir`, `getCloneDirOfSerial`)
- **b.** rename each to `getOne*`, per `rule.require.get-set-gen-verbs`

## .taken = a

the rule names the cardinality, and the folder already settled the grain: every path and ondisk
reader beside these is a bare `get*` that returns one value. rename only the five new ones and the
folder reads two conventions for one grain, which is the drift the rule exists to stop. a sweep of
every extant reader is a contract change across the repo, out of this pr's scope. the one name that
hid two kinds of value, `getActorBootRevisionDir` with a null hash for the root, is split
(`getActorBootRevisionsRootDir`), which was the case the reviewer named worst.

## .rework = clean

five file renames and their call sites, mechanical; no published contract names them.

## .confidence = 70%, why

the rule is plain and these are new names; a council may prefer the rule over the folder.

## .where

`src/domain.operations/clone/`, `src/domain.operations/actor/enrolled/`. answers r4.blocker.2.

## .verdict

reversed to b at peer review, round 2: the clone folder already holds `getOneCloneByRef` and
`getOneCloneHydrated` for entity reads, so the folder's grain is a bare `get*` for a path and a
`getOne*` for a read. the four file readers became `getOneCloneBootSpawnedRef`,
`getOneCloneBootDriftTold`, `getOneCloneBootDriftFileContent`, `getOneCloneBootDrift`, and the init
join became `getOneActorBootDriftReach`. `getActorOndiskDirOfBrainDir` stays: it derives a path.
