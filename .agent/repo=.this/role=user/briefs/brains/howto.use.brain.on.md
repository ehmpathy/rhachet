# brain input: on

## .what

episode or series continuation. enables multi-turn conversations.

## .shape

```ts
// atom: episode only
on?: { episode: BrainEpisode }

// repl: episode or series (pick one)
on?: PickOne<{ episode: BrainEpisode; series: BrainSeries }>
```

## .episode continuation

continue within a single context window.

```ts
// first turn
const result1 = await context.brain.repl.ask({
  role,
  prompt: 'what files need refactor?',
});

// continue the conversation
const result2 = await context.brain.repl.ask({
  role,
  prompt: 'focus on the first one',
  on: { episode: result1.episode },
});
```

## .series continuation (repl only)

continue across context windows (survives compaction).

```ts
// first turn
const result1 = await context.brain.repl.act({
  role,
  prompt: 'refactor this codebase',
  plugs: { tools },
});

// continue after compaction
const result2 = await context.brain.repl.act({
  role,
  prompt: 'now add tests',
  on: { series: result1.series },
  plugs: { tools },
});
```

## .episode vs series

| concept | scope | boundary | available on |
| ------- | ----- | -------- | ------------ |
| episode | one context window | compaction | atom, repl |
| series | 1..N context windows | explicit end | repl only |

## .why

- enables multi-turn conversations with memory
- episode for short conversations within context limits
- series for long-run workflows that span compaction

## .note

atom is stateless and has no series awareness. it returns `null` for series in `BrainOutput`.

## .see also

- [howto.use.brain.prompt](./howto.use.brain.prompt.md) — tool execution continuation
