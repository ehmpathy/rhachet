# genContextBrain

## .what

factory to create a brain context with discovery or explicit brains.

## .modes

| mode | input | returns | when |
| ---- | ----- | ------- | ---- |
| discovery | `{ choice }` | `Promise<ContextBrain>` | auto-discover installed `rhachet-brains-*` packages |
| explicit | `{ brains, choice }` | `ContextBrain` | pass brains directly, no discovery |

## .discovery mode (async)

auto-discover installed brain packages. useful when you want skills that work with any brain supplier.

```ts
import { genContextBrain } from 'rhachet/brains';

const context = await genContextBrain({ choice: 'anthropic/claude-sonnet' });
```

## .explicit mode (sync)

pass brains directly. no discovery. synchronous.

```ts
import { genContextBrain } from 'rhachet/brains';
import { genBrainRepl } from 'rhachet-brains-anthropic';

const repl = genBrainRepl({ slug: 'anthropic/claude-sonnet' });
const context = genContextBrain({ brains: { repls: [repl] }, choice: 'anthropic/claude-sonnet' });
```

## .choice variants

```ts
// string: match any atom or repl
genContextBrain({ choice: 'anthropic/claude-sonnet' })

// typed: match repl only
genContextBrain({ choice: { repl: 'anthropic/claude-sonnet' } })

// typed: match atom only
genContextBrain({ choice: { atom: 'anthropic/claude-sonnet' } })

// no choice: context.brain.choice is null
genContextBrain({})
```

## .context shape

```ts
interface ContextBrain<TChoice> {
  brain: {
    atom: {
      ask: (input) => Promise<BrainOutput>;
    };
    repl: {
      ask: (input) => Promise<BrainOutput>;
      act: (input) => Promise<BrainOutput>;
    };
    choice: TChoice;  // the pre-bound brain, or null
  };
}
```

## .errors

| error | when |
| ----- | ---- |
| `BrainChoiceNotFoundError` | choice does not match any available brain |
| `BadRequestError` | choice matches multiple brains (ambiguous) |

```ts
import { BrainChoiceNotFoundError } from 'rhachet/brains';

try {
  return await genContextBrain({ choice: 'typo/brain-name' });
} catch (error) {
  if (error instanceof BrainChoiceNotFoundError) {
    console.error(error.message);  // includes list of available brains
    process.exit(1);
  }
  throw error;
}
```

## .see also

- [howto.use.brain.role](./howto.use.brain.role.md) — role input
- [howto.use.brain.prompt](./howto.use.brain.prompt.md) — prompt input
