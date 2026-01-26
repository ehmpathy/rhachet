# orchestration

## .what

orchestration enables the delegation of work across many delegates simultaneously.

orchestration is composed of:
- **communication** — how delegates exchange information with each other and the orchestrator
- **dispatch** — how work is assigned and distributed to delegates
- **observation** — how the orchestrator monitors delegate progress and outcomes

## .why

orchestration enables parallelism at scale:
- communication makes coordination possible
- dispatch makes work distribution efficient
- observation makes progress visible

without orchestration, delegation is sequential — one delegate at a time. with orchestration, many delegates work simultaneously toward a shared objective.

## .relationship to delegation

orchestration builds on delegation:

```
delegation = how to delegate to one actor
orchestration = how to delegate to many actors simultaneously
```

each delegate follows the delegation chain:
```
distill → enroll → specialize → isolate → fulfill → verify
```

orchestration coordinates many such chains in parallel.

## .components

### communication

communication enables information flow between delegates and the orchestrator.

| communication pattern | what it enables                          |
| --------------------- | ---------------------------------------- |
| broadcast             | orchestrator → all delegates             |
| unicast               | orchestrator ↔ one delegate              |
| multicast             | orchestrator → subset of delegates       |
| peer-to-peer          | delegate ↔ delegate (if permitted)       |

communication enables coordination: delegates can share context, request clarification, or signal completion.

### dispatch

dispatch assigns work to delegates.

| dispatch pattern | what it means                              |
| ---------------- | ------------------------------------------ |
| fanout           | same work to many delegates (consensus)    |
| partition        | different work to different delegates      |
| pipeline         | sequential handoff between delegates       |
| dynamic          | work assigned based on availability/skill  |

dispatch enables parallelism: work is distributed across delegates based on the orchestration strategy.

### observation

observation monitors delegate progress and outcomes.

| observation aspect | what it tracks                            |
| ------------------ | ----------------------------------------- |
| progress           | how far along is each delegate            |
| health             | is the delegate responsive                |
| output             | what has the delegate produced            |
| cost               | time and tokens consumed                  |

observation enables visibility: the orchestrator knows what occurs across all delegates.

weaves capture observation — they record the full execution across all delegates.

## .orchestration patterns

| pattern     | description                                      | when to use                        |
| ----------- | ------------------------------------------------ | ---------------------------------- |
| fanout      | dispatch same task to N delegates, aggregate     | consensus, redundancy, vote        |
| map-reduce  | partition work, delegate parts, combine results  | large tasks, parallelizable work   |
| pipeline    | sequential stages, each delegate hands off       | ordered transformations            |
| swarm       | dynamic dispatch based on delegate availability  | variable workload, elastic scale   |

## .see also

- `define.term.delegation.md` — delegation to a single actor
- `define.term.weave.threads.md` — weaves capture orchestrated execution
