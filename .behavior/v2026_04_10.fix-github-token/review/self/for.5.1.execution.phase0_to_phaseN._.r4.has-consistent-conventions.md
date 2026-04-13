# review: has-consistent-conventions (round 4)

## slowed down. questioned all of it again.

let me trace through the actual code files and compare patterns.

## file-by-file convention check

### 1. promptLineInput.ts

opened the file. compared to promptHiddenInput.ts.

| aspect | `promptHiddenInput.ts` | `promptLineInput.ts` |
|--------|------------------------|----------------------|
| location | `src/infra/` | `src/infra/` |
| export | `export const promptHiddenInput` | `export const promptLineInput` |
| signature | `async (input: { prompt: string }): Promise<string>` | `async (input: { prompt: string }): Promise<string>` |
| jsdoc | none | none |

**verdict**: identical structure.

### 2. mockPromptLineInput.ts

opened the file. compared to mockPromptHiddenInput.ts.

| aspect | `mockPromptHiddenInput.ts` | `mockPromptLineInput.ts` |
|--------|----------------------------|--------------------------|
| location | `src/.test/infra/` | `src/.test/infra/` |
| queue var | `mockPromptQueue` | `mockPromptLineQueue` |
| set fn | `setMockPromptValues` | `setMockPromptLineValues` |
| clear fn | `clearMockPromptValues` | `clearMockPromptLineValues` |
| gen fn | `genMockPromptHiddenInput` | `genMockPromptLineInput` |

**verdict**: parallel structure. queue names differentiated to avoid collision.

### 3. test file usage

opened `fillKeyrackKeys.integration.test.ts`. compared mock usage patterns.

extant pattern for hidden input:
```ts
import { genMockPromptHiddenInput, setMockPromptValues } from '@src/.test/infra/mockPromptHiddenInput';
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
```

new pattern for line input:
```ts
import { genMockPromptLineInput, setMockPromptLineValues } from '@src/.test/infra/mockPromptLineInput';
jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());
```

**verdict**: identical pattern.

### 4. inferKeyrackMechForSet.ts

opened the file. checked import and usage.

import:
```ts
import { promptLineInput } from '@src/infra/promptLineInput';
```

usage:
```ts
const answer = await promptLineInput({ prompt: '   choice: ' });
```

compared to secret prompt usage elsewhere:
```ts
const secret = await promptHiddenInput({ prompt: 'enter secret for ...' });
```

**verdict**: consistent call pattern.

## deeper: term choice consistency

searched for `Line` in codebase context:

- `promptLineInput` — new (describes: reads one line)
- no other `*Line*` functions in similar context

searched for `Hidden` in codebase context:

- `promptHiddenInput` — extant (describes: hides echo)

both follow the pattern: `prompt[Behavior]Input`.

## deeper: queue separation makes sense?

the hidden queue (`mockPromptQueue`) and line queue (`mockPromptLineQueue`) are separate.

why?
- secrets and mech choices are interleaved in test flow
- separate queues let tests set both independently
- `setMockPromptValues(['secret1', 'secret2'])` for secrets
- `setMockPromptLineValues(['1', '2'])` for mech choices

this matches the test setup:
```ts
setMockPromptLineValues(['1', '1']);  // mech selection (2 keys)
setMockPromptValues(['api-key-value-1', 'secret-token-value-2']);  // secrets
```

**verdict**: separation is intentional and correct.

## final verdict

**holds** — all conventions match. file locations, names, signatures, import patterns, and mock patterns all follow extant structure.

