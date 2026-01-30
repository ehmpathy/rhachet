# brain series, episodes, and exchanges

the brain's perspective on conversation state — **instantiated** execution state.

## .nature

brain terms are **instantiated** — created fresh each time a weave runs:
- a BrainSeries is created when a BrainRepl starts
- a BrainEpisode is created when conversation begins
- a BrainExchange is created when a request is made

these track actual conversation state for a specific execution. contrast with weave terms (WeaveFabric, WeaveThread, WeaveStitch) which capture observed output of thought work.

## .tldr

### hierarchy

```
BrainSeries (BrainRepl only)
└── BrainEpisode[] (1..N per series)
    └── BrainExchange[] (1..N per episode)
```

### summary

| term            | what                                    | scope                | boundary              | owner     |
| --------------- | --------------------------------------- | -------------------- | --------------------- | --------- |
| `BrainSeries`   | chain of episodes bridged by compaction | 1..N context windows | explicit end/abandon  | BrainRepl |
| `BrainEpisode`  | one context window of exchanges         | one context window   | compaction            | both      |
| `BrainExchange` | one request-response round-trip         | one api call         | response received     | both      |

### tv metaphor

| tv               | brain           |
| ---------------- | --------------- |
| series           | BrainSeries     |
| episode          | BrainEpisode    |
| scene            | BrainExchange   |
| "previously on…" | compaction      |

---

## .BrainSeries

### .what

a **BrainSeries** is a chain of episodes bridged by compaction — the BrainRepl's unit of continuity across context window boundaries.

### .scope

1..N context windows. a series spans as many episodes as needed until explicitly ended or abandoned.

### .boundary

explicit end or abandon. unlike episodes (which end on compaction), series persist across compaction boundaries.

### .structure

```
BrainSeries
├── BrainEpisode[0]: exchanges 0-50, context full → compact
├── BrainEpisode[1]: recap + exchanges 51-100, context full → compact
└── BrainEpisode[2]: recap + exchanges 101-150, ...
```

### .owner

**BrainRepl only.** BrainAtoms are stateless — they have no series awareness. the caller must manage any episode chains manually.

| brain type  | series support |
| ----------- | -------------- |
| `BrainAtom` | ✗ none (stateless) |
| `BrainRepl` | ✓ manages series (compaction, resume, fork) |

### .why "series" not "session" or "thread"

| alternative   | why not                                          |
| ------------- | ------------------------------------------------ |
| BrainSession  | "session" is overloaded (http, user, login)      |
| BrainThread   | conflicts with WeaveThread, blurs brain vs weave |
| BrainSeries   | ✓ extends tv metaphor, no conflicts              |

---

## .BrainEpisode

### .what

a **BrainEpisode** is one context window of exchanges — the unit of continuity within a single context capacity.

### .scope

one context window. all exchanges within an episode share the same context.

### .boundary

compaction. when the context window fills, the episode ends and a new one begins with a "previously on..." recap.

### .structure

```
BrainEpisode
├── BrainExchange[0]: user asks, brain responds
├── BrainExchange[1]: user asks, brain responds
├── ...
└── BrainExchange[N]: user asks, brain responds → context full → compact
```

### .owner

**both BrainAtom and BrainRepl.** both support multi-exchange episodes via continuation.

| brain type  | episode support                     |
| ----------- | ----------------------------------- |
| `BrainAtom` | ✓ via `{ on: { episode } }`         |
| `BrainRepl` | ✓ via `{ on: { episode } }`         |

### .why "episode" not "session" or "conversation"

| alternative       | why not                                            |
| ----------------- | -------------------------------------------------- |
| BrainSession      | "session" is overloaded (http, user, login)        |
| BrainConversation | too generic, doesn't imply bounded continuity      |
| BrainEpisode      | ✓ implies bounded continuity, fits compaction      |

| dimension          | Session | Episode |
| ------------------ | ------- | ------- |
| industry alignment | ★★★★★   | ★★★☆☆   |
| precision          | ★★★☆☆   | ★★★★★   |
| compaction fit     | ★★★☆☆   | ★★★★★   |
| domain richness    | ★★★☆☆   | ★★★★★   |

**we prefer precision and semantic richness over industry alignment.**

---

## .BrainExchange

### .what

a **BrainExchange** is one request-response round-trip — the atomic unit of brain interaction.

### .scope

one api call. user says X → brain says Y.

### .boundary

response received. each exchange is complete when the brain returns its response.

### .structure

```
BrainExchange
├── request: user message (+ tools, context)
└── response: brain message (+ tool calls, artifacts)
```

### .owner

**both BrainAtom and BrainRepl.** exchanges are the fundamental unit for all brain types.

| brain type  | exchange support |
| ----------- | ---------------- |
| `BrainAtom` | ✓ one per call   |
| `BrainRepl` | ✓ many per loop  |

### .why "exchange" not "turn" or "message"

| alternative     | why not                                       |
| --------------- | --------------------------------------------- |
| BrainTurn       | "turn" implies one party's contribution       |
| BrainMessage    | ambiguous — is it user message or brain message? |
| BrainExchange   | ✓ explicitly bidirectional (user → brain)    |

---

## .compaction

when a BrainRepl's context window fills, **compaction** occurs:

1. current episode ends
2. exchanges are summarized into a "previously on..." recap
3. new episode begins with the recap as context
4. series continues

```
BrainSeries
├── BrainEpisode[0]: exchanges 0-50, context full → compact
└── BrainEpisode[1]: starts with recap, exchanges 51-100, ...
```

| tv series                   | brain repl             |
| --------------------------- | ---------------------- |
| episode ends on cliffhanger | context window fills   |
| "previously on..." recap    | compaction summary     |
| new episode continues story | new episode with recap |
| series continues            | series continues       |

the "episode" frame makes compaction feel like continuation, not restart. the story continues — just in a new episode, same series.

---

## .BrainAtom vs BrainRepl

| brain type  | what                                  | exchange | episode | series |
| ----------- | ------------------------------------- | -------- | ------- | ------ |
| `BrainAtom` | single inference call                 | ✓        | ✓       | ✗      |
| `BrainRepl` | read-execute-print-loop with tool use | ✓        | ✓       | ✓      |

**BrainAtom:**
- one inference call, returns output directly
- no series awareness — stateless
- caller must manage episode chains manually

**BrainRepl:**
- loop that executes tools between exchanges
- series-aware — manages compaction, resume, fork
- bridges episodes into continuous series

---

## .usage

```ts
// start a new episode
const { episode, output } = await brain.ask({ say: 'what is a cat?' });

// continue the episode (add exchange)
await brain.ask({ on: { episode }, say: 'what is a dog?' });

// episode now contains two exchanges
// episode.exchanges = [exchange0, exchange1]

// if context fills, BrainRepl compacts automatically
// series continues, new episode begins with recap
```

---

## .isolation

the brain only knows about its series, episodes, and exchanges. it has no awareness of:
- the WeaveFabric that observed the orchestration
- which WeaveThread (thought route) invoked it
- which WeaveStitch (thought step) triggered the exchange
- other brain instances created by the same weave

---

## .see also

- `define.term.brain.episodes.vs_anthropic_session.md` — comparison with anthropic's terminology
- `define.term.skill.thought-routes.md` — skill perspective terms (🪨 solid, 🔩 rigid, 💧 fluid)
- `define.term.weave.threads.md` — weave perspective terms (WeaveFabric, WeaveThread, WeaveStitch)
- `define.perspectives.brain_vs_weave_vs_skill.md` — the three perspectives
