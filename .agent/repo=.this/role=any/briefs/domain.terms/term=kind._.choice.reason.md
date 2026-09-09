# domain.term.choice.reason: kind

## .etymology

old english *gecynd* — "nature, race, the class a value belongs to by its own nature." the sense
we want is precisely that: a kind is not applied to a value from outside, it is **read off** what
the value already is. `asKeyrackSlugOrgKind` does not assign a kind to a slug; it reports the one
the slug already had.

so `kind` is plain english for *"which sort this is"*, and it was adopted here for a mechanical
reason rather than an aesthetic one: **`type` is a typescript keyword.**

a field named `type` in a `.ts` file forces a reader to disambiguate a language construct from a
domain fact on every encounter, and it reads especially badly at a declaration site —
`type FailureType = …` states the same word twice at two senses. `kind` carries the identical
domain sense with no collision.

the preference predates this cluster and is already stated as a rule
(`rule.prefer.kind-over-type`, mechanic). this file records the **term** the rule implies, per
`rule.require.domain-term-itemization`.

`kind` was chosen over five near-words, each rejected for a different reason:

- **`type`** — claimed by typescript, per the paragraphs above. `SlugType` collides with the
  language's own vocabulary in every sentence written about it, and a `slugType` field reads as a
  compile-time construct rather than a domain fact
- **`category`** — carries no partition promise. categories routinely overlap and are routinely
  incomplete, which is exactly the guarantee this word must not weaken
- **`class`** — overloaded twice over: the OO construct, and the css attribute. it also implies a
  hierarchy (subclass, superclass) the flat closed set does not have
- **`variant`** — implies members of one shape that differ in detail. our three answers are not
  variants of a slug; `bare` and `machine-wide` are not two flavors of one form
- **`flavor`** — informal, and implies an interchangeable choice. the kinds are not interchangeable

## .disputes

no dispute has been raised. `kind` was adopted without contest — it arrived with
`rule.prefer.kind-over-type` already settled repo-wide — and the rejected alternatives above were
weighed at declaration time rather than argued after. a dispute would be filed here.

## .evidence

### the closed-set property is the whole point, and it was learned from a defect

`asCloneSocketOmissionReasonError` originally ended with an **unguarded catch-all**: any fallback value
that matched no earlier branch fell through to the `host-incapable` error. the union sealed the
input, so the code was *correct* — and a peer review escalated it to a blocker anyway, because
correctness-by-accident is not a guard:

> a future third kind (`pty-crash`, `socket-bind-failed`) would be reported as a POSIX problem
> with a `--no-socket` cure, **with no type error and no red test to mark it.**

that is this repo's own defect class — a confident cure aimed at the wrong party — reproduced by
an open discriminant. the repair made the last branch an explicit `host-incapable` check and gave
the unmatched case its own **`MalfunctionError`** row, because *a kind we failed to classify is
ours, never the caller's*.

`asNpmInstallFailureKind` was declared afterward and inherited that shape from the start:

```ts
if (input.output.includes('EACCES') || input.output.includes('EPERM'))
  return 'permission-denied';
if (input.output.includes('ERR_PNPM_IGNORED_BUILDS'))
  return 'build-gate-blocked';
// .why = a GUARD, never a silent default.
return 'unclassified';
```

> **the durable rule: a kind's residual member must be named and reportable.** an unclassified
> row that says *"i do not know"* is a truthful report; a default that names the last real member
> is a confident wrong one.

### the say-file's member lists are hand-copied, and one of them DID drift

the `.choice._.md` say-file restates the members of `NpmInstallFailureKind` and
`CloneSlugClaimState` so a reader gets the shape without a file hop. that convenience has a
cost, and the cost was paid: the say-file once listed a **three-member** union after its source
had grown to **five**.

no guard existed to catch it, and none can cheaply — the writer is a `const` in a `.ts` file, the
copy is prose in a brief, and no compiler or test reads the two against each other. so the
say-file carries a permanent caution that the writer is authoritative, and this record is the case
behind it.

> this is the repo's recurrent class in its purest form: **a copy of a fact whose owner lives
> elsewhere.** prose is the worst-affected surface precisely because it has no gate at all — a
> stale copy in code reddens a build, while a stale copy in a brief simply misleads the next
> reader, quietly, until someone re-derives the truth.

### precedence between members is a DECISION, and it is pinned

when two members' conditions both hold, the order of the branches decides the answer — so the
order is a domain decision, not an accident of authorship. `asNpmInstallFailureKind.test.ts`
pins it in `[case4]`:

```
output carries BOTH 'ERR_PNPM_IGNORED_BUILDS' and 'EACCES'  →  'permission-denied'
```

the reason, recorded in the test itself: *a gated build hook is benign; a permission wall is not.*
to report the benign one would hide the defect. a reorder of the two branches would flip that and
break no other assertion — which is exactly why the row exists.

### why `mode` is a forbidden synonym — the direction of authorship

the distinction deserves a plain statement, because both words name a small closed set:

| | who decides the member | example |
|---|---|---|
| **kind** | derived from a value, by us | `asNpmInstallFailureKind({ output })` |
| **mode** | selected by the caller, up front | `--mode plan\|apply` |

so a `kind` is an **observation** and a `mode` is an **instruction**. a field that lets a caller
choose is a mode; a field that reports what we found is a kind. to swap them inverts who is
responsible for the value.

### why it is not `state`

`kind` and the repo's state nouns (`term=blocked`, `term=held`, `term=wedged`) both enumerate,
but a **state moves** and a **kind does not**. `CloneSlugClaimState` is instructive precisely
because it holds both: the object is a *state* (a claim's status changes as clones live and die),
and its discriminant field is a *kind* (`unclaimed | live | dead` — which shape of claim this is,
at the instant it was read).

### the defect a kind-cast closes

a kind-cast exists to close a **silent divergence** (`ehmpathy/rhachet#467`): two predicates
presented to a caller as a pair, built on no shared primitive.

| predicate | route for `@all.badenv.FOO` | answer |
|---|---|---|
| `isKeyrackSlugMachineWide` | `slug.split('.')[0] === '@all'` | **true** |
| `isKeyrackSlugRepoBound` | validated decode rejects `badenv` ⇒ null | **false** |

`@all.badenv.FOO` is neither — it is a bare key name that happens to hold dots. read as
machine-wide, the repo manifest load was SKIPPED, and the read then reported "add keyrack.yml to
repo" from inside a repo that has one. a **wrong answer**, not a failure — the exact class that
a branch-level test cannot see.

the shape this word names is what closes it: **one classifier over a closed set, with every
predicate derived from it.** the two cannot disagree, because no second parser exists to
disagree with.

### the invariant, and why the exhaustive sweep bears the weight

a kind promises a **partition**: mutually exclusive, jointly exhaustive. a row-by-row test of each
predicate cannot prove that promise — only a sweep over every kind can. so
`asKeyrackSlugOrgKind.test.ts [case4]` walks a 10-slug list and asserts:

1. the two predicates are never both true (exclusivity)
2. each predicate agrees with the classifier it derives from (no second parser crept back)
3. the `bare` set is pinned by value, so a slug that silently migrates between kinds shows as a
   diff rather than slips through unread

that third assertion is what makes the clamp outlive the round: a future fourth kind, or a
re-classified slug, fails at the sweep rather than in a credential path.

### the clamp has teeth

`rule.require.clamp-edge-cases` is satisfied: with `isKeyrackSlugMachineWide` on the bare
`split('.')[0]` form, **6 rows across 3 files go red** — every one an `@all.badenv.FOO` row. on
the classifier, all **1303 stand green**.
