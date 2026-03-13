# brain input: prompt

## .what

the prompt to send to the brain. can be a string or tool execution results.

## .shape

```ts
// when no tools plugged
prompt: string

// when tools plugged
prompt: string | BrainPlugToolExecution[]
```

## .string prompt

initial prompt or follow-up question.

```ts
const result = await context.brain.repl.ask({
  role,
  prompt: 'what needs refactor in this file?',
});
```

## .tool execution prompt

continue an episode with tool results. always an array, even for single tool.

`BrainPlugToolExecution` is a discriminated union — signal narrows output type:
- `signal: 'success'` → `output: TOutput`
- `signal: 'error:*'` → `output: { error: Error }`

```ts
// after brain requests tool invocation — success case
const execution: BrainPlugToolExecution<{ email: string }, { id: string; name: string }> = {
  exid: invocation.exid,
  slug: invocation.slug,
  input: invocation.input,
  signal: 'success',
  output: { id: 'cus_123', name: 'alice' },
  metrics: { cost: { time: { milliseconds: 500 } } },
};

// error case — output is { error: Error }
const errorExecution: BrainPlugToolExecution<{ email: string }, { id: string; name: string }> = {
  exid: invocation.exid,
  slug: invocation.slug,
  input: invocation.input,
  signal: 'error:constraint',
  output: { error: new Error('customer not found') },
  metrics: { cost: { time: { milliseconds: 200 } } },
};

const result = await context.brain.atom.ask({
  role,
  prompt: [execution],  // always array
  on: { episode: priorResult.episode },
  plugs: { tools },
});
```

## .why

- string prompts start or continue conversations
- tool execution prompts enable brain continuation after tool use
- union type enables typed tool result flow

## .see also

- [howto.use.brain.tools](./howto.use.brain.tools.md) — tool contracts
- [howto.use.brain.on](./howto.use.brain.on.md) — episode continuation
