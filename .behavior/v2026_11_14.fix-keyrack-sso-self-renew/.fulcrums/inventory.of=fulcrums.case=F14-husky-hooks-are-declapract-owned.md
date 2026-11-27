# F14 — the husky hooks are declapract-owned; their repair goes upstream

## .the fork

peer review raised points on `.husky/check.timestamps.lock.sh` (i001 r002 nitpick.1 and i002 r002 nitpick.1: an unchecked `git hash-object`; i001 r007 nitpick.1 and i002 r007 nitpick.1: a positional-arg halt helper; i002 r006 nitpick.2: no `set -euo pipefail`), and on `check.secrets.sh:48` / `check.timestamps.sh:67` (i003 r002 nitpick.1: a scan whose `grep` fails on a bad pattern exits 0 through `head`, so the hook passes the commit with no error).

the file IS in this pr: the route's first commit (`e038502f`) ran `rhx upgrade`, whose `declapract apply` wrote `.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh`, and edits to `check.timestamps.sh`, `check.nvm.sh`, `pre-commit`. the work tree holds only file-mode changes on top.

- **a** — hand-edit the generated hook in this repo
- **b** — keep the hook byte-for-byte as the practice ships it; repair it in the `husky` practice upstream, so every repo that applies it gets the fix

## .taken

b. the hook is generated: the next `declapract apply` overwrites a local edit, and a repo whose hook drifts from its practice reads as out of date on every upgrade. the three points are real defects in the practice, so they route to the practice's owner as one change.

## .rework

clean: a change to the upstream practice, then one `declapract apply` here.

## .confidence — 80%, why not higher

the defects ship in this pr's commit until the practice is fixed; a reviewer may prefer a local patch now plus the upstream fix.

## .where

- `.husky/check.timestamps.lock.sh`
- `.husky/check.secrets.sh`, `.husky/check.timestamps.sh`

## .verdict

open — to the commander at the pr. an earlier version of this entry said the diff did not carry `.husky/*`; that premise was false, and the reason above replaces it.
