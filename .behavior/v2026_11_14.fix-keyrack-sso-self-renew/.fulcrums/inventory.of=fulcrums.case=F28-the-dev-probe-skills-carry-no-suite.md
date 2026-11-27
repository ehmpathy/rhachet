# F28 — the dev-probe skills carry no suite

## .the fork

i002 r001 nitpick.3 and r009 nitpick.5: `aws.export.probe.sh` and `keyrack.private.sh` render help from their header and have refusal arms with no test or snapshot.

- **a** — add a smoke suite per skill that snaps its help and its refusals
- **b** — keep them as repo-local probes with no suite, as their peers under `.agent/repo=.this/role=any/skills/` are

## .taken

b. both are probes this route used to measure the aws cli and to run the live proof in a private daemon; no product path calls them. no suite snapshots either skill's help (a search of every `*.test.ts` and `*.snap` for both names finds none), so the header edits move no snapshot. most peer probes in that dir carry no suite either.

## .rework

clean: one integration test per skill that runs each refusal arm and snaps the output.

## .confidence — 80%, why not higher

`keyrack.private` is new and a human may reach for it again; a typo'd flag there fails loud today, but no test pins it.

## .where

- `.agent/repo=.this/role=any/skills/aws.export.probe.sh`
- `.agent/repo=.this/role=any/skills/keyrack.private.sh`

## .verdict

open — to the commander at the pr.
