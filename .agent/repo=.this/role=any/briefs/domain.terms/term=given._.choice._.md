# domain.term: given

term.chosen   = given
term.kind     = adj (suffix — `<field>Given`)
term.synonyms.forbidden:
- passed
- supplied
- provided
- input
- actual
- received
- raw

## .what

**a suffix that marks a metadata field as an ECHO of what the caller typed, rather than a claim
about what the value IS.**

`envGiven: 'stage'` says *"you typed `stage`"*. `env: 'stage'` says *"the env is `stage`"*. in a
refusal that just spelled the valid set, those two read oppositely — and only one of them is true.

## .the boundary that earns the suffix

> **`*Given` in a refusal that echoes rejected input; bare wherever the field states a fact.**

| the field is… | shape | example |
|---|---|---|
| the value the caller typed, which the message just **rejected** | `<field>Given` | `envGiven: 'stage'` beside *"must be one of test, prep, prod"* |
| a fact the reader did not have, whether or not the caller typed it | bare `<field>` | `owner: 'ehmpath'` beside *"host manifest not found"* |

⇒ **the test: does the message's own text already declare what this field SHOULD be?**
yes → the field is the rejected echo → `*Given`.
no → the field is a fact → bare.

## .why the bare form MISLEADS in a refusal

a refusal spells the valid set in its message. a bare leaf beneath it lands as a **second claim
about the same axis** — so the render says two contradictory things at once:

```
✋ ConstraintError: invalid --env: must be one of test, prep, prod
   ├─ env: stage          ← "the env is stage"  … but you just said it cannot be
   └─ fix: pass --env test
```

with the suffix, the pair is one coherent sentence — a rule and the input that broke it:

```
✋ ConstraintError: invalid --env: must be one of test, prep, prod
   ├─ envGiven: stage     ← "you typed stage"
   └─ fix: pass --env test
```

## .the counterexample that fixes the line

`invokeKeyrack.ts:1397-1399` — *"host manifest not found"*, metadata `{ owner }`.

`owner` is **bare, and correctly so**: the message never declares what the owner ought to be, so
the field adds a fact (*which* owner's manifest is absent) rather than an echo of a rejection.
rename it `ownerGiven` and it would claim a rejection the message never made.

⚠️ so the suffix is **not** "every field the caller supplied". a caller-supplied value that the
message does not reject stays bare.

## .refs

`*Given` sites, all refusals:

- `src/contract/cli/invokeKeyrack.ts` — `envGiven` `:1648` `:1914` `:2248` `:2426` `:2738`;
  `forGiven` `:576`; `vaultGiven` `:1290`; `mechGiven` `:1358`; `intoGiven` `:2746`
- `src/domain.operations/keyrack/cli/asKeyrackGetOutputMode.ts:63` — `outputGiven`

the bare counterexample:

- `src/contract/cli/invokeKeyrack.ts:1397-1399` — `{ owner }` states a fact

## .reason

see the ref-level cluster beside this choice:
- `term=given._.choice.reason.md` — etymology, disputes, evidence

## .see also

- `term=report._.choice._.md` — the render this suffix appears in; its invariant is that every
  leaf carries a FACT, which is exactly what a bare-in-a-refusal leaf fails
- `rule.forbid.ambiguous-labels` — one label, one reading
- `rule.prefer.symmetric-term-pairs` — why every peer gate carries the same suffix
