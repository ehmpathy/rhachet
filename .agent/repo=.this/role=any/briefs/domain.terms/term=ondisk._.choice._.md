# domain.term: ondisk

term.chosen   = ondisk
term.kind     = adj            # a partition qualifier on an identity grain (ActorOndisk, CloneOndisk)
term.synonyms.forbidden:
- persisted
- stored
- durable
- disk

## .what

the durable filesystem partition of an identity grain — the `.agent/.actors/` record (serial,
socket, config, roles log, history) the CLI operates on, as opposed to the in-mem live object.
paired with `inmem`.

## .refs

- .agent/repo=.this/role=any/briefs/define.actor-clone-partitions.md
- .agent/repo=.this/role=any/briefs/define.actor-clone-hierarchy.md
- src/domain.objects/CloneOndisk.ts + src/domain.objects/ActorOndisk.ts (the ondisk records)
- src/domain.operations/clone/genCloneOndisk.ts (the ondisk spawn orchestrator)

## .reason

see the ref-level cluster beside this choice:
- `term=ondisk._.choice.reason.md` — etymology, the inmem↔ondisk partition axis, evidence
