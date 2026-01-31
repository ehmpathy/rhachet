# BrainFocus

## .what

a **BrainFocus** is the consequence of what a brain operates on:

```ts
BrainFocus = {
  concept: string;  // what the brain is focused on (goal, task, topic)
  context: string;  // curated context that informs the focus
}
```

the focus is not explicitly malleable. it is:
- **inferrable** via reflection on the brain's state
- **curatable** via adjustment of focus.concept and focus.context

## .cognitive limits

human brains can only hold N concepts in focus at a time. robot brains have similar limitations.

| brain | focus capacity | consequence |
|-------|----------------|-------------|
| human | ~4-7 concepts | cognitive overload degrades quality |
| robot | ~N concepts | attention dilution degrades quality |

note: focus capacity and context window are orthogonal constraints at different depths. context window bounds how much raw information fits; focus capacity bounds how many distinct concepts receive quality attention.

**the fewer parallel focuses, the better each task will be.**

if detail is critical:
- decompose the work
- operate one focus at a time
- serialize rather than parallelize

## .relationship to episodes and exchanges

BrainFocus is orthogonal to BrainEpisode and BrainExchange:

| concept | what | role |
|---------|------|------|
| BrainFocus | the goal + curated context | the "what" — what the brain is focused on |
| BrainEpisode | a conversation with exchanges | the "how" — mechanism of focus expression |
| BrainExchange | one request-response round-trip | the "how" — atomic unit of focus evolution |

**episodes and exchanges are the mechanisms via which focuses are expressed and evolved.**

```
BrainFocus (inferrable, curatable)
    ↓ expressed via
BrainEpisode (ephemeral, bounded)
    ↓ composed of
BrainExchange[] (atomic round-trips)
    ↓ naturally evolves
BrainFocus (inferred via reflection, preserved via compaction)
```

## .concept

the **concept** is what the brain is focused on:

- a goal to achieve
- a task to complete
- a topic to explore

examples:
- "review this pull request"
- "explain how authentication works"
- "fix the failed test"

## .context

the **context** is a curated string that provides background for the focus:

- not tied to exchange history
- can be crafted, compacted, or composed
- any episode can be spawned from it

```ts
const focus: BrainFocus = {
  concept: "review pr #123",
  context: `
    this pr adds authentication middleware.
    key files: src/auth/middleware.ts, src/auth/jwt.ts.
    prior review noted concerns about token expiry handling.
  `,
};

// spawn an episode from this focus
const { episode } = await brain.ask({
  focus,
  say: "check if token expiry is handled correctly",
});
```

## .context and compaction

the focus evolves naturally as the episode progresses. when an episode's context window fills, compaction attempts to preserve the evolved focus:

1. exchanges are compacted into a summary
2. summary captures the evolved focus.context
3. fresh episode spawns with the preserved focus

```
focus (evolved over episode): "pr adds auth middleware... reviewed jwt.ts, found 3 issues"
episode exchanges: [0-50] → capacity reached → compact
focus (preserved for next episode): "pr adds auth middleware... [summary: reviewed jwt.ts, found 3 issues...]"
```

the focus.context is the persistent, curated state. episodes are ephemeral. compaction bridges them.

## .episodes express focus

episodes are the mechanism to express and evolve a focus:

| pattern | example |
|---------|---------|
| sequential episodes | deep-dives that evolve focus over time |
| parallel episodes | review different files (with quality tradeoff) |
| fresh focus | independent concept, fresh context |
| prior focus | curated context from prior work |

the focus persists and evolves. episodes come and go.

## .curation via reflection

the operator cannot directly set the focus. instead:

1. **reflect** — infer current focus from brain state
2. **curate** — adjust focus.concept and focus.context to guide the brain
3. **express** — spawn episodes to work within the curated focus
4. **evolve** — focus evolves naturally as the episode progresses

compaction attempts to preserve the focus across episodes. reflection is how we infer what the focus is at a given time.

| aspect | nature | operator action |
|--------|--------|-----------------|
| focus.concept | inferrable | curate to guide goals |
| focus.context | inferrable | curate to provide background |
| episode exchanges | observable | spawn and observe |

## .focus management

good focus management:

| pattern | when | benefit |
|---------|------|---------|
| single focus | detail-critical work | maximum depth and quality |
| decomposed focuses | complex work | each subtask gets full attention |
| parallel focuses | independent tasks | throughput (with quality tradeoff) |

bad focus management:

| anti-pattern | consequence |
|--------------|-------------|
| too many parallel focuses | diluted attention, shallow work |
| unfocused context | brain wanders, loses coherence |
| stale focus | brain operates on outdated assumptions |

## .see also

- `define.term.brain.episodes.md` — BrainEpisode and BrainExchange
- `define.perspectives.brain_vs_weave_vs_skill.md` — the three perspectives
