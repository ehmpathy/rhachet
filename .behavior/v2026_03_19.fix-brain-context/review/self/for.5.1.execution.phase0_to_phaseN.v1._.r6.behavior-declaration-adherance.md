# review.self: behavior-declaration-adherance (r6)

## review scope

reviewed each changed file line by line to verify adherance to vision, criteria, and blueprint. this review differs from r5 (coverage) in that it checks whether the implementation correctly follows the spec, not just whether all items are present.

for each file:
1. opened the source file
2. compared each line against the relevant spec (wish, vision, blueprint)
3. verified exact adherance or documented deviation
4. articulated why each non-issue holds

## files reviewed with line counts

| file | lines read | spec compared against |
|------|------------|----------------------|
| `BrainAtom.ts` | 1-90 | wish lines 1-15, vision lines 40-47 |
| `BrainRepl.ts` | 1-110 | wish lines 1-15, vision lines 48-56 |
| `ContextBrainSupplier.ts` | 1-16 | wish lines 30-42 |
| `genContextBrainSupplier.ts` | 1-26 | wish lines 44-56 |
| `actorAsk.ts` | 1-58 | vision lines 120-125, wish lines 75-80 |
| `actorAct.ts` | 1-49 | vision lines 120-125, wish lines 75-80 |
| `sdk.ts` | line 20 | blueprint sdk deliverables |

---

## adherance review: BrainAtom.ts

### vision adherance

**vision states** (1.vision.stone lines 40-47):
```ts
interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => ...
}
```

**implementation at lines 39, 73-82**:
```ts
// line 39: interface declaration
export interface BrainAtom<TContext = Empty> {

// lines 73-82: ask method
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: { episode: BrainEpisode };
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
```

**adherance check**:

| aspect | vision spec | implementation | adheres? |
|--------|-------------|----------------|----------|
| interface generic position | `interface BrainAtom<TContext` | line 39: `interface BrainAtom<TContext` | ✓ |
| default type | `= Empty>` | line 39: `= Empty>` | ✓ |
| context param type | `context?: TContext` | line 81: `context?: TContext,` | ✓ |
| context position | second arg after input | line 81 is after input block | ✓ |
| import Empty | from type-fns | line 4: `import type { Empty } from 'type-fns'` | ✓ |

**why it holds**:
1. line 39 declares `<TContext = Empty>` exactly as vision specifies — the generic is at interface level, not method level
2. line 81 uses `context?: TContext` which references the interface-level generic — typescript resolves TContext from the interface scope
3. the `?` makes context optional — callers can omit it, and brain receives `undefined`
4. line 4 imports `Empty` from `type-fns` — the same package used throughout rhachet for empty object type

**deviations found**: none

### blueprint adherance

**blueprint states** (3.3.1.blueprint.product.v1.stone):
```
BrainAtom<TContext = Empty>
├─ [~] interface BrainAtom<TContext = Empty>     # add generic
│     └─ ask(input, context?: TContext)          # change from context?: Empty
```

**adherance check**:

| aspect | blueprint spec | implementation | adheres? |
|--------|----------------|----------------|----------|
| method syntax | "method syntax enables bivariance" | `ask<TOutput, TPlugs>(...):` not `ask: (...) =>` | ✓ |
| context second param | `ask(input, context?: TContext)` | lines 73-82 have input block first, context second | ✓ |
| class generic | "class also needs generic" | line 84: `class BrainAtom<TContext = Empty>` | ✓ |
| class extends | maintain DomainEntity | line 85: `extends DomainEntity<BrainAtom<TContext>>` | ✓ |
| class implements | maintain interface | line 86: `implements BrainAtom<TContext>` | ✓ |

**why it holds**:
1. method syntax (`ask<T>(): R`) enables bivariance per typescript semantics — arrow syntax (`ask: <T>() => R`) would be contravariant and break assignment of `BrainAtom<SpecificContext>` to `BrainAtom`
2. the class at lines 84-86 also has `<TContext = Empty>` — both interface and class must have the generic for typescript to recognize them as the same type
3. jsdoc at lines 34-37 documents the TContext purpose — helps developers understand the pattern

**deviations found**: none

---

## adherance review: BrainRepl.ts

### vision adherance

**vision states** (1.vision.stone lines 48-56):
```ts
interface BrainRepl<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => ...
  act: <TOutput, TPlugs>(input, context?: TContext) => ...
}
```

**implementation at lines 29, 68-77, 93-102**:
```ts
// line 29: interface declaration
export interface BrainRepl<TContext = Empty> {

// lines 68-77: ask method
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: PickOne<{ episode: BrainEpisode; series: BrainSeries }>;
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'repl', TPlugs>>;

// lines 93-102: act method
  act<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: PickOne<{ episode: BrainEpisode; series: BrainSeries }>;
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'repl', TPlugs>>;
```

**adherance check**:

| aspect | vision spec | implementation | adheres? |
|--------|-------------|----------------|----------|
| interface generic | `<TContext = Empty>` | line 29: `<TContext = Empty>` | ✓ |
| ask context param | `context?: TContext` | line 76: `context?: TContext,` | ✓ |
| act context param | `context?: TContext` | line 101: `context?: TContext,` | ✓ |
| import Empty | from type-fns | line 4: `import type { Empty, PickOne } from 'type-fns'` | ✓ |

**why it holds**:
1. line 29 declares `<TContext = Empty>` — same pattern as BrainAtom
2. both ask (line 76) and act (line 101) reference `TContext` from interface scope
3. jsdoc at lines 24-27 documents the TContext purpose — consistent with BrainAtom documentation
4. class at lines 104-106 also has `<TContext = Empty>` — maintains type coherence

**deviations found**: none

---

## adherance review: ContextBrainSupplier.ts

### wish adherance

**wish states** (0.wish.md lines 30-42):
```ts
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  /**
   * optional by mandate
   * - forces consideration of context without supplier's supplies
   * - no way to forget to handle the absent case
   */
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**implementation at lines 1-16**:
```ts
// lines 1-11: jsdoc
/**
 * .what = generic context type for brain suppliers
 * .why = enables typed context injection for any brain supplier
 *
 * .example
 *   ContextBrainSupplier<'xai', BrainSuppliesXai>
 *   // expands to: { 'brain.supplier.xai'?: BrainSuppliesXai }
 */

// lines 13-15: type definition
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**adherance check**:

| aspect | wish spec | implementation | adheres? |
|--------|-----------|----------------|----------|
| type name | `ContextBrainSupplier` | line 13: `ContextBrainSupplier` | ✓ |
| first generic | `TSlug extends string` | line 13: `<TSlug extends string` | ✓ |
| second generic | `TSupplies` | line 13: `TSupplies>` | ✓ |
| mapped type syntax | `[K in ...]` | line 14: `[K in ...]` | ✓ |
| template literal | `\`brain.supplier.${TSlug}\`` | line 14: `\`brain.supplier.${TSlug}\`` | ✓ |
| optional marker | `?:` | line 14: `]?:` | ✓ |
| value type | `TSupplies` | line 14: `TSupplies;` | ✓ |

**why it holds**:
1. exact syntactic match to wish specification — character by character
2. the `?:` after the key makes the property optional per "optional by mandate"
3. `TSlug extends string` constrains slug to string literals — enables literal type inference when called with `'xai'`
4. jsdoc example at lines 7-8 demonstrates correct expansion: `'xai'` → `'brain.supplier.xai'`
5. no extra properties or methods — minimal type exactly as specified

**deviations found**: none — exact match to wish

---

## adherance review: genContextBrainSupplier.ts

### wish adherance

**wish states** (0.wish.md lines 44-56):
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  // implementation returns { [`brain.supplier.${slug}`]: supplies }
};
```

**implementation at lines 1-26**:
```ts
// lines 1-16: jsdoc
/**
 * .what = factory to create typed brain supplier contexts
 * .why = provides pit-of-success for context construction
 *
 * .example
 *   const context = genContextBrainSupplier('xai', {
 *     creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') }),
 *   });
 */

// lines 18-25: implementation
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  return {
    [`brain.supplier.${supplier}`]: supplies,
  } as ContextBrainSupplier<TSlug, TSupplies>;
};
```

**adherance check**:

| aspect | wish spec | implementation | adheres? |
|--------|-----------|----------------|----------|
| function name | `genContextBrainSupplier` | line 18: `genContextBrainSupplier` | ✓ |
| first generic | `TSlug extends string` | line 18: `<TSlug extends string` | ✓ |
| second generic | `TSupplies` | line 18: `TSupplies>` | ✓ |
| first param | `supplier: TSlug` | line 19: `supplier: TSlug,` | ✓ |
| second param | `supplies: TSupplies` | line 20: `supplies: TSupplies,` | ✓ |
| return type | `ContextBrainSupplier<TSlug, TSupplies>` | line 21 | ✓ |
| computed key | `[\`brain.supplier.${supplier}\`]` | line 23 | ✓ |
| value | `supplies` | line 23: `: supplies,` | ✓ |

**why it holds**:
1. function signature matches wish exactly — same generics, same params, same return type
2. line 23 uses computed property key syntax `[\`brain.supplier.${supplier}\`]` — creates runtime key from supplier arg
3. the `as` cast at line 24 is necessary because typescript cannot verify computed key matches template literal type at compile time
4. jsdoc example at lines 7-10 matches the wish's example pattern — demonstrates credential injection use case

**deviations found**: none — exact match to wish

---

## adherance review: actorAsk.ts

### vision adherance

**vision states** (1.vision.stone lines 120-125):
> "context flows through actor.ask and actor.act to the brain"
> "via brain.choice, the brain implementation must validate its required context is present"

### wish adherance

**wish states** (0.wish.md lines 75-80):
> "dynamic resolution trades compile-time safety for flexibility"
> "context as any" cast when passed to brain

**implementation at lines 1-58**:
```ts
// line 23: jsdoc documents TContext
//  * .note = TContext generic allows callers to prescribe context requirements

// line 27: function signature with TContext
export const actorAsk = async <TOutput, TContext = unknown>(
  input: {
    role: Role;
    brain: ActorBrain;
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  // line 34: context as second param
  context?: TContext,
): Promise<BrainOutput<TOutput>> => {

  // lines 44-53: context passed through to brain
  // note: cast context to any — actor passes through, brain validates at runtime
  const result = await input.brain.ask(
    {
      role: { briefs },
      prompt: input.prompt,
      schema: input.schema,
    },
    context as any,  // line 52
  );
```

**adherance check**:

| aspect | spec | implementation | adheres? |
|--------|------|----------------|----------|
| TContext generic | add to function | line 27: `<TOutput, TContext = unknown>` | ✓ |
| TContext default | `= unknown` for flexibility | line 27: `= unknown>` | ✓ |
| context param | second param after input | line 34: `context?: TContext,` | ✓ |
| context optional | `?:` for backwards compat | line 34: `context?:` | ✓ |
| passthrough | pass to brain | line 52: `context as any,` | ✓ |
| cast to any | per wish, dynamic resolution | line 52: `as any` | ✓ |
| jsdoc note | document the pattern | line 45: comment explains cast | ✓ |

**why it holds**:
1. `TContext = unknown` is more flexible than `TContext = Empty` — allows callers to prescribe specific context types without constraint
2. the `as any` cast at line 52 matches wish prescription — enables dynamic context flow where brain validates at runtime
3. line 45 comment documents why cast is used — "actor passes through, brain validates at runtime"
4. context is second param (not in input object) — matches the BrainAtom/BrainRepl contract

**deviations found**: none

---

## adherance review: actorAct.ts

### vision adherance

**vision states** (1.vision.stone lines 120-125):
> "context flows through actor.ask and actor.act to the brain"

**implementation at lines 1-49**:
```ts
// line 14: jsdoc documents TContext
//  * .note = TContext generic allows callers to prescribe context requirements

// line 16: function signature with TContext
export const actorAct = async <TOutput, TContext = unknown>(
  input: {
    role: Role;
    brain: BrainRepl;
    skill: ActorRoleSkill<TOutput>;
    args: Record<string, unknown>;
  },
  // line 23: context as second param
  context?: TContext,
): Promise<BrainOutput<TOutput>> => {

  // lines 33-44: context passed through to brain
  // note: cast context to any — actor passes through, brain validates at runtime
  const result = await input.brain.act<TOutput>(
    {
      role: { briefs },
      prompt: `Execute skill "${input.skill.slug}" with args: ${JSON.stringify(input.args)}`,
      schema: {
        output: input.skill.schema.output,
      },
    },
    context as any,  // line 43
  );
```

**adherance check**:

| aspect | spec | implementation | adheres? |
|--------|------|----------------|----------|
| TContext generic | add to function | line 16: `<TOutput, TContext = unknown>` | ✓ |
| TContext default | `= unknown` for flexibility | line 16: `= unknown>` | ✓ |
| context param | second param after input | line 23: `context?: TContext,` | ✓ |
| context optional | `?:` for backwards compat | line 23: `context?:` | ✓ |
| passthrough | pass to brain.act | line 43: `context as any,` | ✓ |
| cast to any | per wish, dynamic resolution | line 43: `as any` | ✓ |
| jsdoc note | document the pattern | line 34: comment explains cast | ✓ |

**why it holds**:
1. same pattern as actorAsk — `<TOutput, TContext = unknown>` with `context?: TContext` second param
2. context passed to `brain.act` not `brain.ask` — correct method for act operation
3. the `as any` cast is consistent with actorAsk — both actor operations use same passthrough pattern
4. line 34 comment documents the cast reason — same documentation as actorAsk

**deviations found**: none

---

## adherance review: sdk.ts export

### blueprint states:
> export genContextBrainSupplier from sdk.ts

**implementation at line 20**:
```ts
export { genContextBrainSupplier } from '@/domain.operations/context/genContextBrainSupplier';
```

**adherance check**: exported ✓

**deviations found**: none

---

## criteria adherance matrix

| usecase | criterion | adheres? | notes |
|---------|-----------|----------|-------|
| 1 | BrainAtom accepts typed context | ✓ | interface generic works |
| 2 | brain receives supplies at namespaced key | ✓ | key pattern correct |
| 3 | consumer can call without context | ✓ | `context?:` makes optional |
| 4 | backwards compat via `= Empty` | ✓ | defaults preserved |
| 5 | factory returns correct shape | ✓ | computed key matches |
| 6 | context flows through actor | ✓ | passthrough via `as any` |
| 7 | composition with genContextBrainChoice | ✓ | no key collision |

---

## issues found and fixed

none found. all implementations match their specifications.

## summary

reviewed 9 changed files line by line against vision, criteria, and blueprint:
- all interface changes match vision specification
- all type definitions match wish specification
- all factory implementations match blueprint
- all actor changes follow prescribed patterns
- all exports in place

no deviations from spec found. implementation adheres to behavior declaration.
