# domain.term.choice.reason: inmem

## .etymology

`inmem` = "in memory" — the partition of an identity grain that lives as a live object in the
active process, engaged directly (`clone.ask/.act/.run`). chosen as one half of the
`inmem`↔`ondisk` partition pair that splits each grain (actor, clone) by the layer it lives on.

chosen over:
- `in-memory` — a hyphen breaks a code identifier (`ActorInmem`, not `ActorIn-memory`); the
  contract form is the closed compound `inmem`.
- `runtime` — overloaded (a runtime is also an environment/engine); says WHEN, not WHERE.
- `live` — a clone's liveness is a separate reach-state axis (LIVE/DEAF/DEAD); `inmem` is a
  partition, not a liveness.
- `ephemeral` — a value judgement about lifespan, not a partition; the ondisk record is also
  reachable, and the dream unifies the two.

## .disputes

none yet.

## .evidence

- the partition model: `define.actor-clone-partitions.md` — each grain has two partitions,
  `Actor{Ondisk,Inmem}` / `Clone{Ondisk,Inmem}`; the CLI speaks the ondisk grain, the SDK the
  inmem grain, both by the bare `Actor`/`Clone`.
- declared dobjs that carry the term: `ActorInmem` (recipe: roles[] + brains), `CloneInmem`
  (engageable: `.act/.run/.ask`).
- the unification dream: `.dream/2026_08_14.unify-clone-partitions.dream.md` — binds the two
  partitions into one, at which point the suffix retires.
