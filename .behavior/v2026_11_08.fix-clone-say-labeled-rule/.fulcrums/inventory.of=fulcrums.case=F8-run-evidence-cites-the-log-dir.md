# F8 — run evidence cites the log dir, not a per-run log file

## .the fork

`repo-rules` (5.3, nitpick.1) asks that each count in the verification proof table carry the path
of the log file that produced it (`rule.require.read-the-record-not-the-correlate`).

- **A** — cite the tier's log dir, `.log/role=mechanic/skill=git.repo.test/what=<tier>/`, and the
  summary `git.repo.test` printed
- **B** — cite each per-run file by name

## .taken, and why at the time

A. `git.repo.test` names each per-run file by its start time (`<date>T<hh>-<mm>-<ss>Z.stdout.log`).
`.husky/check.timestamps.sh` halts any commit of a tracked file, prose included, that holds a
clock time, and forbids an exemption. so **B** cannot be committed. `.log/` is gitignored too, so a
per-run path would point at no file for any reader but this box.

## .rework

clean — a later change could have `git.repo.test` mint a run id with no clock in it.

## .risk

none — provenance prose only.

## .confidence — 85%, and why it is not higher

a masked form (`<run>.stdout.log`) would carry the shape of the path; the wisher may prefer it.

## .where

- `.behavior/v2026_11_08.fix-clone-say-labeled-rule/5.3.verification.yield.md` (the residue note)
- `.husky/check.timestamps.sh`
