# weave fabric, threads, and stitches

## .what

the navigator's observation mechanism — **observed output** of thought work.

| term          | what                                                  | scope                 |
| ------------- | ----------------------------------------------------- | --------------------- |
| `WeaveFabric` | observed execution output                             | entire execution      |
| `WeaveThread` | observed thought route                                | one thought route     |
| `WeaveStitch` | observed thought step (fanout, compute, imagine, etc) | one step in the route |

## .nature

weave terms are **observed** — they capture what happened via execution:
- a WeaveFabric is produced when a skill executes
- a WeaveThread is produced via WeaveStitches
- WeaveStitches capture each step that was executed

## .hierarchy

```
WeaveFabric (observed output)
└── WeaveThread[] (1..N observed thought routes)
    └── WeaveStitch[] (0..N observed thought steps)
```

## .the textile metaphor

| textile             | rhachet                    |
| ------------------- | -------------------------- |
| fabric (the output) | observed execution         |
| thread (one strand) | one observed thought route |
| stitch (one loop)   | one observed thought step  |

the metaphor captures:
- composition (threads form a fabric)
- sequence (stitches form a thread)
- structure (the whole is woven from parts)
- observation (fabric is the result, not the design)

## .stitch types

a WeaveStitch can be:
- `choice` — select from options
- `cycle` — iterate until condition
- `route` — sequential steps
- `fanout` — parallel execution
- `imagine` — invoke a brain

## .relationship to brain

we observe WeaveStitches that may have been produced from brain invocations:

```
WeaveThread (observed thought route)
├── WeaveStitch[0]: fetch data (no brain)
├── WeaveStitch[1]: analyze      → produced BrainEpisode, BrainExchange
├── WeaveStitch[2]: clarify      → continued BrainEpisode, added BrainExchange
├── WeaveStitch[3]: transform (no brain)
└── WeaveStitch[4]: summarize    → produced new BrainEpisode, BrainExchange
```

the weave observes:
- which steps were produced from brain invocations (and which supplier, episode, series)
- which stitches were executed (and in what order)
- artifact progression (snapshots and diffs at each stitch)

this enables:
- **replay** — step through the weave stitch by stitch
- **diagnosis** — inspect artifact state at any point
- **diff** — compare artifact before vs after each stitch
- **cost** — observe time and cash spent per stitch
- **pattern** — visualize thought patterns for analysis and reflection

BrainSeries and BrainEpisodes:
- are produced fresh each execution (unless reused)
- track conversation context for that run
- are unaware of the weave that observed them

## .relationship to skills

weaves are observed from invoked skills.

skills define reusable thought routes with variable determinism:

| skill type | determinism   | weave observes                    |
| ---------- | ------------- | --------------------------------- |
| 🪨 solid    | deterministic | predictable, reproducible output  |
| 🔩 rigid    | mixed         | bounded variance within harness   |
| 💧 fluid    | probabilistic | unbounded variance, brain decides |

weaves enable observation of emergent behavior:

- skills prescribe *what* to do — the thought route
- weaves capture *what happened* — the observed execution
- the gap between prescription and observation grows with fluidity

```
skill (prescription)           weave (observation)
        │                               │
        │   🪨 solid: gap ≈ 0           │
        │   🔩 rigid: gap = bounded     │
        │   💧 fluid: gap = unbounded   │
        │                               │
        ▼                               ▼
    determinism                 emergent behavior
```

this is why weaves exist: skills with 🔩 rigid and 💧 fluid routes produce emergent behavior that can only be observed, not guaranteed.

## .pattern visualization

weaves enable visual agents (human and robot) to see thought patterns.

| pattern type | what it reveals                        |
| ------------ | -------------------------------------- |
| reusable     | repeated structures worth distillation |
| divergent    | variance that may need constraint      |
| bottleneck   | stitches that dominate time or cost    |
| failure      | paths that led to bad outcomes         |

this supports higher-level analysis:

- **intuition** — recognize patterns across many weaves
- **reflection** — compare observed vs expected behavior
- **distillation** — identify fluid routes ready to harden

weaves make thought visible. visible thought can be analyzed, compared, and improved.

## .see also

- `define.term.skill.thought-routes.md` — skill perspective terms (🪨 solid, 🔩 rigid, 💧 fluid)
- `define.term.brain.episodes.md` — brain perspective terms
- `define.perspectives.brain_vs_weave_vs_skill.md` — the three perspectives
