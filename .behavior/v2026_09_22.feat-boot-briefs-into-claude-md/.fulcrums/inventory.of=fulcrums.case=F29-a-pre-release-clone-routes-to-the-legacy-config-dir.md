# F29 — a pre-release clone routes to the legacy config dir

## .fork

D8 makes the transcript lookup take the actor's brain dir. a clone spawned before this release had
no `CLAUDE_CONFIG_DIR`, so it writes under `~/.claude/projects/`. its history link is lazy — made by
`genCloneHistoryLink` once a transcript exists — so a clone alive across the upgrade, never linked,
would read empty from `rhx clone get`.

| option | |
|---|---|
| a. accept it | name the recovery (re-enroll, same hash) and move on |
| b. search both dirs for every clone | the human's own `~/.claude` sessions in the spawn window become candidates for new clones |
| c. route by birth time | `asCloneConfigDir`: a clone spawned before its actor's brain dir was born → `~/.claude`, else the brain dir |

## .verdict — TAKEN, 80%, rework clean

(c). (a) ships a nameable harm — an empty `get` on a live clone — for one transition. (b) reopens
the cross-contamination the relocation closes. (c) routes each clone to the one dir it could have
written, from two facts already on disk: the clone's `spawnedAt` and the brain dir's birth time.
the same call feeds `genCloneHistoryLink` and `invokeCloneGet`, so link and read scope agree.

## .why the confidence is not higher

`birthtimeMs` is 0 on some filesystems; there the route falls to the brain dir, and a pre-release
clone on such a host reads empty until re-enrolled. the transition lasts one clone generation.

## .rework

clean: one pure transformer and its two call sites.

## .where

- blueprint: D8 · the enroll codepath · `.by case` (`asCloneConfigDir`) · usecase 1 (continuity row)
- review: i008 r011 nitpick.2
