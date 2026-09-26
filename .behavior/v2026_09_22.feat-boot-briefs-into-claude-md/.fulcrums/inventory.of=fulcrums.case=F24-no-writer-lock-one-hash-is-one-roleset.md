# F24 — no writer lock on a brain dir: one hash is one roleset

## .taken — by the driver, 2026-09-23. confidence 90%

two writers of one actor's brain dir (an enroll and an upgrade sweep) may overlap. there is no lock.

## .the fork

| option | cost |
|---|---|
| a per-actor lock or single-flight | a new code path, a stale-lock case, a wait |
| **atomic writes, no lock** — taken | the residue below |

## .why no lock

- a brain dir is keyed by the roleset hash, so every writer renders the SAME roles. a clone never gets another roleset's corpus.
- `boot.md` is uuid temp + rename; `AGENTS.md` and `CLAUDE.md` are constant and findserted. a reader sees one whole corpus under any interleave.
- the residue: two package versions at once, and the older render lands last. the actor keeps the older briefs until its next enroll or upgrade — the same staleness the reference invariant already accepts.

## .why 90%

the slug and derived actor forms (`rule.forbid.per-clone-config`) rewrite a roleset in place, so two writers there could render different roles. this feature renders hash actors and the default alone; a slug-actor render owes this fork again.

## .rework — clean

a lock wraps `setBrainDirBoot` alone.

## .where

the render codepath's `concurrency` block · r007 blocker.1
