# self-review: has-questioned-assumptions

## assumption 1: single supplier per brain

### what do we assume here without evidence?

the vision assumes each brain has exactly one supplier slug (e.g., 'xai'). this shapes the `ContextBrainSupplier<TSlug, TSupplies>` type.

### what evidence supports this assumption?

- **code evidence**: `BrainAtom` and `BrainRepl` each have a single `repo` field
- **practical evidence**: each brain package (anthropic, openai, xai) is a separate supplier
- **domain evidence**: a brain implementation comes from one provider

### what if the opposite were true?

if a brain needed multiple suppliers (e.g., a hybrid that uses both xai and anthropic), the current type would not compose. consumer would need:

```ts
ContextBrainSupplier<'xai', XaiSupplies> & ContextBrainSupplier<'anthropic', AnthropicSupplies>
```

this **does work** with intersection types — no design change needed.

### did the wisher actually say this?

the wisher's example shows single supplier. the assumption is implicit but reasonable.

### verdict: ✅ assumption holds

single supplier per brain is the common case. intersection types handle the rare multi-supplier case without design change.

---

## assumption 2: `brain.supplier.<slug>` namespace

### what do we assume here without evidence?

the vision assumes the namespace `brain.supplier.<slug>` is the correct pattern for context keys.

### what evidence supports this assumption?

- **collision avoidance**: prefix prevents clash with other context keys
- **discoverability**: self-documented — you know where the key comes from
- **convention**: follows extant patterns in codebase (e.g., namespaced keys)

### what if the opposite were true?

if we used flat keys like `context.xai`, there's risk of collision with:
- other context patterns in the codebase
- user-defined context extensions

### did the wisher actually say this?

yes. the wish explicitly shows:
```ts
ContextBrainSupplier<'xai', BrainSuppliesXai>
// expands to: { 'brain.supplier.xai': BrainSuppliesXai }
```

the namespace pattern comes directly from the wish.

### verdict: ✅ assumption holds (wisher-specified)

---

## assumption 3: context is optional by default

### what do we assume here without evidence?

the vision assumes `TContext = Empty` as default, which means brains that don't need context continue to work.

### what evidence supports this assumption?

- **backwards compat**: all extant brains have `context?: Empty` and must continue to work
- **progressive complexity**: simple brains shouldn't need to care about context

### what if the opposite were true?

if context were required, all extant code would break:
- parrot fixture
- any other brain implementations
- all call sites

### did the wisher actually say this?

not explicitly, but the wish shows:
```ts
ask: <TOutput, TPlugs, TContext = Empty>(
```

the `= Empty` default is in the wish.

### verdict: ✅ assumption holds (wisher-specified, backwards compat required)

---

## assumption 4: supplies can be async

### what do we assume here without evidence?

the vision shows:
```ts
creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') })
```

we assume suppliers need async credential retrieval.

### what evidence supports this assumption?

- **practical evidence**: credential vaults (AWS Secrets Manager, HashiCorp Vault) are async
- **security practice**: credentials should not be hardcoded, must be fetched at runtime

### what if the opposite were true?

if credentials were always sync (e.g., env vars), the async pattern would be unnecessary overhead.

### did the wisher actually say this?

yes. the wish shows:
```ts
creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') })
```

### verdict: ✅ assumption holds (wisher-specified, practical necessity)

---

## assumption 5: actor context pass-through is out of scope

### what do we assume here without evidence?

the vision lists "should context flow through actor.ask/actor.act?" as an open question, implicitly scoped out for now.

### what evidence supports this assumption?

- **wish scope**: the wish focuses on `BrainAtom.ask` and `BrainRepl.ask/act` signatures
- **incremental delivery**: solve the core generic first, then extend to actors

### what if the opposite were true?

if actors must also accept and pass context, the API surface grows. this may be needed but is separate work.

### did the wisher actually say this?

the wish does not mention actors. it focuses on `BrainAtom` and `BrainRepl` directly.

### verdict: ✅ assumption holds (correctly scoped, open question raised)

---

## assumption 6: genContextBrainSupplier is necessary

### what do we assume here without evidence?

the vision assumes a factory function is needed for ergonomics.

### what evidence supports this assumption?

manual construction is verbose:
```ts
{ [`brain.supplier.${slug}`]: supplies } as ContextBrainSupplier<TSlug, TSupplies>
```

the factory hides template literal and cast.

### what if the opposite were true?

without the factory, users would:
- need to know template literal syntax
- need to cast explicitly
- risk typos in the key string

### did the wisher actually say this?

yes. the wish explicitly requests:
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(input: {
  supplier: TSlug,
  supplies: TSupplies,
}): ContextBrainSupplier<TSlug, TSupplies> => {
  // implementation returns { [`brain.supplier.${slug}`]: supplies }
};
```

### verdict: ✅ assumption holds (wisher-specified)

---

## conclusion

all assumptions reviewed:

| assumption | source | verdict |
|------------|--------|---------|
| single supplier per brain | inferred, reasonable | ✅ holds |
| `brain.supplier.<slug>` namespace | wisher-specified | ✅ holds |
| context optional by default | wisher-specified, backwards compat | ✅ holds |
| supplies can be async | wisher-specified, practical | ✅ holds |
| actor pass-through out of scope | wish scope, open question | ✅ holds |
| genContextBrainSupplier necessary | wisher-specified | ✅ holds |

no hidden assumptions were taken as requirements beyond what the wisher specified or what backwards compatibility requires.
