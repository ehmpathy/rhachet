# review: has-consistent-mechanisms

## .what

examine whether new mechanisms duplicate extant functionality.

## new mechanisms introduced

| mechanism | purpose |
|-----------|---------|
| `promptLineInput` | read single line from stdin (visible) |
| `genMockPromptLineInput` | test mock for above |

## extant mechanisms examined

### promptHiddenInput

```ts
// src/infra/promptHiddenInput.ts
export const promptHiddenInput = async (input: {
  prompt: string;
}): Promise<string>
```

reads stdin with **hidden** echo (for secrets). uses `read -s` via shell.

### promptVisibleInput

searched for `promptVisibleInput` — does not exist.

### readline usage

searched for `createInterface` in src/:

1. `inferKeyrackMechForSet.ts` — **removed** (was raw readline, now uses `promptLineInput`)
2. no other usages in domain code

## comparison

| mechanism | echo | reads | use case |
|-----------|------|-------|----------|
| `promptHiddenInput` | hidden | all input until EOF | secrets |
| `promptLineInput` | visible | single line | mech selection |

**key difference**: `promptHiddenInput` is for secrets (hidden). `promptLineInput` is for visible prompts (mech selection).

## could we reuse promptHiddenInput?

no.

1. mech selection prompt must be visible (user sees options)
2. `promptHiddenInput` hides input — wrong UX
3. `promptHiddenInput` reads until EOF — we need single line

## could we extend promptHiddenInput?

a `{ visible?: boolean }` option would:
1. complicate the secret-focused purpose
2. mix concerns (secrets vs interactive prompts)
3. require behavioral switch in implementation

better: separate function for separate purpose.

## mock consistency

| mock | mocks |
|------|-------|
| `genMockPromptHiddenInput` | `promptHiddenInput` |
| `genMockPromptLineInput` | `promptLineInput` |

parallel structure. consistent names. separate queues (secrets vs mech choices).

## verdict

**holds** — `promptLineInput` serves a distinct purpose from `promptHiddenInput`. no duplication.

