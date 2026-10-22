# F22 — the #577 allowance is permission, never a count

## .the fork

the ehmpathy/rhachet#577 vision speaks of *"a per-clone allowance of one child"* beside *"every
work clone may enroll one more clone, at depth N+1"*. two readings:

- **(a) permission** — a work clone may spawn one LEVEL below itself; how many children it
  spawns there is unbounded. the bound on fan-out is the leaf rule: no reviewer spawns
- **(b) a count** — each work clone may spawn exactly one child in its life, tracked somewhere

## .taken — (a), and why at the time

- the fleet's work clones run several reviews per stone (a guard holds many peer lanes). a count
  of one would refuse the second lane — the exact stall the S68 verdict exists to end
- a count needs a store: a counter per clone that every door reads and bumps. the catalog's
  invariant says *"liveness needs no stored state"*, and a spawn count is state of the same kind;
  `rule.forbid.per-clone-config` forbids per-clone artifacts that are not this run's own
- the storefronts S68 patch, sent as reference, also reads it as (a): it drops the cap and adds
  no counter

## .rework — clean

a count would add one env key or one file per clone and one check at `assertCloneSpawnAllowed`;
no caller hardened against (a) beyond the absence of that check.

## .confidence — 80%, and why it is low

the vision's own words say *"one child"*, and only the commander can say whether that was loose
prose or a rule. the call is best-guessed on the fleet's need, which the vision does not state.

## .where

`src/domain.operations/spawn/assertCloneSpawnAllowed.ts` · `isCloneSpawnCallerLeaf.ts`

## .verdict

— (awaits the commander)
