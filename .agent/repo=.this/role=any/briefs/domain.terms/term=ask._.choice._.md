# domain.term: ask

term.chosen   = ask
term.kind     = noun
term.synonyms.forbidden:
- request
- query
- input
- call
- invocation

## .what

**what a caller wants of keyrack on one invocation.** an ask has exactly two dimensions:

| dimension | field | what it states |
|---|---|---|
| the **selector** | `for` | WHAT is named — a list of keys, or the repo as a whole |
| the **provenance** | `org` | WHICH org's namespace those come from |

an ask is the caller's **intent**, and is distinct from three neighbours it is easy to collapse
into:

- the **verb** that serves it (`get`, `unlock`, `del`) — many verbs serve one ask shape
- the **grants** it yields — the ask is the question, the grants are the answer
- the **slug** — one slug is a fully-qualified key; an ask may name zero, one, or n

## ⚠️ the two dimensions must be read TOGETHER

this is why the word earns a cluster rather than a mention in prose. before `asKeyrackAskOrg`,
every load site read **one** dimension and called the result "the org" — so an ask that named an
`@all` key with no `--org` flag was read as org-less, and a repo manifest was loaded for a read
that never consults one (`ehmpathy/rhachet#467`).

an ask states its provenance **two ways**, and their no-provenance defaults disagree:

| surface | `--org` omitted yields |
|---|---|
| cli | `'@this'` |
| sdk | `null` |

⇒ a predicate over an ask must test **positively** for `'@all'`. a negative test (`org !== '@this'`)
reads the sdk's `null` as machine-wide and disables the `ORG_MISMATCH` guard wholesale.

## .the invariant a reviewer can check

**an ask's org is read by exactly one cast.** a load site that hand-rolls the two-dimension read is
the defect class this term was itemized to close.

- ✅ `asKeyrackAskOrg({ for, org })` — the one canonical read
- ✅ `isKeyrackAskMachineWide({ for, org })` — the boolean built on it
- ❌ a bare `opts.org === '@all'` at a load site — it drops the selector dimension

## .refs

the operations the term is declared on:
- `src/domain.operations/keyrack/asKeyrackAskOrg.ts` — THE canonical cast
- `src/domain.operations/keyrack/isKeyrackAskMachineWide.ts` — the boolean built on it

the load sites that read an ask to decide whether a manifest is owed:
- `src/domain.operations/keyrack/genContextKeyrackGrantGet.ts`
- `src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants.ts`
- `src/contract/cli/invokeKeyrack.ts`

terms that are defined in terms of an ask:
- `term=keyed._.choice._.md` — *"an ask that names EXACTLY ONE key"*
- `term=sweep._.choice._.md` — an ask whose selector is a set, not one key

## .reason
see the ref-level cluster beside this choice:
- `term=ask._.choice.reason.md` — etymology, disputes, evidence
