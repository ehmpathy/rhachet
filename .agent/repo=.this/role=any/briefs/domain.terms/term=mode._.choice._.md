# domain.term: mode

term.chosen   = mode
term.kind     = noun
term.synonyms.forbidden:
- style
- format
- strategy
- behavior
- policy                           # RESERVED — already a term of its own (`term=policy`)

term.siblings:                     # the OTHER closed-set noun — a peer, never a synonym
- kind                             # ⚠️ the near-twin. see `.the one test that separates them`

## .what

**the behavior a command adopts, chosen by precedence among what the caller asked for.**

a `mode` is not a property the input HAS; it is a course of action the contract PICKS. its
answers are a closed set, and the choice is made by a stated order of precedence over caller
inputs — never read off a value.

```ts
as$NounMode = (input: { …caller inputs… }): 'a' | 'b' | 'c' => …
```

## .the one test that separates `mode` from `kind`

both are closed sets. both are `as*`/`get*` casts. both partition. so the shape cannot tell them
apart, and a reviewer needs the question that can:

> **does the answer describe the INPUT, or does it describe what the COMMAND WILL DO?**

| | `kind` | `mode` |
|---|---|---|
| answers | what this value IS | what this command WILL DO |
| derived from | the value itself | the caller's inputs, by precedence |
| two callers, same value | same answer, always | may differ — the flags differ |
| a wrong answer costs | a mis-classified value | a mis-taken action |

⚠️ **the two coexist in one file, one line apart** — `getRoleDeltaMode.ts:16` reads
`delta.kind !== 'absolute'` to compute a `mode`. the `kind` is what each delta IS; the `mode` is
whether the consumer will REPLACE or PATCH. that line is the clearest evidence the repo holds
that these are two concepts, not one word twice.

## .why a `mode` needs a stated precedence

a `kind` is read, so it cannot be ambiguous. a `mode` is CHOSEN, so two caller inputs can each
argue for a different answer — and the contract owes an order. that order is the mode-cast's
real content, and it belongs in the operation's own doc, never inferred from the branch order a
reader happens to trace (`rule.forbid.inline-decode-friction`).

## .refs

declared:
- src/domain.operations/keyrack/cli/asKeyrackGetOutputMode.ts
                                                      # `'value' | 'json' | 'vibes'`, chosen by a
                                                      #   stated precedence over `--value`,
                                                      #   `--output`, `--json`
- src/domain.operations/roles/deltas/getRoleDeltaMode.ts
                                                      # ⚠️ `'absolute' | 'incremental'` — reads a
                                                      #   `kind` to pick a `mode`, so the two
                                                      #   words sit one line apart

live on the published cli surface (the word's widest use):
- `--mode plan|apply` — the safe-by-default pair every skill that writes state carries
  (`rule.require.safe-by-default`)

the peer this term is defined against:
- `term=kind._.choice._.md`                           # what a value IS

## .reason

see the ref-level cluster beside this choice:
- `term=mode._.choice.reason.md` — etymology, the `kind` dispute, evidence
