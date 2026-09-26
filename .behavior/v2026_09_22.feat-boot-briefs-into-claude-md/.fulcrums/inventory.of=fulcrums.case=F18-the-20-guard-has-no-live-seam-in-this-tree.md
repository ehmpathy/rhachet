# F18 — the drift guard's call site

## .fork

the drift guard (`#20`) needed a call site. `rhx enroll` re-renders before it spawns, so a guard there
is vacuous — or a deadlock, since its remedy is *"re-enroll"*. `rhx clone wake` does not exist. build
the operation and book the wire-up, or defer it whole?

## .verdict — VOID (F21)

there is no guard, so there is no call site.

## .grounds

- the fork itself proved the point F21 ruled on: *"every spawn in this tree re-renders, so no spawn
  in this tree can observe drift."* an absent seam was a sign of an absent hazard.
- `assertActorCorpusUndrifted` and `getOneActorCorpusDriftVerdict` are not built.

## .where

- F21 · F4
