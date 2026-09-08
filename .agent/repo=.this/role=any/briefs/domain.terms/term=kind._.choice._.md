# domain.term: kind

term.chosen   = kind
term.kind     = noun
term.synonyms.forbidden:
- type
- category
- variant
- flavor
- class
- mode

## .what

**the closed set a value belongs to — a discriminant, named from the domain, never from the
type system.** a `kind` answers *"which of the several cases is this?"* and its answer is one of
a finite, enumerated set.

declared uses — **the sites, never their members:**

```
NpmInstallFailureKind    NPM_INSTALL_FAILURE_KINDS
                         └ src/domain.operations/upgrade/asNpmInstallFailureKind.ts
CloneSlugClaimState      the `kind` field
                         └ src/domain.operations/clone/computeCloneSlugDecision.ts
```

⚠️ **the members are elided on purpose, and the omission is the point.** each writer above owns
its own list; a copy here would be a second owner of a fact it does not declare, free to drift
the moment a member lands — and prose is the worst-affected surface, because it has no gate at
all. a caution beside such a copy is no substitute: it asks a reader to distrust the line rather
than removes the reason to. read the members at the writer.

## .why it earns a word

because **`type` is taken by typescript.** every `.ts` file already uses `type` as a keyword, so
a field named `type` forces every reader to disambiguate a language construct from a domain fact
on each encounter. `kind` carries the same sense and collides with no keyword.

`rule.prefer.kind-over-type` (mechanic) states the preference; this cluster records the term.

## .the property it guarantees

**a kind is CLOSED, and its residual case is explicit.** that is the whole reason to name it
rather than let a bare string stand in:

the shape that carries it — **ONE list, and every other reader derived from it**:

```ts
export const NPM_INSTALL_FAILURE_KINDS = [
  /* … the domain's cases … */
  'unclassified',   // ← a GUARD, never a silent default
] as const;

export type NpmInstallFailureKind = (typeof NPM_INSTALL_FAILURE_KINDS)[number];

export const isNpmInstallFailureKind = (value: unknown): value is NpmInstallFailureKind =>
  NPM_INSTALL_FAILURE_KINDS.includes(value as NpmInstallFailureKind);
```

the members are elided above on purpose — `asNpmInstallFailureKind.ts` declares them, and a copy
here would be one more reader to drift. what the illustration teaches is the **shape**: the type
and the guard are both derived, so a new member reaches every reader by construction.

⚠️ **the residual member is the one that carries the load.** a kind whose unmatched case falls
into the last real member reports the wrong cause with full confidence — and no type error and no
red test marks it. both declared kinds in this repo were repaired on exactly those grounds:
`asCloneSocketOmissionReasonError`'s catch-all became an explicit `host-incapable` guard with an
unclassified row of its own, after a peer review named the hazard.

> **a kind with an implicit default is not closed — it is open with a lie on the end.**

## .the test — is it a kind, or a state?

> **does it describe WHICH CASE this is, or WHERE IN A LIFECYCLE it sits?**

- which case → `kind` (a failure's cause; a claim's shape)
- where in a lifecycle → a state noun (`term=blocked`, `term=held`, `term=wedged`)

a kind does not move. a state does.

## .refs
- `src/domain.operations/upgrade/asNpmInstallFailureKind.ts`        # the declared kind + its owner
- `src/domain.operations/upgrade/asNpmInstallFailureKind.test.ts`   # every row, plus precedence
- `src/domain.operations/upgrade/asNpmInstallFailureError.ts`       # the kind decides the error CLASS
- `src/domain.operations/upgrade/asNpmInstallFailureKindFromError.ts` # reads the kind back off metadata
- `src/domain.operations/upgrade/execUpgrade.ts`                    # `asGlobalUpgradeFailureHeaderKind` — a NARROWED kind
- `src/domain.operations/clone/computeCloneSlugDecision.ts`         # `CloneSlugClaimState.kind`

## .a kind may be NARROWED, and the narrower gets its own transformer

`asGlobalUpgradeFailureHeaderKind` maps the full kind onto `Exclude<…, 'build-gate-blocked'>`,
because a header may render one member fewer than an arbitrary error may carry. the narrowed
type is DERIVED off the one list, never a second list — so a future member reaches both by
construction, and the exclusion states which member is forbidden rather than leaves a reader to
infer it from a ternary.

## .not a synonym of

- 👎 `type` — collides with the typescript keyword; the whole reason `kind` was adopted
- 👎 `mode` — a mode is *selected by a caller* (`--mode plan|apply`); a kind is *derived from a
  value*. the direction of authorship is opposite
- 👎 `variant` / `flavor` — imply the members differ in degree; a kind's members are disjoint
- 👎 `class` — collides with both the js keyword and the error-class sense already in use
  (`ConstraintError` vs `MalfunctionError`)

## .reason
see the ref-level cluster beside this choice:
- `term=kind._.choice.reason.md` — etymology, the rejected synonyms, evidence
