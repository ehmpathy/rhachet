# F38 — a communicator keeps its i/o branches inline

## .fork

peer r4 (decomposition) asked that three operations split their filesystem or process i/o out of
their decision branches:

- `init/boots/setRepoBrainDirSymlink` (blocker.2)
- `boot/setBrainDirBoot` (nitpick.1)
- `enroll/assertBrainCliVersionFloor` (nitpick.2)

| option | |
|---|---|
| a. hold | each is a communicator: its branches ARE i/o outcomes. the pure decisions are already named leaves |
| b. split | one leaf per branch (create, rewrite, migrate; write, point; probe verdict, floor error) |

## .verdict — TAKEN (a), 80%, rework clean

the compute and the reusable writes each one needs are already extracted, each with its own test:

| operation | its named leaves |
|---|---|
| `setRepoBrainDirSymlink` | `asRepoBrainDirMigrationPlan` — what drops, moves, collides |
| `setBrainDirBoot` | `asBootCorpus`, `setFileAtomic`, `setBrainDirPointerFiles` |
| `assertBrainCliVersionFloor` | `asBrainCliVersion`, `isBrainCliVersionAtOrAboveFloor` |

what is left inline is one lstat or one spawn, and the branch that each outcome of it owes. a split
per branch yields leaves with one caller each, of two to four lines, which `rule.prefer.wet-over-dry`
counsels against until a second caller exists. the one render op that fused compute with i/o,
`getOneRoleBootContent` (r4.blocker.1), was split: `asRoleBootBody` now holds its body and census.

## .why the confidence is not higher

`setRepoBrainDirSymlink` is the longest of the three (five branches). if a second caller of the
migration step appears — a `rhx doctor`, say — its move/drop/swap block earns its own leaf then.

## .rework

clean: an extraction later moves lines, not behavior; the integration tests cover each branch.

## .where

- `src/domain.operations/init/boots/setRepoBrainDirSymlink.ts`
- `src/domain.operations/boot/setBrainDirBoot.ts`
- `src/domain.operations/enroll/assertBrainCliVersionFloor.ts`
