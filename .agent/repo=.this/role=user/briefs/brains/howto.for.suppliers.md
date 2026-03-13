# brain supplier implementation

## .what

brain suppliers implement `BrainAtom` or `BrainRepl` interfaces to connect inference providers to rhachet.

## interplay: BrainAtom + BrainRepl

BrainRepl is built on top of BrainAtom:

```
┌─────────────────────────────────────────────────────────┐
│ BrainRepl                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ agentic loop                                      │  │
│  │                                                   │  │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐      │  │
│  │   │ ask     │───▶│ execute │───▶│ continue│──┐   │  │
│  │   │ atom    │    │ tools   │    │ episode │  │   │  │
│  │   └─────────┘    └─────────┘    └─────────┘  │   │  │
│  │        ▲                                     │   │  │
│  │        └─────────────────────────────────────┘   │  │
│  │                     (loop until complete)        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  uses: BrainAtom (stateless, single turn)               │
│  adds: tool execution loop, episode management          │
└─────────────────────────────────────────────────────────┘
```

- **BrainAtom**: stateless, single inference, outputs tool invocations
- **BrainRepl**: wraps atom, executes tools via `tool.execute()`, loops until complete

## implement a BrainAtom supplier

atoms output tool invocations. the caller handles execution and continuation.

```ts
import { BrainAtom, BrainOutput, BrainPlugToolInvocation } from 'rhachet/brains';

const myAtom = new BrainAtom({
  repo: 'my-org',
  slug: 'my-atom',
  description: 'my brain atom supplier',
  spec: myBrainSpec,
  ask: async (input): Promise<BrainOutput<TOutput, 'atom', TPlugs>> => {
    // translate tools to provider format
    const providerTools = input.plugs?.tools?.map(toProviderFormat);

    // if prompt is tool executions, translate to provider format
    if (Array.isArray(input.prompt)) {
      const toolResults = input.prompt.map(execution => ({
        tool_call_id: execution.exid,
        content: JSON.stringify(execution.output),
        is_error: execution.signal !== 'success',
      }));
      // append to episode and continue...
    }

    // call provider API
    const response = await provider.complete({
      messages: buildMessages(input),
      tools: providerTools,
    });

    // if provider wants to call tools, output invocations
    if (response.tool_calls) {
      return new BrainOutput({
        output: null,
        calls: {
          tools: response.tool_calls.map(call => new BrainPlugToolInvocation({
            exid: call.id,           // provider's correlation id
            slug: call.name,         // tool slug
            input: call.arguments,   // parsed input
          })),
        },
        metrics: computeMetrics(response),
        episode: buildEpisode(input, response),
        series: null,
      });
    }

    // otherwise, return final output
    return new BrainOutput({
      output: parseOutput(response),
      calls: null,
      metrics: computeMetrics(response),
      episode: buildEpisode(input, response),
      series: null,
    });
  },
});
```

## implement a BrainRepl supplier

repls execute tools internally via `tool.execute()` and loop until complete.

```ts
import { BrainRepl, BrainOutput, asBrainPlugToolDict } from 'rhachet/brains';

const myRepl = new BrainRepl({
  repo: 'my-org',
  slug: 'my-repl',
  description: 'my brain repl supplier',
  spec: myBrainSpec,
  ask: async (input, context): Promise<BrainOutput<TOutput, 'repl', TPlugs>> => {
    const toolDict = asBrainPlugToolDict(input.plugs?.tools ?? []);
    let prompt = input.prompt;
    let episode = input.on?.episode;

    while (true) {
      // call atom (stateless, single turn)
      const result = await this.atom.ask({
        ...input,
        prompt,
        on: episode ? { episode } : undefined,
      });

      // if no tool calls, return final output
      if (!result.calls?.tools) {
        return new BrainOutput({
          output: result.output,
          calls: null,  // repl always returns null (tools executed internally)
          metrics: result.metrics,
          episode: result.episode,
          series: result.series,
        });
      }

      // execute tools via tool.execute()
      const executions = await Promise.all(
        result.calls.tools.map(async (invocation) => {
          const tool = toolDict[invocation.slug];
          if (!tool) throw new Error(`tool not found: ${invocation.slug}`);
          return tool.execute({ invocation }, context);
        }),
      );

      // continue episode with tool executions
      prompt = executions;
      episode = result.episode;
    }
  },
  act: async (input, context) => {
    // act typically wraps ask with task-completion schema
    return this.ask(input, context);
  },
});
```

## continuation flow

when a caller continues an atom episode with tool executions:

```
┌─────────────────────────────────────────────────────────────────┐
│ TIMELINE: atom tool continuation                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  t0: atom.ask({ prompt: "lookup customer" })                    │
│      └─→ BrainOutput { calls: { tools: [invocation] } }         │
│                                                                 │
│  t1: caller executes tool                                       │
│      └─→ BrainPlugToolExecution { exid, output, signal, ... }   │
│                                                                 │
│  t2: atom.ask({ prompt: [execution], on: { episode } })         │
│      └─→ BrainOutput { output: { summary: "..." } }             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

the `prompt: string | BrainPlugToolExecution[]` union makes tool results a first-class continuation mechanism. string prompts start conversations; execution arrays continue them after tool use.
