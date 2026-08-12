# domain.term: source

term.chosen   = source
term.kind     = verb
term.synonyms.forbidden:
- load
- inject
- hydrate
- import
- populate

## .what
put credential values into the CURRENT process environment, rather than emit them for
another process to read.

## .not a synonym of
`export` is a live, distinct term in this repo — it EMITS `export FOO=…` statements for a
shell to eval. `source` puts values into the env that is already live. one hands text to a
caller; the other mutates the caller. see the reason file.

## .refs
- src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts   # the operation
- src/contract/sdk.keyrack.ts                              # `keyrack.source`
- src/contract/cli/invokeKeyrack.ts                        # `rhx keyrack source`
- blackbox/sdk/keyrack.source.acceptance.test.ts
- blackbox/cli/keyrack.source.cli.acceptance.test.ts

## .reason
see the ref-level cluster beside this choice:
- `term=source._.choice.reason.md` — etymology, disputes, evidence
