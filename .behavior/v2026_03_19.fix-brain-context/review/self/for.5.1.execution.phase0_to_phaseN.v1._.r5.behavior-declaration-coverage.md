# review.self: behavior-declaration-coverage (r5)

## review scope

traced each requirement from vision.stone, criteria.blackbox.stone, and blueprint.v1.stone to specific implementation code. verified coverage via grep searches and line-by-line file reads.

## codebase search conducted

```bash
# verify TContext generic on interfaces
grep -n "interface BrainAtom<TContext" src/domain.objects/BrainAtom.ts
# result: line 39: export interface BrainAtom<TContext = Empty> {

grep -n "interface BrainRepl<TContext" src/domain.objects/BrainRepl.ts
# result: line 29: export interface BrainRepl<TContext = Empty> {

# verify context param on ask/act methods
grep -n "context?: TContext" src/domain.objects/BrainAtom.ts
# result: line 81: context?: TContext,

grep -n "context?: TContext" src/domain.objects/BrainRepl.ts
# results: line 76, line 101

# verify ContextBrainSupplier type
grep -n "brain.supplier" src/domain.objects/ContextBrainSupplier.ts
# result: line 14: [K in `brain.supplier.${TSlug}`]?: TSupplies;

# verify genContextBrainSupplier factory
grep -n "brain.supplier" src/domain.operations/context/genContextBrainSupplier.ts
# result: line 22: [`brain.supplier.${supplier}`]: supplies,

# verify actor context passthrough
grep -n "context as any" src/domain.operations/actor/actorAsk.ts
# result: line 52

grep -n "context as any" src/domain.operations/actor/actorAct.ts
# result: line 43

# verify exports
grep -n "genContextBrainSupplier" src/contract/sdk.ts
# result: line 20

grep -n "ContextBrainSupplier" src/domain.objects/index.ts
# result: via export * from './ContextBrainSupplier'
```

## files reviewed

| file | lines | purpose |
|------|-------|---------|
| `BrainAtom.ts` | 39, 73-82, 84-86 | interface generic + ask method |
| `BrainRepl.ts` | 29, 68-77, 93-102, 104-106 | interface generic + ask/act methods |
| `ContextBrainSupplier.ts` | 1-16 | type definition |
| `genContextBrainSupplier.ts` | 1-26 | factory implementation |
| `actorAsk.ts` | 27, 34, 46, 52 | context passthrough |
| `actorAct.ts` | 16, 23, 35, 43 | context passthrough |
| `sdk.ts` | 20 | export for public SDK |
| `BrainAtom.types.test.ts` | 1-95 | compile-time type tests |
| `BrainRepl.types.test.ts` | 1-105 | compile-time type tests |
| `ContextBrainSupplier.types.test.ts` | 1-145 | compile-time type tests |
| `genContextBrainSupplier.types.test.ts` | 1-100 | compile-time type tests |

---

## vision requirements coverage

### requirement 1: interface-level TContext generic on BrainAtom

**vision states** (1.vision.stone lines 40-47):
> ```ts
> interface BrainAtom<TContext = Empty> {
>   ask: <TOutput, TPlugs>(input, context?: TContext) => ...
> }
> ```
> "interface-level generics: TContext lives on the interface"

**implemented at `BrainAtom.ts:39,73-82`**:
```ts
// line 39
export interface BrainAtom<TContext = Empty> {
  // lines 73-82
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      prompt: string;
      schema: { output: ZodSchema<TOutput> };
      role: Partial<RoleLite>;
      plugs?: TPlugs;
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
}
```

**covered?** yes

**why it holds**:
1. the generic `<TContext = Empty>` is at the interface level (line 39), not at the method level
2. the ask method references `TContext` from the interface scope (line 81)
3. the default `= Empty` preserves backwards compatibility for extant code
4. the `?` on `context?: TContext` makes context optional per the wish
5. method syntax (not arrow syntax) is used for bivariance — enables `BrainAtom<SpecificContext>` to assign to `BrainAtom`

### requirement 2: interface-level TContext generic on BrainRepl

**vision states** (1.vision.stone lines 48-56):
> ```ts
> interface BrainRepl<TContext = Empty> {
>   ask: <TOutput, TPlugs>(input, context?: TContext) => ...
>   act: <TOutput, TPlugs>(input, context?: TContext) => ...
> }
> ```

**implemented at `BrainRepl.ts:29,68-77,93-102`**:
```ts
// line 29
export interface BrainRepl<TContext = Empty> {
  // lines 68-77 (ask method)
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      prompt: string;
      schema: { output: ZodSchema<TOutput> };
      role: Partial<RoleLite>;
      plugs?: TPlugs;
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'repl', TPlugs>>;

  // lines 93-102 (act method)
  act<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      skill: BrainReplSkillInput<TOutput, TPlugs>;
      role: Partial<RoleLite>;
      plugs?: TPlugs;
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'repl', TPlugs>>;
}
```

**covered?** yes

**why it holds**:
1. the generic `<TContext = Empty>` is at the interface level (line 29)
2. both ask (line 76) and act (line 101) reference `TContext` from interface scope
3. both methods use `context?: TContext` with optional marker
4. both methods use method syntax for bivariance
5. the class declaration at line 104 also includes `<TContext = Empty>` for implementation

### requirement 3: ContextBrainSupplier type with namespaced key

**vision states** (0.wish.md lines 30-42):
> ```ts
> export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
>   /**
>    * optional by mandate
>    * - forces consideration of context without supplier's supplies
>    * - no way to forget to handle the absent case
>    */
>   [K in `brain.supplier.${TSlug}`]?: TSupplies;
> };
> ```

**implemented at `ContextBrainSupplier.ts:1-16`**:
```ts
// lines 1-11 (jsdoc)
/**
 * .what = generic context type for brain suppliers
 * .why = enables typed context injection for any brain supplier
 *
 * .example
 *   ContextBrainSupplier<'xai', BrainSuppliesXai>
 *   // expands to: { 'brain.supplier.xai'?: BrainSuppliesXai }
 */

// lines 13-15 (type)
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**covered?** yes

**why it holds**:
1. template literal mapped type `[K in \`brain.supplier.${TSlug}\`]` creates namespaced key
2. the `?` after the key makes the property optional — "optional by mandate"
3. `TSlug extends string` ensures slug is a string literal type for proper inference
4. the type expands correctly: `ContextBrainSupplier<'xai', Foo>` → `{ 'brain.supplier.xai'?: Foo }`
5. jsdoc includes example that demonstrates the expansion pattern

### requirement 4: genContextBrainSupplier factory

**vision states** (0.wish.md lines 44-56):
> ```ts
> export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
>   supplier: TSlug,
>   supplies: TSupplies,
> ): ContextBrainSupplier<TSlug, TSupplies> => {
>   // implementation returns { [`brain.supplier.${slug}`]: supplies }
> };
> ```

**implemented at `genContextBrainSupplier.ts:1-26`**:
```ts
// lines 1-16 (jsdoc)
/**
 * .what = factory to create typed brain supplier contexts
 * .why = provides pit-of-success for context construction
 *
 * .example
 *   const context = genContextBrainSupplier('xai', {
 *     creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') }),
 *   });
 */

// lines 18-25 (implementation)
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  return {
    [`brain.supplier.${supplier}`]: supplies,
  } as ContextBrainSupplier<TSlug, TSupplies>;
};
```

**covered?** yes

**why it holds**:
1. factory signature matches wish: `<TSlug extends string, TSupplies>(supplier, supplies)`
2. return type is `ContextBrainSupplier<TSlug, TSupplies>` — preserves type inference
3. computed property key `[\`brain.supplier.${supplier}\`]` creates the namespaced key at runtime
4. the `as` cast is necessary because typescript cannot verify computed key matches template literal type
5. jsdoc includes example that matches the wish's example pattern

### requirement 5: context flows through actor.ask/actor.act

**vision states** (1.vision.stone lines 120-125):
> "context flows through actor.ask/actor.act to the underlying brain"
> "via brain.choice, the brain implementation must validate its required context is present"
> "dynamic resolution trades compile-time safety for flexibility"

**implemented at `actorAsk.ts:27,34,46,52`**:
```ts
// line 27: function signature with TContext generic
export const actorAsk = async <TOutput, TContext = unknown>(
  input: {
    brain: BrainAtom | BrainRepl;
    prompt: string;
    schema: { output: ZodSchema<TOutput> };
    role: Partial<RoleLite>;
  },
  // line 34: context parameter
  context?: TContext,
): Promise<BrainOutput<TOutput>> => {
  // lines 46-52: context passed to brain
  const result = await input.brain.ask(
    {
      prompt: input.prompt,
      schema: input.schema,
      role: input.role,
    },
    context as any,  // line 52: cast to any for dynamic resolution
  );
```

**implemented at `actorAct.ts:16,23,35,43`**:
```ts
// line 16: function signature with TContext generic
export const actorAct = async <TOutput, TContext = unknown>(
  input: {
    brain: BrainRepl;
    skill: BrainReplSkillInput<TOutput>;
    role: Partial<RoleLite>;
  },
  // line 23: context parameter
  context?: TContext,
): Promise<BrainOutput<TOutput>> => {
  // lines 35-43: context passed to brain
  const result = await input.brain.act<TOutput>(
    {
      skill: input.skill,
      role: input.role,
    },
    context as any,  // line 43: cast to any for dynamic resolution
  );
```

**covered?** yes

**why it holds**:
1. both operations have `<TOutput, TContext = unknown>` — generic allows caller to prescribe context type
2. both operations have `context?: TContext` as second parameter
3. both pass `context as any` to the brain — the wish explicitly prescribes this for dynamic resolution
4. the `as any` cast is documented in the wish: "dynamic resolution trades compile-time safety for flexibility"
5. brain implementations validate their required context at runtime per the wish

### requirement 6: backwards compatibility via TContext = Empty

**vision states** (0.wish.md line 8, 1.vision.stone lines 135-143):
> "backwards compatible via TContext = Empty default"
> "extant code that creates BrainAtom or BrainRepl without a generic parameter will infer Empty"
> "extant callers that invoke .ask() or .act() without a context parameter will receive undefined"

**implemented**:
```ts
// BrainAtom.ts:39
export interface BrainAtom<TContext = Empty> {

// BrainAtom.ts:84-86 (class)
export class BrainAtom<TContext = Empty>
  extends DomainEntity<BrainAtom<TContext>>
  implements BrainAtom<TContext> {

// BrainRepl.ts:29
export interface BrainRepl<TContext = Empty> {

// BrainRepl.ts:104-106 (class)
export class BrainRepl<TContext = Empty>
  extends DomainEntity<BrainRepl<TContext>>
  implements BrainRepl<TContext> {
```

**covered?** yes

**why it holds**:
1. `= Empty` default means `BrainAtom` infers as `BrainAtom<Empty>` — no break for extant code
2. `Empty` from `type-fns` is `{}` — accepts any object or `undefined`
3. extant callers that pass no context will have `context` as `undefined` — compatible with `Empty`
4. extant callers that pass `{}` will also satisfy `Empty`
5. the class declarations also have `<TContext = Empty>` for implementation consistency
6. type tests verify backwards compatibility via compilation of legacy usage patterns

---

## blackbox criteria coverage

### usecase.1 — brain supplier declares context type

**criteria.blackbox.stone lines 3-14**:
```
given('a brain supplier factory')
  when('the factory returns a BrainAtom with typed context')
    then('typescript accepts the return type BrainAtom<ContextBrainSupplierXai>')
    then('the ask method accepts context of that type')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| typescript accepts `BrainAtom<ContextBrainSupplierXai>` | yes | `BrainAtom.ts:39` has `<TContext = Empty>` — any TContext is valid |
| ask method accepts context of that type | yes | `BrainAtom.ts:81` has `context?: TContext` — method references interface generic |
| same for BrainRepl ask | yes | `BrainRepl.ts:29,76` — interface + ask method |
| same for BrainRepl act | yes | `BrainRepl.ts:29,101` — interface + act method |

**why it holds**: interface-level generics allow factory return types to bind specific context types. the method `context?: TContext` parameter then enforces that type at call sites.

### usecase.2 — consumer provides context

**criteria.blackbox.stone lines 16-24**:
```
given('a brain with typed context')
  when('consumer calls ask with genContextBrainSupplier')
    then('the brain receives the supplies at context["brain.supplier.<slug>"]')
    then('typescript validates the context type matches')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| brain receives supplies at `context["brain.supplier.<slug>"]` | yes | `ContextBrainSupplier.ts:14` uses template literal key |
| typescript validates context type matches | yes | type tests at `ContextBrainSupplier.types.test.ts:67-73` verify type errors for wrong types |

**why it holds**: the mapped type `[K in \`brain.supplier.${TSlug}\`]` creates a literal property key. typescript enforces that the value at that key matches `TSupplies`.

### usecase.3 — consumer calls without context

**criteria.blackbox.stone lines 26-35**:
```
given('a brain with typed context')
  when('consumer calls ask without context')
    then('context is undefined')
    then('typescript allows the call (context is optional)')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| context is undefined | yes | `context?: TContext` — the `?` makes it optional, defaults to `undefined` |
| typescript allows the call | yes | type tests compile without context arg (`BrainAtom.types.test.ts:45-50`) |
| brain can check `context?.["brain.supplier.<slug>"]` | yes | type tests at `ContextBrainSupplier.types.test.ts:126-143` verify optional chaining |

**why it holds**: the `?` on `context?:` makes the parameter optional. when absent, `context` is `undefined`. optional chaining `context?.['brain.supplier.xai']` evaluates to `undefined`.

### usecase.4 — backwards compatibility

**criteria.blackbox.stone lines 37-46**:
```
given('a brain without typed context (legacy)')
  when('the factory returns BrainAtom without generic')
    then('typescript infers BrainAtom<Empty>')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| BrainAtom without generic infers `BrainAtom<Empty>` | yes | default `= Empty` at `BrainAtom.ts:39` |
| ask method accepts `context?: Empty` | yes | generic default flows through to method |
| no type errors for legacy callers | yes | type tests compile with unparameterized `BrainAtom` |

**why it holds**: default type parameters (`<TContext = Empty>`) mean unparameterized usages infer the default. `Empty` from type-fns is `{}`, compatible with `undefined` and empty objects.

### usecase.5 — context construction via factory

**criteria.blackbox.stone lines 48-58**:
```
given('a consumer needs to provide context')
  when('consumer calls genContextBrainSupplier("xai", supplies)')
    then('returns object with key "brain.supplier.xai"')
    then('typescript infers ContextBrainSupplier<"xai", typeof supplies>')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| returns `{ "brain.supplier.xai": supplies }` | yes | `genContextBrainSupplier.ts:22-24` uses computed key |
| typescript infers correct type | yes | type tests at `genContextBrainSupplier.types.test.ts:24-35` |
| intersection via spread works | yes | type tests at `genContextBrainSupplier.types.test.ts:77-95` |

**why it holds**: the factory's return type is `ContextBrainSupplier<TSlug, TSupplies>`. typescript infers `TSlug` from the literal string argument. spread of two supplier contexts creates intersection type.

### usecase.6 — context flows through actor

**criteria.blackbox.stone lines 60-68**:
```
given('an actor with enrolled brain')
  when('consumer calls actor.ask with context')
    then('context is passed to the brain')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| actor.ask passes context to brain | yes | `actorAsk.ts:52` passes `context as any` to brain.ask |
| actor.act passes context to brain | yes | `actorAct.ts:43` passes `context as any` to brain.act |

**why it holds**: both actor operations accept `context?: TContext` and forward it to the brain method. the `as any` cast enables dynamic context flow per the wish.

### usecase.7 — composition with genContextBrainChoice

**criteria.blackbox.stone lines 70-78**:
```
given('a skill that uses both brain choice and supplier context')
  when('consumer spreads genContextBrainChoice and genContextBrainSupplier')
    then('both patterns compose without collision')
```

| criterion | implemented | evidence |
|-----------|-------------|----------|
| spread of both contexts works | yes | different key namespaces: `brain.*` vs `brain.supplier.*` |
| typescript accepts intersection type | yes | type tests at `ContextBrainSupplier.types.test.ts:107-122` |

**why it holds**: genContextBrainChoice uses `brain.` prefix (`brain.choice`, `brain.atom`). genContextBrainSupplier uses `brain.supplier.` prefix. no key collision. spread creates valid intersection.

---

## blueprint deliverables coverage

**blueprint.v1.stone filediff tree and codepath tree**:

### domain.objects deliverables

| deliverable | status | location | verification |
|-------------|--------|----------|--------------|
| add TContext generic to BrainAtom interface | done | `BrainAtom.ts:39` | grep confirms `interface BrainAtom<TContext = Empty>` |
| add TContext generic to BrainAtom class | done | `BrainAtom.ts:84-86` | class extends with same generic |
| ask method with `context?: TContext` | done | `BrainAtom.ts:81` | method syntax, references interface generic |
| add TContext generic to BrainRepl interface | done | `BrainRepl.ts:29` | grep confirms `interface BrainRepl<TContext = Empty>` |
| add TContext generic to BrainRepl class | done | `BrainRepl.ts:104-106` | class extends with same generic |
| ask method with `context?: TContext` | done | `BrainRepl.ts:76` | method syntax |
| act method with `context?: TContext` | done | `BrainRepl.ts:101` | method syntax |
| create ContextBrainSupplier type | done | `ContextBrainSupplier.ts:13-15` | mapped type with template literal key |
| export ContextBrainSupplier | done | `domain.objects/index.ts` | via `export * from './ContextBrainSupplier'` |

### domain.operations deliverables

| deliverable | status | location | verification |
|-------------|--------|----------|--------------|
| create genContextBrainSupplier factory | done | `genContextBrainSupplier.ts:18-25` | factory with computed key |
| update actorAsk with TContext | done | `actorAsk.ts:27,34,52` | generic + param + passthrough |
| update actorAct with TContext | done | `actorAct.ts:16,23,43` | generic + param + passthrough |

### contract/sdk deliverables

| deliverable | status | location | verification |
|-------------|--------|----------|--------------|
| export genContextBrainSupplier from sdk | done | `sdk.ts:20` | public SDK export |

### test deliverables

| deliverable | status | location | verification |
|-------------|--------|----------|--------------|
| type tests for BrainAtom | done | `BrainAtom.types.test.ts` | 95 lines, covers TContext generics |
| type tests for BrainRepl | done | `BrainRepl.types.test.ts` | 105 lines, covers ask and act |
| type tests for ContextBrainSupplier | done | `ContextBrainSupplier.types.test.ts` | 145 lines, covers key structure and optionality |
| type tests for genContextBrainSupplier | done | `genContextBrainSupplier.types.test.ts` | 100 lines, covers inference and intersection |

---

## verification: grep search results

```bash
# verify all blueprint locations exist and match expected patterns

grep -n "interface BrainAtom<TContext = Empty>" src/domain.objects/BrainAtom.ts
# 39:export interface BrainAtom<TContext = Empty> {

grep -n "interface BrainRepl<TContext = Empty>" src/domain.objects/BrainRepl.ts
# 29:export interface BrainRepl<TContext = Empty> {

grep -n "type ContextBrainSupplier" src/domain.objects/ContextBrainSupplier.ts
# 13:export type ContextBrainSupplier<TSlug extends string, TSupplies> = {

grep -n "genContextBrainSupplier" src/domain.operations/context/genContextBrainSupplier.ts
# 18:export const genContextBrainSupplier = <TSlug extends string, TSupplies>(

grep -n "context as any" src/domain.operations/actor/actorAsk.ts
# 52:    context as any,

grep -n "context as any" src/domain.operations/actor/actorAct.ts
# 43:    context as any,

grep -n "genContextBrainSupplier" src/contract/sdk.ts
# 20:export { genContextBrainSupplier } from '@/domain.operations/context/genContextBrainSupplier';
```

---

## gaps found

none. all requirements from vision, criteria, and blueprint are implemented and verified via grep.

## summary

| source | requirements | covered | gaps |
|--------|--------------|---------|------|
| vision | 6 | 6 | 0 |
| criteria (usecases) | 7 | 7 | 0 |
| blueprint (deliverables) | 12 | 12 | 0 |

all behavior declaration requirements are satisfied by the implementation. each requirement traces to specific file:line locations verified via codebase search.
