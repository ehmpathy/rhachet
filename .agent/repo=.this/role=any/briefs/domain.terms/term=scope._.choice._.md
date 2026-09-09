# domain.term: scope

term.chosen   = scope
term.kind     = noun
term.synonyms.forbidden:
- context
- reach
- extent
- bounds
- artifacts
- surroundings

## .what

**the repo artifacts an ask reaches, fetched together as one pair.**

```ts
{ gitroot: string | null; repoManifest: KeyrackRepoManifest | null }
```

a scope is what the ask **can see of a repo** — never the ask itself, and never the answer. the
two fields are one term because one rule decides both: *does this ask consult a repo?* to fetch
them apart is the defect class the term was itemized to close.

| term | what it names |
|---|---|
| `ask` | what the caller wants (`for` + `org`) |
| **`scope`** | **what the ask reaches of a repo (`gitroot` + `repoManifest`)** |
| `grant` | the answer the ask yields |

## ⚠️ a scope has TWO axes, and each fails silently in one direction

the word earns a cluster because one operation now answers two separate questions, and a wrong
answer to either is a **successful run with a wrong result** rather than a throw:

| axis | the question | a wrong answer looks like |
|---|---|---|
| is a manifest owed? | does this ask consult a repo keyrack.yml? | a throw for a key that needs none, OR a skipped `ORG_MISMATCH` guard |
| what does no repo mean? | refuse the ask, or narrow it? | a refused credential path, OR a mutation against a manifest it never had |

the second axis is `onNoRepo`, and it turns on the ask's **arity**, never on the verb's name:

| arity | verbs | no repo means |
|---|---|---|
| a keyed MUTATION | `set`, `del`, `fill`, `firewall` | `refuse` — it names one repo key, and no repo declares it |
| a SWEEP | `unlock` | `tolerate` — it narrows to the machine-wide set it can still reach |

⇒ `onNoRepo` is **spelled at every call site, never defaulted.** a wrong default is silent.

## .the invariant a reviewer can check

**a scope is fetched by exactly one operation, and its refusal is rendered at exactly one
boundary.** a call site that fetches the pair by hand, or that guards the refusal beside the
call, is the recurrence this term exists to name.

- ✅ `getOneKeyrackRepoScopeForAsk({ for, org, from, onNoRepo })` — THE fetch; it THROWS its refusal
- ✅ `KeyrackCommand` — the ONE boundary that renders that throw as the blocked tree
- ❌ a `getGitRepoRoot(…)` + `daoKeyrackRepoManifest.get(…)` pair spelled at a call site
- ❌ a `try { … } catch (ConstraintError)` placed **beside** the fetch rather than at the boundary

⚠️ a cli twin (`…OrEmitBlocked`) once carried the render and was **deleted**. once `KeyrackCommand`
caught every `ConstraintError` a keyrack action throws, the twin only duplicated it — and its
`process.exit(2)` contradicted `emitKeyrackBlockedReport`'s own guarantee that it sets
`process.exitCode` so queued stdout still flushes. **the fetch throws; the boundary renders. one
of each.**

⚠️ the strict `getGitRepoRoot` import is **deleted** from `invokeKeyrack.ts`. that deletion is the
enforcement: a hand-rolled scope is a compile error, not a review note.

## ⚠️ the homograph — a REVIEW scope is a different word, and it is not ours

`rhx review` calls the set of files it is handed a **scope** — `--paths`, *"reduce scope or use
`--focus pull`"*, `input.scope.debug.json`. that is a second sense of the same word, and it turns
up constantly in this repo's route artifacts.

it is **not a drift of this term, and not a synonym to police.** it is `bhrain`'s vocabulary,
imported — and imported vocab is out of this glossary's bounds by `rule.require.domain-term-itemization`.

| the word | whose | what it names |
|---|---|---|
| `scope` (this cluster) | ours | what an ask reaches of a repo — `{ gitroot, repoManifest }` |
| `scope` (review) | bhrain's | the file set a reviewer is handed |

⇒ the boundary that keeps them apart: **ours is what an ask REACHES; theirs is what a tool is
GIVEN.** in a keyrack contract — a dobj, a dop, an interface — only this cluster's sense is legal.
prose about a review may use theirs, since that is the word its own tool prints.

## .refs

the operations the term is declared on:
- `src/domain.operations/keyrack/cli/getOneKeyrackRepoScopeForAsk.ts` — THE fetch
- `src/domain.operations/keyrack/getOneKeyrackRepoManifestForAsk.ts` — the manifest half, shared
- `src/contract/cli/KeyrackCommand.ts` — the boundary that renders the fetch's refusal

the verbs that fetch a scope:
- `src/contract/cli/invokeKeyrack.ts` — `set`, `del`, `unlock`, `fill`, `firewall`

terms a scope is defined against:
- `term=ask._.choice._.md` — a scope is fetched FOR an ask; it is not the ask
- `term=keyed._.choice._.md` / `term=sweep._.choice._.md` — the arity that fixes `onNoRepo`
- `term=machine-wide._.choice._.md` — the ask kind that owes no scope at all

## .reason
see the ref-level cluster beside this choice:
- `term=scope._.choice.reason.md` — etymology, disputes, evidence
