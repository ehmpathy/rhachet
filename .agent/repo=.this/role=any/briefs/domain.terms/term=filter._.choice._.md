# domain.term: filter

term.chosen   = filter
term.kind     = noun
term.synonyms.forbidden:
- selector
- scope
- match
- constraint
- narrower

## .what

**a value that NARROWS a set the verb already swept.** a filter never grows the set and never
names a member that was absent from it — it only removes.

its sharpest contrast is `selector`, which is the **same flag on a different arity**:

| arity | the flag does | absent value means |
|---|---|---|
| a **sweep** verb (`status`, `list`, `unlock`, `source`) | **filters** the swept set | no filter — the verb's extant scope stands |
| a **keyed** ask (`get`, `set`, `del`) | **selects** a slug segment | a default segment (`@this`) |

⚠️ the two arities need **opposite** defaults. a filter that defaulted to `@this` would silently
drop every machine-wide key from a sweep that always included them.

## .the invariant a reviewer can check

**a filter's absent value is `null`, and `null` means the verb's extant scope.** a filter is what
makes a new flag additive: a caller who passes none must observe byte-identical behavior to the
day before the flag existed.

- ✅ `if (!input.org) return null` — an absent flag is no filter at all
- ❌ `const org = input.org ?? '@this'` — a default that narrows is a scope change dressed as a
  flag

## .refs

the operation the term is declared on:
- `src/domain.operations/keyrack/cli/getOneKeyrackFilterOrg.ts`

the sweep verbs whose `--org` is a filter:
- `src/contract/cli/invokeKeyrack.ts` — `source`, `unlock`, `status`, `list`

the clamps that hold the split executable:
- `blackbox/cli/keyrack.org.help.acceptance.test.ts` — `[case1]` filters state `default: no
  filter`; `[case2]` selectors state `default: @this`

## .reason
see the ref-level cluster beside this choice:
- `term=filter._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=selector._.choice._.md` — the other arity of the same flag
