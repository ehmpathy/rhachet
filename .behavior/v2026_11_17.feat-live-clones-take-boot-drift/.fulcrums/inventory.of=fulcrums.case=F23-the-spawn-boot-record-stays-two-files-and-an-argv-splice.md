# F23 · the spawn boot record stays two files and an argv splice

## .the fork

- **a.** `genCloneBootRevisionForSpawn` marks a resume, findserts the revision, writes the ref, and
  splices `--add-dir` into the argv the contract layer built; the record is `boot.spawned.ref` or
  `boot.spawned.resumed`, and readers test for each file
- **b.** the op returns `{ args, boot: none | resumed | { hash } }`; `genCloneOndisk` writes one
  `boot.spawned` record and keeps the only staged-dir reap; `asBrainCliSpawnArgs` and
  `asBrainCliSpawnEnv` take `boot` and build the argv once, with no string search

## .taken = a

b is right, and it is one restructure across the spawn path: the contract layer's argv build, the env
build, the clone record writer, the drift reader, and the five sites that test for the boot flag. it
moves files and contracts that callers outside this pr read, so it fails the CLEAN test of
scouts-honor in a fast follow due today. a is correct as it stands: each state is written by one op
and read by one getter (`getOneCloneBootDrift`), and the tests hold each of legacy, resumed, and ref.

## .rework = clean

the record and the argv are internal to the spawn path; no human or role reads either file by name.
b lands as one pr with no data migration: a reader that meets the two-file form reads it once, and
the next spawn writes the one-record form.

## .confidence = 75%, why

the restructure is plainly better; the doubt is only whether the commander wants it in this pr, not
whether it is owed.

## .where

`src/domain.operations/clone/genCloneBootRevisionForSpawn.ts`, `asBrainCliSpawnArgsWithBootRevision.ts`,
`getOneCloneBootDrift.ts`. answers r11.nitpick.1–3 (level 3, i005).

## .verdict

owed — a council rules at the close.
