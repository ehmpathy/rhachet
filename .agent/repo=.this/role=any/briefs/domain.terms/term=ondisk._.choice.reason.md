# domain.term.choice.reason: ondisk

## .etymology

`ondisk` = "on disk" — the partition of an identity grain that lives as a durable record on the
filesystem (`.agent/.actors/…`), reached by the CLI (`rhx enroll`, `rhx clone list/say/get`).
chosen as one half of the `inmem`↔`ondisk` partition pair that splits each grain (actor, clone)
by the layer it lives on.

chosen over:
- `on-disk` — a hyphen breaks a code identifier (`CloneOndisk`, not `CloneOn-disk`); the contract
  form is the closed compound `ondisk`. (`on-disk` stays fine in prose/comments.)
- `persisted` / `stored` — name the act of a write, not the partition; the record is the noun, the
  partition is where it lives.
- `durable` — a lifespan property, not a location; the inmem grain can be durable too (revived).
- `disk` alone — names the medium, not the partition of the grain.

## .disputes

none yet.

## .evidence

- the partition model: `define.actor-clone-partitions.md` — each grain has two partitions,
  `Actor{Ondisk,Inmem}` / `Clone{Ondisk,Inmem}`; the CLI speaks the ondisk grain, the SDK the
  inmem grain, both by the bare `Actor`/`Clone`.
- the ondisk shape: `define.actor-clone-hierarchy.md` — the `.agent/.actors/` record layout.
- the unification dream: `.dream/2026_08_14.unify-clone-partitions.dream.md` — binds the two
  partitions into one, at which point the suffix retires.
