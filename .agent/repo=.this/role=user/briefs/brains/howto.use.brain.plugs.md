# brain input: plugs

## .what

configuration plugs for brain instances. enables tools, memory, and access control.

## .shape

```ts
plugs?: {
  tools?: BrainPlugToolDefinition[];
  memory?: never;  // todo
  access?: never;  // todo
}
```

## .tools

tools that can be invoked by the brain for agentic workflows.

```ts
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

const customerLookup = genBrainPlugToolDeclaration({
  slug: 'customer-lookup',
  name: 'Customer Lookup',
  description: 'lookup customer by email',
  schema: {
    input: z.object({ email: z.string().email() }),
    output: z.object({ id: z.string(), name: z.string() }),
  },
  execute: async ({ invocation }, context) => {
    const customer = await context.stripe.customers.list({ email: invocation.input.email });
    return { id: customer.data[0].id, name: customer.data[0].name };
  },
});

const result = await context.brain.repl.act({
  role,
  prompt: 'lookup customer alice@example.com',
  plugs: { tools: [customerLookup] },
});
```

## .behavior by grain

| grain | tool behavior |
| ----- | ------------- |
| atom | outputs tool invocations for caller to execute |
| repl | executes tools internally via `tool.execute()` |

## .why

- enables agentic tool use workflows
- decouples tool definitions from brain implementations
- progressive complexity: no plugs → no null checks

## .see also

- [howto.for.tools](./howto.for.tools.md) — tool contracts and declaration
