# F8 — who re-renders a corpus when role packages change

## .fork

`genEnrollmentHash` digests role **slugs**, never role **contents**. so a package upgrade leaves the
hash, the path and the old corpus in place. which actors re-render, and on what?

| option | verdict |
|---|---|
| a. every extant actor dir | ❌ the set grows without bound — `.agent/.actors/` never reaps a hash actor |
| b. the default actor alone (#398) | ❌ the hash actor is the fleet's default form; (b) leaves it stale |
| c. lazily, at the next enroll | ❌ a live clone never learns |
| **a′. every ACTIVE actor** | ✅ **taken** |

## .verdict — RULED (S16): every active actor, on `rhx init` and `rhx upgrade`

- **active** = at least one clone record under `<actorDir>/clones/`.
- the repo's brain dir renders on the same pass.

## .grounds

- the measure is the only candidate with no free parameter — a `readdir`, a boolean. a live clone
  would tie the render to whether a session is open; a transcript age or dir mtime needs an
  unmeasured window; `actors.yml` is read by no production code.
- a clone record outlives its clone until an explicit prune, so the set is stable across sessions.
- `active` is the policy word in prose only: in `clone/` it already means *"the process has not
  exited"* (`computeClonePruneDecision.ts:9`). so the code carries the measure inline —
  `getAllClonesForActor(actor).length > 0` — never an `active` identifier.

## .where

- blueprint `syncBootsForBrainDirs` (a peer of `syncHooksForLinkedRoles`, in `init/boots/`) ·
  journey [t4], [t5] · criteria usecase.3 · vision `.freshness` · seed S16
