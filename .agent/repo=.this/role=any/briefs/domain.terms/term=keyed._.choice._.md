# domain.term: keyed

term.chosen   = keyed
term.kind     = adj
term.synonyms.forbidden:
- scoped
- specific
- targeted
- singular
- named

## .what

**an ask that names EXACTLY ONE key.** it is the precondition a reach rides on: a reach is an
identity axis of ONE key, so it is meaningless across a set the caller never named — which is
why a reach may only accompany a keyed ask.

⚠️ it does **not** mean "a key flag was passed", and it does **not** mean "not a whole-repo sweep".
those two near-misses are what make this term worth a record — see the disputes.

## ⚠️ the three ways it has been read, and why only one is right

`keyed` sits on `assertKeyrackReachRequiresKey`, whose own message names the rule:

> *"--reach requires a key: a reach is an identity axis of **ONE key**, so it is meaningless
> across a sweep"*

| how it was read | expressed as | correct? |
|-----------------|--------------|----------|
| exactly one key is named | `keys.length === 1` | ✅ **the term** |
| a key flag was given | `!!input.key` | ⚠️ correct **only** where the field is singular |
| the ask is not a whole repo | `!selector.repo` | ❌ admits an n-key ask |

the third shipped at `getKeyrackKeyGrants` and let a `keys: ['A','B','C']` ask through with one
reach threaded into all three — the exact ambiguity the term exists to prevent. an n-key ask is a
sweep of n, merely spelled with a list rather than a flag.

## .the invariant a reviewer can check

**`keyed` must be computed from the CARDINALITY of the selector, never from its shape.**

- a caller whose selector is a singular `key?: string` may write `!!input.key` — for that shape,
  truthiness and cardinality coincide
- a caller whose selector is plural (`keys: string[]`) must write `keys.length === 1`
- **no caller may compute it as the negation of another selector** (`!repo`, `for !== 'repo'`) —
  a negation says what the ask is *not*, and `keyed` is a claim about how many

## .refs

the operation the term is declared on:
- `src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey.ts`

the five call sites that compute it (⚠️ counts decay; re-derive with
`grep -rn 'keyed:' src` rather than trust this figure):
- `src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants.ts` — plural selector, `keys.length === 1`
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts` — singular, `!!input.key`
- `src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts` — singular, `!!input.key`
- `src/contract/cli/invokeKeyrack.ts` — `unlock` (singular) and `get` (see dispute 2)

## .reason
see the ref-level cluster beside this choice:
- `term=keyed._.choice.reason.md` — etymology, disputes, evidence
