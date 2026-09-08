# domain.term: kind

term.chosen   = kind
term.kind     = noun
term.synonyms.forbidden:
- type
- category
- variant
- flavor
- class
- mode                             # ⚠️ forbidden as a SYNONYM only — it is a live peer term

term.siblings:                     # the OTHER closed-set noun — a peer, never a synonym
- mode                             # ⚠️ the near-twin. see `.the near-twin: mode`

## .what

**the closed set a value belongs to — a discriminant, named from the domain, never from the
type system.** a `kind` answers *"which of the several cases is this?"* and its answer is one of
a finite, enumerated set.

more strictly: it is **the one closed set a value belongs to, read by a classifier that partitions
its whole domain.** a `kind` is not a label a value carries; it is an answer a cast computes, and
the answers are mutually exclusive and jointly exhaustive over the input.

the shape it names:

```ts
as$NounKind = (input: {...}): 'a' | 'b' | 'c' => …
```

declared uses — **the sites, never their members:**

```
NpmInstallFailureKind    NPM_INSTALL_FAILURE_KINDS
                         └ src/domain.operations/upgrade/asNpmInstallFailureKind.ts
CloneSlugClaimState      the `kind` field
                         └ src/domain.operations/clone/computeCloneSlugDecision.ts
KeyrackSlugOrgKind       asKeyrackSlugOrgKind
                         └ src/domain.operations/keyrack/asKeyrackSlugOrgKind.ts
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

the collision is visible at both ends of a declaration: a `slugType` field reads as a compile-time
construct rather than a domain fact, and a `SlugType` union collides with the language's own
vocabulary in every sentence written about it.

`rule.prefer.kind-over-type` (mechanic) states the preference repo-wide; this cluster records the
term for the glossary rather than re-argues it.

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

## .the invariant a reviewer can check

**the kinds must PARTITION.** that is the whole reason the word earns a place — a classifier whose
answers overlap, or whose answers miss a value, is not a kind-cast; it is a pile of predicates.

- ✅ every input yields exactly one kind
- ✅ each derived predicate is `asXKind(...) === '<one kind>'` — never its own parser
- ❌ two predicates over the same input built on two decoders. they will answer differently for
  some string, the disagreement will be **silent**, and only a row that names that string catches
  it (see `asKeyrackSlugOrgKind`'s own origin in the `.reason`)

a kind-cast is what lets an exhaustive sweep exist at all: walk one list of inputs, assert the
answers partition, and a future fourth kind fails at the sweep rather than in a credential path.

## .the near-twin: `mode`

⚠️ **the partition test above is necessary, not sufficient.** a `mode` partitions too, and wears
the same `as*`-over-a-closed-set shape — so a reader who matches on shape alone will name a
mode-cast `…Kind` and be wrong. the question that separates them:

> **does the answer describe the INPUT, or does it describe what the COMMAND WILL DO?**

- `asKeyrackSlugOrgKind(slug)` — hand the same slug to two callers, they get the same answer,
  always. it reports what the value IS ⇒ **kind**
- `asKeyrackGetOutputMode({ value, json, output })` — reads no value at all, only the caller's
  own flags. two callers can differ because their flags differ ⇒ **mode**

`getRoleDeltaMode.ts:16` holds both in one expression — it reads `delta.kind` to pick a `mode` —
which is the evidence that settled the dispute (`term=mode._.choice.reason.md`, 2026-09-02).

⇒ so `mode` is forbidden as a **synonym** of `kind`, and live as its **own** term. the two are
peers on one axis: a kind is derived from a value, a mode is selected by a caller.

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
- `src/domain.operations/keyrack/asKeyrackSlugOrgKind.ts`           # the org-kind classifier
- `src/domain.operations/keyrack/isKeyrackSlugMachineWide.ts`       # a derived predicate, a thin `=== '<kind>'`
- `src/domain.operations/keyrack/isKeyrackSlugRepoBound.ts`         # its twin, off the SAME classifier
- `src/domain.operations/keyrack/asKeyrackSlugOrgKind.test.ts`      # `[case4]` — the clamp that holds the
  #   partition executable: it walks every kind and asserts exclusivity, agreement with each derived
  #   predicate, and a `bare` list pinned by value

## .a kind may be NARROWED, and the narrower gets its own transformer

`asGlobalUpgradeFailureHeaderKind` maps the full kind onto `Exclude<…, 'build-gate-blocked'>`,
because a header may render one member fewer than an arbitrary error may carry. the narrowed
type is DERIVED off the one list, never a second list — so a future member reaches both by
construction, and the exclusion states which member is forbidden rather than leaves a reader to
infer it from a ternary.

## .not a synonym of

- 👎 `type` — collides with the typescript keyword; the whole reason `kind` was adopted
- 👎 `mode` — a mode is *selected by a caller* (`--mode plan|apply`); a kind is *derived from a
  value*. the direction of authorship is opposite. ⚠️ it is forbidden **as a synonym** only —
  `mode` is a live term of its own, and the pair is separated at `.the near-twin: mode` above
- 👎 `variant` / `flavor` — imply the members differ in degree; a kind's members are disjoint
- 👎 `class` — collides with both the js keyword and the error-class sense already in use
  (`ConstraintError` vs `MalfunctionError`)

## .reason
see the ref-level cluster beside this choice:
- `term=kind._.choice.reason.md` — etymology, the rejected synonyms, disputes, evidence
