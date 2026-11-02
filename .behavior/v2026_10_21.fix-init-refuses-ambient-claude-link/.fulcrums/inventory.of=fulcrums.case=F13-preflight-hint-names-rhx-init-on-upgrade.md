# F13 — the preflight's refusal hint says "rerun `rhx init`" on the `rhx upgrade` path too

## .the fork

- **a.** one refusal text for both callers: "then rerun `rhx init`" (as the vision's case 4 demo [t1]
  reads)
- **b.** a caller-aware hint: "rerun `rhx upgrade`" on the upgrade path, as the extant [case17]
  upgrade refusal already reads
- **c.** a command-neutral hint: "then rerun the command"

## .taken — a, and why at the time

- the preflight is one function shared by `rhx init --roles` and `rhx upgrade`; one text has one source
- the vision's case 4 demo names `rhx init` as the recovery, and the vision is the commander's
- `rhx init --roles` does cure the tree: by the time the preflight runs, the upgrade's install is done

## .rework — clean

(b) passes the caller's verb into the three hint producers (`assertRepoActorBrainDirWritable`,
`assertRepoBrainDirSymlinkLandsHere`, `asRepoBrainDirIsFileError`) and resnaps their entries; (c)
edits three strings and resnaps.
neither ripples past the preflight.

## .confidence — 60%, and why it is low

three peer lanes (ergo-contract-snapshots, ergo-acceptance-journey-coverage,
ergo-snapshot-visual-blemishes) raised it over three rounds, and the same upgrade snapshot file holds
[case17] with "rerun `rhx upgrade`". a reader of that file meets two verbs for one kind of advice.

## .where

- `blackbox/cli/__snapshots__/upgrade.acceptance.test.ts.snap` [case18] [t0] [t1]
- `src/domain.operations/init/boots/assertRepoActorBrainDirWritable.ts`,
  `src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere.ts`

## .verdict

open — the commander's to rule (it amends the vision's case 4 demo text).
