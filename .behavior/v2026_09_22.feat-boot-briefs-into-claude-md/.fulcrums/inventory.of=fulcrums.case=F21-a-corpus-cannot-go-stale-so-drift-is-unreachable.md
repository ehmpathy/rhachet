# F21 — a corpus cannot go stale, so drift is unreachable

## .verdict — RULED by the wisher, 2026-09-23

> *"it'll get updated on compaction already automatically — that's the whole point of actors → clone
> references."*

## .grounds — every change lands in one of two branches, and neither drifts

| change | what happens | the live clone reads |
|---|---|---|
| role **set** | a new hash ⇒ a new actor dir | its own actor's `boot.md` — correct for its roleset |
| role **content** (`rhx upgrade`) | the actor's `boot.md` re-renders in place (F8) | the new body, at its next read |

- the first is a path move, never a stale read. the second is the sync invariant:
  *"all clones of an actor share the actor's config by reference, not by copy"*
  (`rule.forbid.per-clone-config`).
- a hand-edited `boot.md` in the gitignored actor dir is repaired by the next enroll or upgrade; it
  earns no guard.

## .deleted with it

- the drift guard, its verdict transformer, its TOCTOU clamp, the drift signal
- F4 (where the check fires) · F17 (where the record lives) · F18 (where the guard is called)

## .where

- vision `.freshness` — *"no drift record, guard, or signal. the reference is the mechanism."*
- criteria usecases 5 and 6
