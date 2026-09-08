# domain.term.choice.reason: kind

## .etymology

`kind` is plain english for *"which sort this is"*, and it was adopted here for a mechanical
reason rather than an aesthetic one: **`type` is a typescript keyword.**

a field named `type` in a `.ts` file forces a reader to disambiguate a language construct from a
domain fact on every encounter, and it reads especially badly at a declaration site —
`type FailureType = …` states the same word twice at two senses. `kind` carries the identical
domain sense with no collision.

the preference predates this cluster and is already stated as a rule
(`rule.prefer.kind-over-type`, mechanic). this file records the **term** the rule implies, per
`rule.require.domain-term-itemization`.

## .disputes

no dispute has been raised. `kind` was adopted without contest, and the rejected alternatives
below were weighed at declaration time rather than argued after.

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
