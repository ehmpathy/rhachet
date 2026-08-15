# domain.term: inmem

term.chosen   = inmem
term.kind     = adj            # a partition qualifier on an identity grain (ActorInmem, CloneInmem)
term.synonyms.forbidden:
- in-memory
- runtime
- live
- ephemeral

## .what

the in-process partition of an identity grain — an `ActorInmem` (recipe) or `CloneInmem`
(engageable) live object the SDK holds and engages in memory, as opposed to the durable on-disk
record. paired with `ondisk`.

## .refs

- src/domain.objects/ActorInmem.ts
- src/domain.objects/CloneInmem.ts
- src/domain.operations/clone.inmem/genCloneInmem.ts (the inmem engageable creator; SDK-exported as bare `genClone`)
- .agent/repo=.this/role=any/briefs/define.actor-clone-partitions.md

## .reason

see the ref-level cluster beside this choice:
- `term=inmem._.choice.reason.md` — etymology, the inmem↔ondisk partition axis, evidence
