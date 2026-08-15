# define.actor-clone-partitions

> **scope — `repo=.this`.** how the two identity grains (`actor`, `clone`) are partitioned across two
> layers (on-disk, in-mem), and why every **contract** speaks the bare `Actor` / `Clone` — never the
> partition name.

## .what

each identity grain exists in **two partitions**, one per layer it lives on:

```
Actor{ Ondisk, Inmem }        Clone{ Ondisk, Inmem }
```

- **`ActorOndisk` / `CloneOndisk`** — the durable filesystem record under `.agent/.actors/` (serial,
  socket, config, roles log, history symlinks). the shape `define.actor-clone-hierarchy.md` describes.
- **`ActorInmem` / `CloneInmem`** — the live in-process object (`src/domain.objects/`): a brain ⊕ role
  composition you engage in memory (`clone.ask/.act/.run`).

these are **four internal dobjs**. the partition suffix (`Ondisk` / `Inmem`) names the layer.

## .why partition now

the two layers are, today, **separate representations of the same concept** — one persisted, one live.
they are not yet bound to each other (an in-mem process does not attach to an on-disk clone's socket).
so each partition is declared honestly for the layer it serves, rather than forced into one shape that
fits neither.

a **dream** exists to unify them — to bind an in-mem process to an on-disk clone, so the two partitions
collapse into one. see `.dream/2026_08_14.unify-clone-partitions.dream.md`. until that dream lands, the
partitions stay split.

## the contract ubiquity rule — speak the bare grain

> at every **contract** (CLI, SDK), each grain is referred to **ubiquitously** as `Clone` or `Actor` —
> as if there were **no internal difference**.

no contract surface names a partition. the `Ondisk` / `Inmem` suffix is an **internal** distinction only.
the reason: a dream will unify the two partitions anyway, so a caller should speak **one word** now, and
that word stays correct after the unification lands (no rename, no churn for consumers).

so each surface speaks the ONE partition it operates on, by the bare name:

| surface | operates on | speaks it as |
|---|---|---|
| **CLI** (`rhx enroll`, `rhx clone list/say/get`) | the **on-disk** clone | `Clone` (never `CloneOndisk`) |
| **SDK** (`genClone({ actor }).ask/.act/.run`) | the **in-mem** clone | `Clone` (never `CloneInmem`) |

the CLI never mentions in-mem clones; the SDK never mentions on-disk clones. each surface knows only its
own partition, and calls it the bare `Clone`. same rule for `Actor`.

## .the layers, side by side

| aspect | on-disk (`CloneOndisk`) | in-mem (`CloneInmem`) |
|---|---|---|
| home | `.agent/.actors/…/clones/serial=…/` | a live process object |
| identity | serial (`RefByPrimary`) + optional slug | the process instance |
| reached by | `rhx clone say/get @:<slug\|serial>` | a method call in-process |
| spoken as (contract) | `Clone` (the CLI's word) | `Clone` (the SDK's word) |
| liveness | its socket (connectable = LIVE) | the process itself |

## .see also

- `.dream/2026_08_14.unify-clone-partitions.dream.md` — the dream to bind in-mem ↔ on-disk into one clone.
- `define.actor-clone-hierarchy.md` — the on-disk shape + the clone→actor→{brain,roles} model.
- `define.rhachet.v3.md` — actor = 🧠 brain ⊕ 🧢 role; the core-objects brief both grains extend.
