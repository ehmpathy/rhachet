# review.self: has-consistent-conventions (r4)

## review scope

read through each name choice in the new/modified code. for each, compared against extant name conventions in the codebase.

## codebase search conducted

```bash
# type name pattern
ls src/domain.objects/Context*.ts
# ContextBrain.ts
# ContextCli.ts
# ContextBrainSupplier.ts (new)

# factory name pattern
ls src/domain.operations/context/genContext*.ts
# genContextBrain.ts
# genContextStitchTrail.ts
# genContextBrainSupplier.ts (new)

# generic parameter names
grep -r "T[A-Z][a-z]" src/domain.objects/*.ts | head -20
# TBrainChoice, TRole, TContext, TOutput, TPlugs, TVariables, TThreadContext, etc.
```

## files reviewed

- `src/domain.objects/ContextBrainSupplier.ts:1-16` (new)
- `src/domain.operations/context/genContextBrainSupplier.ts:1-26` (new)
- `src/domain.objects/BrainAtom.ts:39,73-81` (modified)
- `src/domain.objects/BrainRepl.ts:29,63-71,88-96` (modified)

## name conventions analyzed

### 1. type names: `Context{Domain}` pattern

**extant convention** (from `src/domain.objects/`):

| file | type name | pattern |
|------|-----------|---------|
| ContextBrain.ts:38 | `ContextBrain` | Context + Brain |
| ContextCli.ts | `ContextCli` | Context + Cli |

**new type at ContextBrainSupplier.ts:13**:
```ts
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
```
name: `ContextBrainSupplier` — Context + BrainSupplier

**does it follow?** yes — `Context{Domain}` where domain is `BrainSupplier`

### 2. factory names: `genContext{Domain}` pattern

**extant convention** (from `src/domain.operations/context/`):
- `genContextBrain` — factory for ContextBrain
- `genContextStitchTrail` — factory for stitch trail context

**new factory**:
- `genContextBrainSupplier` — factory for ContextBrainSupplier

**does it follow?** yes — `genContext{Domain}` where domain is `BrainSupplier`

### 3. generic parameter names: `T{Concept}` pattern

**extant convention** (from `src/domain.objects/`):
```
TBrainChoice     (ContextBrain.ts:38)
TRole            (Actor.ts:95)
TContext         (Actor.ts:42, Actor.ts:74)
TOutput          (throughout)
TPlugs           (BrainOutput.ts)
TVariables       (Template.ts)
TThreadContext   (Thread.ts)
```

**new generic**:
- `TContext` on `BrainAtom` and `BrainRepl`
- `TSlug` and `TSupplies` on `ContextBrainSupplier`

**does it follow?** yes — `T{Concept}` pattern. notably, `TContext` is already used in Actor.ts for the same purpose.

### 4. file names: `{TypeName}.ts` or `{functionName}.ts` pattern

**extant convention**:
- types: `ContextBrain.ts`, `BrainAtom.ts`, `BrainRepl.ts`
- factories: `genContextBrain.ts`, `genContextStitchTrail.ts`
- type tests: `*.types.test.ts`

**new files**:
- `ContextBrainSupplier.ts` — follows type file pattern
- `ContextBrainSupplier.types.test.ts` — follows type test pattern
- `genContextBrainSupplier.ts` — follows factory file pattern
- `genContextBrainSupplier.types.test.ts` — follows type test pattern

**does it follow?** yes — all new files follow extant name conventions

### 5. namespace key pattern: `brain.{scope}` pattern

**extant convention** (from vision/wish):
- `context.brain.*` — brain choice and accessors
- `context['brain.supplier.*']` — supplier-specific context

**new pattern**:
- `brain.supplier.${TSlug}` — namespaced key for supplier

**is this new?** yes, but it was explicitly prescribed in the wish:
> "they live at different keys - zero collision:
> - ContextBrain uses: context.brain.*
> - ContextBrainSupplier uses: context['brain.supplier.*']"

**does it conflict?** no — `brain.*` and `brain.supplier.*` are distinct namespaces

### 6. method vs arrow syntax

**extant convention in interfaces**:
- some use arrow syntax: `ask: <T>(...) =>`
- some use method syntax: `ask<T>(...): ...`

**new code uses method syntax**:
```ts
// BrainAtom.ts:73
ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
  input: { ... },
  context?: TContext,
): Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
```

**why method syntax?** documented in `define.bivariance-for-generics.[lesson].md`:
- method syntax enables bivariance for parameters
- allows `BrainAtom<SpecificContext>` to assign to `BrainAtom`
- this is necessary for the generic context feature to work with collections

**is this consistent?** yes — codebase uses both syntaxes. method syntax is appropriate here due to bivariance requirement.

## summary

| name | convention | follows? | notes |
|------|------------|----------|-------|
| `ContextBrainSupplier` | `Context{Domain}` | yes | |
| `genContextBrainSupplier` | `genContext{Domain}` | yes | |
| `TContext` | `T{Concept}` | yes | reuses extant name from Actor.ts |
| `TSlug`, `TSupplies` | `T{Concept}` | yes | |
| `brain.supplier.${slug}` | `brain.{scope}` | yes | prescribed in wish |
| method syntax | allowed | yes | required for bivariance |

no convention divergence found. all names follow extant patterns in the codebase.
