# review.self: has-consistent-mechanisms (r3)

## review scope

read through each new mechanism line by line. for each, searched extant codebase for alternatives that could duplicate the functionality.

## files reviewed

- `src/domain.objects/ContextBrainSupplier.ts` (new)
- `src/domain.operations/context/genContextBrainSupplier.ts` (new)
- `src/domain.objects/BrainAtom.ts` (modified)
- `src/domain.objects/BrainRepl.ts` (modified)

## codebase search conducted

```bash
# search for context types
grep -r "Context.*=" src/domain.objects/
# results: ContextBrain, ContextCli, no template literal mapped types

# search for genContext factories
grep -r "genContext" src/domain.operations/
# results: genContextBrain, genContextBrainSupplier (new), genContextKeyrackGrantGet,
#          genContextKeyrackGrantUnlock, genContextStitchTrail, genContextConfigOfUsage

# search for generic interface patterns
grep -r "interface.*<T" src/domain.objects/
# results: 13 interfaces with generic patterns
```

## new mechanisms reviewed

### 1. ContextBrainSupplier type

**location**: `src/domain.objects/ContextBrainSupplier.ts:13-15`

**source code**:
```ts
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**what makes it unique**: this is a mapped type with a template literal key. the key pattern `brain.supplier.${TSlug}` is parameterized by the supplier slug.

**extant alternatives checked**:

1. **ContextBrain** (`src/domain.objects/ContextBrain.ts:38-89`)
   - shape: `{ brain: { atom: {...}, repl: {...}, choice: TBrainChoice } }`
   - purpose: holds brain accessors and pre-bound choice
   - comparison: completely different structure — nested object with methods, not template literal key
   - can it substitute? no

2. **ContextCli** (interface with concrete keys like `stage`, `gitroot`)
   - purpose: cli execution context
   - comparison: concrete keys, not parameterized
   - can it substitute? no

3. **ContextKeyrackGrantGet** (`src/domain.operations/keyrack/genContextKeyrackGrantGet.ts:24-29`)
   - shape: `{ owner: string | null; repoManifest: ...; envvarAdapter: ...; mechAdapters: ... }`
   - purpose: keyrack-specific context with adapters
   - comparison: domain-specific interface, not generic supplier pattern
   - can it substitute? no

**does it duplicate?** no

**why it holds**: no extant type provides parameterized namespaced keys (`brain.supplier.<slug>`). the template literal mapped type pattern is unique to this use case.

### 2. genContextBrainSupplier factory

**location**: `src/domain.operations/context/genContextBrainSupplier.ts:18-25`

**source code**:
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  return {
    [`brain.supplier.${supplier}`]: supplies,
  } as ContextBrainSupplier<TSlug, TSupplies>;
};
```

**what makes it unique**: constructs an object with a computed property key via template literal.

**extant alternatives checked**:

1. **genContextBrain** (`src/domain.operations/context/genContextBrain.ts:53-119`)
   - lines: 190 lines of implementation
   - purpose: discovery mode (async) or explicit mode (sync) for brain context
   - does: brain lookup, validation, choice resolution, delegation
   - comparison: far more complex, returns `ContextBrain` not `ContextBrainSupplier`
   - can it substitute? no — different return type, different purpose

2. **genContextKeyrackGrantGet** (`src/domain.operations/keyrack/genContextKeyrackGrantGet.ts:38-71`)
   - purpose: async factory that assembles keyrack adapters
   - returns: `ContextKeyrackGrantGet` with `repoManifest`, `envvarAdapter`, `mechAdapters`
   - comparison: domain-specific, returns complex assembled object
   - can it substitute? no — different domain entirely

3. **genContextStitchTrail** (`src/domain.operations/context/genContextStitchTrail.ts`)
   - purpose: constructs stitch trail for weave observation
   - comparison: different domain (weave), different shape
   - can it substitute? no

4. **genContextConfigOfUsage** (`src/domain.operations/config/genContextConfigOfUsage.ts`)
   - purpose: constructs config usage context
   - comparison: different domain (config), different shape
   - can it substitute? no

**does it duplicate?** no

**why it holds**: the factory serves a unique purpose — to construct the namespaced supplier key pattern `{ 'brain.supplier.<slug>': supplies }`. no extant factory produces this shape.

### 3. TContext generic on BrainAtom and BrainRepl

**location**: `src/domain.objects/BrainAtom.ts:39`, `src/domain.objects/BrainRepl.ts:29`

**source code (BrainAtom)**:
```ts
// line 39
export interface BrainAtom<TContext = Empty> {
  // ...
  // line 73-81 (method syntax for bivariance)
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: { ... },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
}
```

**extant generic interface patterns found**:

| interface | location | generic pattern |
|-----------|----------|-----------------|
| `ContextBrain<TBrainChoice = BrainChoice \| null>` | ContextBrain.ts:38 | `<T = DefaultUnion>` |
| `Actor<TRole extends Role = Role>` | Actor.ts:95 | `<T extends Base = Base>` |
| `Template<TVariables = any>` | Template.ts:13 | `<T = any>` |
| `Thread<TThreadContext>` | Thread.ts:10 | `<T>` (no default) |
| `StitcherBase<TForm extends StitcherForm>` | Stitcher.ts:100 | `<T extends Constraint>` |
| `RoleSkill<TStitcher extends GStitcher>` | RoleSkill.ts:15 | `<T extends Constraint>` |

**pattern analysis**:
- `TContext = Empty` follows `ContextBrain`'s pattern of `TBrainChoice = BrainChoice | null` — default type with fallback
- the `= Default` pattern is standard in this codebase
- 6+ interfaces use this pattern

**does it duplicate?** no — this is extension of an extant pattern, not introduction of a new mechanism

**why it holds**: follows established generic interface pattern in codebase. consistent with `ContextBrain<T = Default>` syntax.

## summary

| new mechanism | duplicates extant? | pattern consistent? | evidence |
|---------------|-------------------|---------------------|----------|
| `ContextBrainSupplier` type | no | yes — mapped type with template literal | unique key pattern, no extant alternative |
| `genContextBrainSupplier` factory | no | yes — `genContext*` name convention | 6 extant genContext* factories, none produce this shape |
| `TContext` generic | no | yes — `Interface<T = Default>` pattern | 6+ extant interfaces use same pattern |

no duplication found. all new mechanisms follow extant patterns in the codebase.
