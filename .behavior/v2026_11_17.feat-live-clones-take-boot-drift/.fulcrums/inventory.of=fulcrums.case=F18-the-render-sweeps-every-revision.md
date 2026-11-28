# F18 · the render sweeps every boot revision, not only the ones a clone ref names

## .the fork

- **a.** `setBrainDirBoot` writes the actor's revisions and sweeps the drift of each, and init joins
  the clone refs afterward
- **b.** the render returns only the render; one init-layer operation reads the live clone refs and
  writes the drift of each revision a ref names, called from enroll, `setRepoActorBrainDir`, and
  `syncActiveActorBrainDirs`

## .taken = a

the cost b saves is measured small. the delta parses each boot once (`asBootPartition`). a 1,000
block, 500KB boot measured 31ms per revision (`asBootDelta.test` case7), and the sweep reads the
current boot once for all of them (`setActorBootDrifts`). b moves the drift write across three
callers and adds a clone read to the render path, which the boot layer is built to avoid (it reads
no clone). the hazard the reviewer named inside a, a clone spawned between the sweep and the report,
is cured within a: the reach reads the revision dirs from disk at join time
(`getOneActorBootDriftReach` case2b).

## .rework = clean

the sweep's input changes from "every revision dir" to "the revision hashes the refs name". one
caller-side join and one new parameter. no contract a human sees changes.

## .confidence = 70%, why

the cost grows with revisions until they are reaped, which only a dream covers today. past some
count, b (or the reap) is owed. no measure of a real actor's revision count exists yet.

## .where

`src/domain.operations/boot/setActorBootDrifts.ts`, `src/domain.operations/boot/BrainDirBootRender.ts`.
answers r11.blocker.3 (level 3, i004).

## .verdict

owed — a council rules at the close.
