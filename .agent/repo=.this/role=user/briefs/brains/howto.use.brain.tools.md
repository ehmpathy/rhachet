# brain tool use contracts

## .what

rhachet provides typed contracts for tool use that work across both BrainAtom and BrainRepl.

## contracts

| contract | what | when |
| -------- | ---- | ---- |
| `BrainPlugToolDefinition` | declares a tool with schema + execute | define tools |
| `BrainPlugToolInvocation` | brain's request to call a tool | atom outputs these |
| `BrainPlugToolExecution` | result after tool runs | continue episodes |

## declare tools

use `genBrainPlugToolDeclaration` to create tools with type inference:

```ts
import { genBrainPlugToolDeclaration } from 'rhachet/brains';
import { z } from 'zod';

const customerLookupTool = genBrainPlugToolDeclaration({
  slug: 'customer-lookup',
  name: 'Customer Lookup',
  description: 'lookup customer by email',
  schema: {
    input: z.object({ email: z.string().email() }),
    output: z.object({ id: z.string(), name: z.string() }),
  },
  execute: async ({ invocation }, context) => {
    // invocation.input is typed as { email: string }
    const customer = await context.stripe.customers.list({
      email: invocation.input.email,
    });
    if (!customer.data[0]) {
      throw new BadRequestError('customer not found');
    }
    // return type enforced as { id: string, name: string }
    return { id: customer.data[0].id, name: customer.data[0].name };
  },
});
```

the factory wraps your execute function to:
- measure execution time
- classify errors (`BadRequestError` → `'error:constraint'`, else → `'error:malfunction'`)
- return `BrainPlugToolExecution` with exid, slug, input, output, signal, metrics

## tool lookup

use `asBrainPlugToolDict` for O(1) tool lookup with per-slug type preservation:

```ts
import { asBrainPlugToolDict } from 'rhachet/brains';

const tools = [customerLookupTool, invoiceTool] as const;
const toolDict = asBrainPlugToolDict(tools);

// known slug → specific type
const customer = toolDict['customer-lookup'];  // typeof customerLookupTool

// dynamic slug → union type
const tool = toolDict[invocation.slug];  // union | undefined
```

## signal semantics

`BrainPlugToolExecution` is a discriminated union — signal narrows the output type:

| signal | output type | http analogy | when |
| ------ | ----------- | ------------ | ---- |
| `'success'` | `TOutput` | 2xx | tool completed normally |
| `'error:constraint'` | `{ error: Error }` | 4xx | input or business constraint |
| `'error:malfunction'` | `{ error: Error }` | 5xx | unexpected failure |

```ts
// genBrainPlugToolDeclaration classifies errors automatically:
// - BadRequestError → 'error:constraint'
// - any other error → 'error:malfunction'

// type narrows based on signal
if (execution.signal === 'success') {
  execution.output; // TOutput
} else {
  execution.output.error; // Error
}
```
