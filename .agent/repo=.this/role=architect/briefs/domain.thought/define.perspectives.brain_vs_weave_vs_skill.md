# brain vs weave vs skill: three perspectives

## .what

rhachet separates three orthogonal views of thought work:

| perspective | who                               | what they track         | prefix   |
| ----------- | --------------------------------- | ----------------------- | -------- |
| **skill**   | author (role author)              | reusable thought routes | none     |
| **weave**   | navigator (rhachet operator)      | observed execution      | `Weave*` |
| **brain**   | supplier (anthropic, openai, etc) | conversation state      | `Brain*` |

## .why

these are orthogonal views of the same work. each perspective:
- owns its vocabulary
- tracks its own state
- has no knowledge of the other's internals

the separation reinforces architectural boundaries.

## .nature

the perspectives differ in nature:

| perspective | nature    | represents              |
| ----------- | --------- | ----------------------- |
| **skill**   | distilled | reusable thought routes |
| **weave**   | observed  | observed execution      |
| **brain**   | produced  | conversation state      |

- **skill = distilled** — thought routes hardened from 💧 fluid → 🔩 rigid → 🪨 solid
- **weave = observed** — fabric, threads, and stitches capture what happened
- **brain = produced** — series, episodes, and exchanges are created fresh each run

when a skill executes:
- WeaveThreads are observed as thought routes execute
- WeaveStitches are observed → may invoke brains, produce artifacts
- the WeaveFabric captures the full observed execution

skills define what to do. weave observes what happened. brain produces conversation state.

## .terms

### parallel hierarchy

| perspective | what                                               |
| ----------- | -------------------------------------------------- |
| skill       | 🪨 solid → 🔩 rigid → 💧 fluid (determinism spectrum) |
| weave       | WeaveFabric → WeaveThread → WeaveStitch            |
| brain       | BrainSeries → BrainEpisode → BrainExchange         |

```
skill: 🪨 solid ←→ 🔩 rigid ←→ 💧 fluid (determinism spectrum)

weave: WeaveFabric  → WeaveThread[]  → WeaveStitch[]
brain: BrainSeries  → BrainEpisode[] → BrainExchange[]
```

## .principle

> **vocabulary reflects perspective. different perspectives, different vocabulary.**

the skill perspective distills — it speaks in 🪨 solid, 🔩 rigid, and 💧 fluid routes.

the weave perspective observes — it speaks in WeaveFabrics, WeaveThreads, and WeaveStitches.

the brain perspective produces — it speaks in BrainSeries, BrainEpisodes, and BrainExchanges.

shared vocabulary would blur the architectural boundary.

## .cardinality

```
WeaveFabric (weave perspective — observed output)
└── WeaveThread[] (observed thought routes)
    └── WeaveStitch[] (observed thought steps)
        └── may have been produced from brain invocation (brain perspective)
            ├── via BrainRepl → BrainSeries → BrainEpisode[] → BrainExchange[]
            └── via BrainAtom → BrainEpisode → BrainExchange[]
```

- a WeaveThread may observe 0..N BrainSeries (via BrainRepls)
- a WeaveThread may observe 0..N BrainEpisodes directly (via BrainAtoms)
- a WeaveStitch captures: which BrainSeries or BrainEpisode was observed

## .WeaveThread vs BrainSeries

WeaveThread and BrainSeries are **similar** — both capture continuity. but they diverge critically:

| dimension   | WeaveThread                           | BrainSeries                |
| ----------- | ------------------------------------- | -------------------------- |
| perspective | weave (navigator)                     | brain (supplier)           |
| nature      | observed output                       | produced state             |
| scope       | observed across many brains           | one BrainRepl's continuity |
| contains    | 0..N BrainSeries + 0..N BrainEpisodes | 1..N BrainEpisodes         |

### the key divergence

a WeaveThread may observe a skill that used **many BrainSeries** and **many BrainEpisodes**:

```
WeaveThread (observed)
├── WeaveStitch[0] → observed: skill used BrainRepl A → BrainSeries A (episodes 0-3)
├── WeaveStitch[1] → observed: skill used BrainAtom B → BrainEpisode B1 (fresh episode)
├── WeaveStitch[2] → observed: skill used BrainAtom B → BrainEpisode B1 (continued, added exchanges)
├── WeaveStitch[3] → observed: skill used BrainRepl A → BrainSeries A (continued, episodes 4-5)
├── WeaveStitch[4] → observed: skill used BrainRepl C → BrainSeries C (new repl, new series)
└── WeaveStitch[5] → observed: skill used BrainAtom B → BrainEpisode B2 (fresh episode)
```

the WeaveThread captures:
- which brains the skill invoked (Repl vs Atom, which supplier)
- which resources were reused vs spawned fresh
- the observed output across multiple brain resources
- has no single BrainSeries — it observes across many

the BrainSeries:
- is internal to one BrainRepl
- is unaware of other brains or series
- is unaware it's part of a WeaveThread

## .see also

- `define.term.skill.thought-routes.md` — skill perspective terms (🪨 solid, 🔩 rigid, 💧 fluid)
- `define.term.weave.threads.md` — weave perspective terms (WeaveFabric, WeaveThread, WeaveStitch)
- `define.term.brain.episodes.md` — brain perspective terms (BrainSeries, BrainEpisode, BrainExchange)
