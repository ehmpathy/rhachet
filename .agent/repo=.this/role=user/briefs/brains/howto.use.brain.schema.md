# brain input: schema

## .what

output schema for structured responses. uses zod for type-safe validation.

## .shape

```ts
schema: {
  output: z.Schema<TOutput>;
}
```

## .usage

```ts
import { z } from 'zod';

const result = await context.brain.repl.ask({
  role,
  prompt: 'analyze this code for issues',
  schema: {
    output: z.object({
      issues: z.array(z.object({
        severity: z.enum(['error', 'warn', 'info']),
        message: z.string(),
        line: z.number().optional(),
      })),
      summary: z.string(),
    }),
  },
});

// result.output is typed as { issues: [...], summary: string }
```

## .why

- enforces structured output from brain responses
- provides compile-time type safety via zod inference
- enables reliable parse of brain outputs

## .note

the brain will format its response to match the schema. complex schemas may require clear prompts to guide the brain's output structure.

## .see also

- [zod documentation](https://zod.dev) — schema library
