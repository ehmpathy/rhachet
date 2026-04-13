# review: has-consistent-mechanisms (round 3)

## slowed down. tea in hand. fresh perspective.

let me question all of it again.

## new mechanisms introduced

1. `promptLineInput` — read single visible line from stdin
2. `genMockPromptLineInput` — test mock for above

## systematic search for extant mechanisms

### search 1: prompt-related functions

```bash
grep -r "prompt" src/infra/ --include="*.ts"
```

found:
- `promptHiddenInput.ts` — reads stdin with hidden echo (for secrets)

no `promptVisibleInput` or `promptLineInput` existed before.

### search 2: readline usage

```bash
grep -r "createInterface" src/ --include="*.ts"
```

found:
- `inferKeyrackMechForSet.ts` — **removed** (was raw readline, now uses `promptLineInput`)

no other readline usage in domain code.

### search 3: stdin read operations

```bash
grep -r "process.stdin" src/ --include="*.ts"
```

found:
- `promptHiddenInput.ts` — uses `read -s` via shell
- `promptLineInput.ts` — uses readline

both use stdin, but for different purposes.

## detailed comparison

| aspect | `promptHiddenInput` | `promptLineInput` |
|--------|---------------------|-------------------|
| echo | hidden (for secrets) | visible |
| reads | all input until EOF | single line |
| impl | shell `read -s` | node readline |
| use case | passwords, tokens | mech selection |

## why not reuse promptHiddenInput?

walked through the actual code:

```ts
// promptHiddenInput reads all stdin, hidden
export const promptHiddenInput = async (input: {
  prompt: string;
}): Promise<string> => {
  const isInteractive = process.stdin.isTTY;
  if (!isInteractive) {
    // reads ALL stdin
    return await new Promise((accept) => {
      let data = '';
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => accept(data.trim()));
      process.stdin.resume();
    });
  }
  // uses shell read -s (hidden)
  return execSync(...)
};
```

this would not work for mech selection because:
1. `read -s` hides input — user cannot see what they type
2. reads all stdin until EOF — we need just one line
3. semantically wrong — secrets vs interactive choices

## why not extend promptHiddenInput?

hypothetical extension:

```ts
export const promptHiddenInput = async (input: {
  prompt: string;
  visible?: boolean;  // new option
  singleLine?: boolean;  // new option
}): Promise<string>
```

this would:
1. conflate two different purposes in one function
2. require branch logic inside
3. make the function name mislead (`Hidden` but can be visible?)

better: purpose-specific functions with clear names.

## mock consistency check

| production | mock | queue |
|------------|------|-------|
| `promptHiddenInput` | `genMockPromptHiddenInput` | `setMockPromptValues` |
| `promptLineInput` | `genMockPromptLineInput` | `setMockPromptLineValues` |

parallel structure. separate queues make sense: secrets are separate from mech choices.

## what about test-fns utilities?

searched for prompt utilities in test-fns — none found. the mock pattern is local to this codebase.

## verdict

**holds** — `promptLineInput` is a distinct mechanism from `promptHiddenInput`. they serve different purposes (visible single-line vs hidden all-input). no duplication.

