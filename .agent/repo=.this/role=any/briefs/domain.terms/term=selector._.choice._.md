# domain.term: selector

term.chosen   = selector
term.kind     = noun
term.synonyms.forbidden:
- filter
- scope
- override
- qualifier

## .what

**a value that PICKS one segment of the slug a keyed ask names.** a selector never touches a set
— there is no set; a keyed ask names exactly one key, and the selector settles one segment of its
identity.

its sharpest contrast is `filter`, which is the **same flag on a different arity**:

| arity | the flag does | absent value expands to |
|---|---|---|
| a **keyed** ask (`get`, `set`, `del`, `source --key`) | **selects** a slug segment | **ABSENT** — the manifest the lookup holds decides |
| a **sweep** verb (`status`, `list`, `unlock`, bare `source`) | **filters** the swept set | **no filter** — the verb's extant scope stands |

## .the invariant a reviewer can check

**a selector expands `@this` to ABSENT, never to the literal org.** this is the OPPOSITE of the
filter's expansion, and that opposition is what the two words exist to carry:

| arity | `@this` expands to | why |
|---|---|---|
| filter | the LITERAL org | it compares against host slugs, which carry a literal segment |
| selector | ABSENT | it hands the choice to the manifest the lookup already holds |

- ✅ `if (input.org === '@this') return undefined` — the sigil MEANS the manifest's org, and
  absent is how the lookup spells that
- ❌ `return manifest.org` for a selector — re-arms the `ORG_MISMATCH` guard against the one
  value that names that very manifest, so a correct ask throws
  `org '@this' does not match manifest org 'testorg'`

⚠️ a single cast that served both arities would have to pick one expansion, and either pick breaks
the other verb **silently** — a wrong answer, never a throw. two casts is what makes the two
expansions legible.

## .refs

the operation the term is declared on:
- `src/domain.operations/keyrack/asKeyrackSelectorOrg.ts`

the keyed asks whose `--org` is a selector:
- `src/contract/cli/invokeKeyrack.ts` — `get`, `source --key`

the clamps that hold the split executable:
- `src/domain.operations/keyrack/asKeyrackSelectorOrg.test.ts` — the expansion rule, incl.
  `@thisorg` so the sigil test stays an EXACT match
- `blackbox/cli/keyrack.machine-wide-skips-manifest.acceptance.test.ts` — `[case2][t4]` reads a
  bare repo key by `--org @this` on BOTH keyed verbs in one row, so they cannot diverge in silence
- `blackbox/cli/keyrack.org.help.acceptance.test.ts` — `[case2]` selectors state `default: @this`

## .reason
see the ref-level cluster beside this choice:
- `term=selector._.choice.reason.md` — etymology, disputes, evidence
