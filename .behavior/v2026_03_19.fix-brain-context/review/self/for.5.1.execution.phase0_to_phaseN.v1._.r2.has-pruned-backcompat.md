# review.self: has-pruned-backcompat (r2)

## review scope

read through each modified file line by line. for each backwards compat concern, traced back to the wish to verify it was explicitly requested.

## files reviewed

- `src/domain.objects/BrainAtom.ts`
- `src/domain.objects/BrainRepl.ts`
- `src/domain.operations/actor/actorAsk.ts`
- `src/domain.operations/actor/actorAct.ts`

## backwards compat concerns found

### 1. TContext = Empty default on BrainAtom and BrainRepl

**location**: `BrainAtom.ts:39`, `BrainRepl.ts:39`

**concern**: interfaces default to `<TContext = Empty>`

**was this explicitly requested?** yes

from the wish:
> "backwards compatible via TContext = Empty default"

**why it holds**: extant code that creates `BrainAtom` or `BrainRepl` without a generic parameter will infer `Empty`. extant callers that invoke `.ask()` or `.act()` without a context parameter will receive `undefined`, which is compatible with `Empty`. the wish explicitly calls this out as a requirement.

### 2. context parameter remains optional

**location**: `BrainAtom.ts:81`, `BrainRepl.ts:73`, `BrainRepl.ts:98`

**concern**: `context?: TContext` — the question mark makes it optional

**was this explicitly requested?** yes

from the wish:
> "optional by mandate: forces consideration of context without supplier's supplies"
> "no way to forget to handle the absent case"

**why it holds**: extant callers that don't pass context will continue to work. the wish frames optionality as a deliberate design choice: it forces brain implementers to handle the `undefined` case. this is not "to be safe" — it's the intended contract.

### 3. method syntax change (arrow to method)

**location**: `BrainAtom.ts:73`, `BrainRepl.ts:63`, `BrainRepl.ts:88`

**concern**: changed from `ask: <TOutput>(...) =>` to `ask<TOutput>(...):`

**was this explicitly requested?** no — but it was necessary for technical reasons

**why it holds**: this change enables bivariance for method parameters. without method syntax, a `BrainAtom<SpecificContext>` cannot be assigned to a variable typed as `BrainAtom` (with default context). method syntax is MORE permissive, not less — so extant code that assigns brains to generic-typed variables will continue to work.

the brief `define.bivariance-for-generics.[lesson].md` documents this typescript behavior. this is not backwards-compat-for-safety — it's backwards-compat-for-correctness.

### 4. context passthrough cast to any

**location**: `actorAsk.ts:52`, `actorAct.ts:43`

**concern**: `context as any` cast when passed to brain

**was this explicitly requested?** yes

from the wish:
> "via brain.choice, the brain implementation must validate its required context is present"
> "dynamic resolution trades compile-time safety for flexibility"

**why it holds**: the wish acknowledges that when context flows through a dynamic choice (actor -> brain), compile-time type safety is traded for runtime validation. the brain validates its required context at runtime. this is documented in both the wish and the code comments.

## summary

| concern | explicitly requested? | why it holds |
|---------|----------------------|--------------|
| `TContext = Empty` default | yes | wish specifies "backwards compatible" |
| `context?: TContext` optional | yes | wish specifies "optional by mandate" |
| method syntax change | no (but necessary) | enables bivariance, MORE permissive |
| `context as any` cast | yes | wish specifies runtime validation |

no assumed "to be safe" backwards compat was added. all measures trace to explicit wish requirements or necessary technical correctness.
