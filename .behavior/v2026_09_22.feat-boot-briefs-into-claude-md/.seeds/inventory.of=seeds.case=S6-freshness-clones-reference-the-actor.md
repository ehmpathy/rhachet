# S6 — freshness: clones reference the actor

## .holds

- a role **content** change: `rhx upgrade` re-renders each active actor's `boot.md` in place. a live clone takes it at its next read; a new clone at spawn.
- **active** = at least one clone still live: its reach state is LIVE or DEAF, never DEAD. a clone record alone does not count. an actor skipped this way renders at its next spawn.
- a role **set** change: a new hash, so a new actor. the prior clone keeps its roles, correctly.
- no drift record, guard, or signal exists.
- the corpus is byte-identical at one package version, and may differ across an upgrade.

## .said

> the contents of those roles is a part of their definition … we only need to be byte-identical within upgrade boundaries
>
> yeah we need to do that to any actors that are still active
>
> why would we even mention this? we agreed ten times that it gets updated on compaction automatically. that is the whole point of actors -> clone references
>
> atleast one STILL LIVE *(on "active = at least one clone record under `<actorDir>/clones/`")*
