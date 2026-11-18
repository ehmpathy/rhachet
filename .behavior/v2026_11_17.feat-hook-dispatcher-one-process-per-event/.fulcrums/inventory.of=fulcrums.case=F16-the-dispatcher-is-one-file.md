# F16 — the dispatcher stays one bash file

## .the fork

`bin/hooks.dispatch.sh` selects, runs, and merges. should those be three sourced files?

- **(a)** one file
- **(b)** three files, sourced: select, run, and merge, with merge as a table-tested function

## .taken

(a). the dispatcher runs on every hook event of every seat. that per-call cost is the subject of
this pr. three files mean three opens and reads per call, and a lookup of peer files through
`node_modules/.pnpm` symlinks (`BASH_SOURCE` plus realpath) that one file never makes.

every merge branch is already table-tested, through the real file, in the dispatcher acceptance
suite:

- block merge: `[t2]`, `[t3]`
- byte parity: `[t5]`
- silent crash: `[t9]`
- json rank: `[t10]`
- invalid regex: `[t11]`
- kill: `[t12]`
- version and row refusals: `[t13]`, `[t15]`
- private files: `[t14]`
- own pid: `[t16]`

## .rework

clean: a move of three code blocks into peer files with no change in behavior. the acceptance
suite proves parity.

## .confidence

80%. if the director weighs unit-level merge tests over the per-call reads, (b) is a clean move.

## .where

`bin/hooks.dispatch.sh`

## .verdict

open, for the director at the pr.
