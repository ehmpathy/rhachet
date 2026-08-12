# domain.term: flag

term.chosen   = flag
term.kind     = noun
term.status   = DECLARED
term.synonyms.forbidden:
- option (at the single-control position — see the split below)
- opt
- arg
- argument
- param
- parameter
- switch
- toggle

## .what

**one named control a human types on a command line** — the `--reach` in
`rhx keyrack unlock --key API_KEY --reach beav@ehmpathy.com`.

it names the *control*, never its value and never the bag that holds every control.

## ⚠️ flag vs opts — the split, and why `opts` is not a synonym

they sit one line apart in every cli handler, so the temptation is to call both the same word.
they are different granularities:

| | `flag` | `opts` |
|---|--------|--------|
| what | ONE named control a human types | the whole bag of parsed values |
| whose word | **ours** — the control a human meets | **commander's** — a third-party container |
| where it appears | our domain operations and their inputs | the boundary handler, verbatim from the vendor |
| example | `asKeyrackKeyReachFromFlag({ flag: opts.reach })` | `opts.reach`, `opts.env`, `opts.key` |

**`opts` stays** wherever commander hands it to us, because to rename a vendor's object at the
boundary hides where our code begins. **`flag` starts** the moment a value crosses into a domain
operation of ours. the one line above is exactly that boundary, and it reads as one.

## .why `flag` and not `option`

`option` is commander's word for the same control, and it is the closest call in this cluster.
`flag` wins on three grounds:

1. **it is already the repo's canonical word.** the ergonomist canon uses `flag` throughout —
   *"keep flags for real variation"*, *"a forced flag whose value is the same in nearly every
   common case"*, *"no name, flag, field, or output label may read more than one way"*. to
   introduce `option` beside it would be the synonym `rule.forbid.domain-term-synonyms` forbids
2. **`option` is overloaded in this repo** — `(input, options)` is a declared procedure pattern
   (`rule.require.input-options-pattern`), where `options` means *configuration of a pure
   operation*, not a cli control. one word, two senses
3. **`flag` names the human's act.** a human types a flag; a program receives an option. the
   domain here is the terminal surface, so the human's word is the true one

## .why not the rest

| word | why it is forbidden |
|------|---------------------|
| `opt` | an abbreviation of a word already rejected, and it reads as `optional` at a glance |
| `arg` / `argument` | an argument is POSITIONAL by convention; a flag is named. the repo forbids positional args outright (`rule.forbid.positional-args`), so to call a flag an arg would name it after the shape we refuse |
| `param` / `parameter` | function-signature vocabulary; it describes what a procedure declares, not what a human types |
| `switch` / `toggle` | both imply BOOLEAN. `--reach beav@ehmpathy.com` carries a value, so either word would be wrong for most of this repo's flags |

## .refs

the operation the term was declared on:
- `src/domain.objects/keyrack/asKeyrackKeyReachFromFlag.ts`
- `src/domain.objects/keyrack/asKeyrackKeyReachFromFlag.test.ts`

the boundary where `opts` becomes `flag` (five commands, one line each):
- `src/contract/cli/invokeKeyrack.ts` — `get`, `source`, `set`, `del`, `unlock`

⚠️ **counts decay; re-derive, never re-assert.** to cite a number, re-run
`grep -rn 'asKeyrackKeyReachFromFlag' src` rather than trust a prior figure.

## .reason
see the ref-level cluster beside this choice:
- `term=flag._.choice.reason.md` — etymology, disputes, evidence
