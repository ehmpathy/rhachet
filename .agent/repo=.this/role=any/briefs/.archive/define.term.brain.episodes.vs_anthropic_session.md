# BrainEpisode vs Anthropic Session

## .tldr

| rhachet term    | messages api equivalent             | agent sdk equivalent             |
| --------------- | ----------------------------------- | -------------------------------- |
| `BrainExchange` | one `POST /messages` call           | one internal api call            |
| `BrainEpisode`  | `messages[]` array (client-managed) | (exists but hidden)              |
| `BrainSeries`   | (caller chains episodes manually)   | "session" (auto-chains episodes) |

- **BrainEpisode** = rhachet's name for what anthropic left unnamed (`messages[]`)
- **BrainSeries ≈ agent sdk "session"** — both are chains of episodes
- anthropic only uses "session" at the sdk level (for chains); rhachet names both levels

## .anthropic's two layers

### messages api: stateless, unnamed

the [messages api](https://platform.claude.com/docs/en/api/migrating-from-text-completions-to-messages) is **stateless** — no server-side session, and **no name for the `messages[]` concept**:

> "The Messages API is stateless, which means that you always send the full conversational history to the API."

anthropic never called `messages[]` a "session" or gave it any name. it's just "messages" or "conversational history".

```ts
// anthropic doesn't name this — rhachet calls it a BrainEpisode
const response = await anthropic.messages.create({
  messages: [
    { role: 'user', content: 'what is a cat?' },      // exchange 0: user
    { role: 'assistant', content: 'a cat is...' },    // exchange 0: assistant
    { role: 'user', content: 'what is a dog?' },      // exchange 1: user
  ]
});
// response adds exchange 1: assistant
```

rhachet names what anthropic left unnamed:
- **BrainEpisode** = the `messages[]` array (bounded by context window)
- **BrainExchange** = one round-trip (user → assistant)
- **episode boundary** = when you truncate/compact (client decides)

### agent sdk: server-managed episode chains

the [agent sdk](https://platform.claude.com/docs/en/agent-sdk/sessions) has **sessions** — but a "session" is really a **chain of episodes** with automatic bridging:

- session id returned on first query
- `resume: sessionId` continues the chain
- `forkSession: true` branches from a point
- compaction summarizes when context fills — new episode begins, chain continues

key insight: **compaction still creates an episode boundary** — the sdk just hides it. under the hood:
- context window fills → compaction → new context starts
- that's a new episode with a "previously on..." recap
- anthropic abstracts this into a single "session" for convenience

what anthropic calls "session" = what rhachet would call **BrainSeries** (a chain of episodes).

## .why BrainEpisode ≠ Agent SDK session

| dimension              | BrainEpisode                     | agent sdk session            |
| ---------------------- | -------------------------------- | ---------------------------- |
| scope                  | one context window               | spans multiple context fills |
| on compaction          | episode ends, new episode begins | session continues            |
| resumable              | no (new episode from recap)      | yes (same session id)        |
| forkable               | no                               | yes                          |
| maps to context window | 1:1                              | 1:N                          |

### compaction: the key difference

in rhachet's model:
```
BrainEpisode[0]: exchanges 0-50, context full → compact
BrainEpisode[1]: starts with recap, exchanges 51-100
```

in anthropic's agent sdk model:
```
Session[0]: exchanges 0-50, context full → compact → exchanges 51-100 → compact → ...
```

rhachet treats compaction as an **episode boundary**. anthropic treats it as **transparent continuation**.

## .why rhachet names what anthropic left unnamed

anthropic's messages api has no name for the `messages[]` concept. rhachet fills this gap:

1. **naming the unnamed** — `messages[]` needs a name; "episode" captures its bounded, continuous nature
2. **precision** — "episode" precisely captures "bounded continuity within one context window"
3. **semantic richness** — the tv analogy ("previously on...") fits compaction better than "session"
4. **disambiguation** — "session" is overloaded (http session, user session, login session)
5. **compaction visibility** — rhachet makes episode boundaries explicit; agent sdk hides them

anthropic introduced "session" only at the agent sdk level — for chains of episodes. rhachet's terminology is consistent with this: BrainSeries ≈ Agent SDK "session".

## .table: term correspondence

| rhachet                         | anthropic messages api              | anthropic agent sdk               |
| ------------------------------- | ----------------------------------- | --------------------------------- |
| BrainExchange                   | one `POST /messages` call           | one internal api call             |
| BrainEpisode                    | `messages[]` array (client-managed) | (exists but hidden inside session)|
| episode boundary (compaction)   | caller truncates/resets messages[]  | hidden (auto-bridged)             |
| BrainSeries (chain of episodes) | (caller manages manually)           | "session" (server-managed)        |

## .implication for rhachet

anthropic's "session" is a convenience abstraction over a chain of episodes. rhachet's terminology is more precise about the underlying mechanics:

```
Agent SDK "session" ≈ BrainSeries (chain of episodes, auto-bridged)
    └── contains 1..N BrainEpisodes (each = one context window fill)
        └── each contains 1..N BrainExchanges (each = one api call)
```

the agent sdk "session" is closer to `BrainSeries` than to `BrainEpisode`:
- it's a chain of episodes
- it spans multiple context windows
- compaction boundaries still exist — they're just hidden

## .sources

- [anthropic messages api docs](https://platform.claude.com/docs/en/api/migrating-from-text-completions-to-messages) — stateless api, client-managed episodes
- [anthropic agent sdk sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) — server-managed sessions with fork support
- [automatic context compaction](https://platform.claude.com/cookbook/tool-use-automatic-context-compaction) — compaction within sessions
- [build agents with claude agent sdk](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — session and compaction design

## .why BrainSeries not BrainThread

considered BrainThread as an alternative name. BrainSeries wins:

| dimension | BrainSeries | BrainThread |
|-----------|-------------|-------------|
| tv metaphor | ★★★★★ episode → series | ★★☆☆☆ breaks pattern |
| disambiguation | ★★★★★ no conflicts | ★★☆☆☆ conflicts with WeaveThread |
| vocabulary separation | ★★★★★ brain vs weave preserved | ★★☆☆☆ blurs the line |

### is BrainSeries a valid brain concept?

yes — BrainRepls manage series:

| brain type | series awareness |
|------------|------------------|
| BrainAtom | none (stateless, one-shot) |
| BrainRepl | yes (manages compaction, resume, continuity) |

the BrainRepl:
- decides when to compact
- generates "previously on..." summaries
- maintains session id for resume/fork
- bridges episodes into a continuous series

so BrainSeries correctly lives in brain vocabulary — it's a BrainRepl concern, not purely a navigator concern.

## .see also

- `define.term.brain.episodes.md` — rhachet's episode/exchange model
- `define.perspectives.brain_vs_weave_vs_skill.md` — the three perspectives
