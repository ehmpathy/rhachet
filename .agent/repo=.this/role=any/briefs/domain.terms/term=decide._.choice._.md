# domain.term: decide

term.chosen   = decide
term.kind     = verb
term.synonyms.disputed:
- is
- satisfy
- match

## .what

the verb on a **slug-comparison predicate** — a pure boolean that answers whether one keyrack
slug may stand for another.

⚠️ **this term is engaged, not endorsed.** `decide` sits **outside** the sanctioned operation
prefix set (`get` / `set` / `gen` / `del`, plus the `as*` / `is*` transformer prefixes) that
`rule.require.get-set-gen-verbs` closes. the two operations that carry it are pure boolean
predicates, which that rule maps to `is*` without ambiguity.

it is recorded here **conformed and disputed** rather than renamed, per
`rule.forbid.domain-term-synonyms`: *"if you touch a contract that already uses a forbidden
synonym, clean it up — but it may be left in place until disturbed."*

## .refs
- `src/domain.operations/keyrack/decideIsKeySlugEqual.ts`   # declares BOTH operations
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts:60`  # call site — the sdk read path
- `src/domain.operations/keyrack/adapters/vaults/os.daemon/vaultAdapterOsDaemon.ts:87`
  # call site — the daemon vault read path, **added 2026-08-06**
- `src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts:107`  # call site of the `ForEnv` twin

## .why it is conformed rather than renamed

a rename would touch 3 production call sites, 1 test file, 2 files whose prose cites the module
by name, and the module's own filename (`rule.require.sync-filename-opname`). none of that is
this feature's work, and to take it mid-review is the scope creep the same review rounds have
declined four times.

the sub-rule this round settled applies directly: **new code conforms to the word of the
contract it feeds.** the 2026-08-06 repair reused `decideIsKeySlugEqual` at a second read path
precisely so both paths would speak one word — a rename in the same breath would have traded
one inconsistency for another.

## .reason
see the ref-level cluster beside this choice:
- `term=decide._.choice.reason.md` — the two disputes, the evidence, the condition to close them
