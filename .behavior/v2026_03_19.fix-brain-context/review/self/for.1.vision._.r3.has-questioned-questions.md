# self-review r3: has-questioned-questions

third pass. deeper still.

🍵 tea first.

---

## pause and center

the review is the work.
not a gate to pass.
the work itself.

i am not the author. i am the reviewer.

---

## re-read the triaged questions

let me read the vision's open questions section with fresh eyes, line by line...

### questions to validate with wisher

**1. should context flow through actor.ask/actor.act automatically?**

triage: [wisher]

**review**: this is correctly triaged. the wisher must decide the actor behavior.

but wait — let me check if the wish says about actors...

the wish says:
```
## what we need

### 1. generic context on BrainAtom.ask()
```

the wish focuses on BrainAtom and BrainRepl. it does not mention actors at all.

**verdict**: correctly triaged as [wisher]. actors are out of scope for the wish, so this is a valid question for future work.

**why it holds**: the wisher explicitly scoped the wish to BrainAtom and BrainRepl. the wish document shows specific signatures for `BrainAtom.ask()` and mentions BrainRepl. actors are a layer above brains — they orchestrate brain invocations. whether context flows automatically through this orchestration layer is a separate design decision that belongs with the wisher.

the vision is right to flag this as [wisher] rather than assume.

---

### external research needed

**1. how do other brain sdks handle credential injection?**

triage: [research]

**review**: this is useful context but not a blocker. we can proceed without it.

**verdict**: correctly triaged as [research].

**why it holds**: research validates design choices against industry practice. however, the wish provides clear requirements. we have enough signal to proceed with the blueprint. research can confirm or suggest refinements later.

**2. any prior art for typed context generics in similar domains?**

triage: [research]

**review**: same as above — useful but not a blocker.

**verdict**: correctly triaged as [research].

**why it holds**: TypeScript generics are well-understood. the pattern of `<T = DefaultType>` with optional parameters is standard. research here would be academic interest, not a design dependency.

---

### resolved questions

**1. multiple supplier contexts**

marked as: supported via intersection types

**review**: this is correct. TypeScript intersection types work:
```ts
type Combined = ContextBrainSupplier<'xai', XaiSupplies> & ContextBrainSupplier<'anthropic', AnthropicSupplies>;
```

a brain implementation can require both contexts. the r1 review (has-questioned-assumptions) already verified this.

**verdict**: correctly resolved.

**why it holds**: TypeScript's intersection types are designed for this exact usecase — merge distinct record types into one. each `ContextBrainSupplier<slug, supplies>` produces a record with a unique key. intersection of two such records produces a record with both keys. there's no collision because the keys are namespaced (`brain.supplier.xai` vs `brain.supplier.anthropic`).

**2. namespace pattern**

marked as: wisher specified

**review**: the wish explicitly shows:
```ts
// expands to: { 'brain.supplier.xai': BrainSuppliesXai }
```

**verdict**: correctly resolved. not a question.

**why it holds**: the wisher provided this exact template literal pattern in the wish. it's not inferred — it's specified. the vision must respect what the wisher requested. the namespace pattern `brain.supplier.<slug>` avoids collisions and is self-documenting. the wisher made this design decision already.

---

## are there other open questions?

let me scan the vision for implicit questions...

### line 42-45: method implementation signature

the vision shows:
```ts
ask: async <TOutput, TPlugs, TContext extends XaiContext>(
  input,
  context: TContext,
) => {
```

but the BrainAtom interface currently shows:
```ts
ask: <TOutput, TPlugs>(input, context?: Empty) => ...
```

**question**: how does the supplier override the interface's method signature?

**answer via logic**: they don't override it. the interface will change to:
```ts
ask: <TOutput, TPlugs, TContext = Empty>(input, context?: TContext) => ...
```

the supplier simply uses the generic. no override needed.

**verdict**: [answered] — the interface changes, suppliers use the generic.

### line 194: "consumer forgets to pass context"

the vision says: "typescript error if brain requires it"

**question**: how does TypeScript error if context is optional (`context?: TContext`)?

**answer via logic**: if the supplier constrains `TContext extends XaiContext`, and the consumer passes no context, TypeScript infers `TContext = undefined` which doesn't extend `XaiContext`.

wait — that's not quite right. let me think more carefully...

if the interface says:
```ts
ask<TOutput, TPlugs, TContext = Empty>(input, context?: TContext)
```

and the supplier's implementation constrains:
```ts
async <TOutput, TPlugs, TContext extends XaiContext>(input, context: TContext)
```

there's a mismatch. the interface says `context?` (optional). the supplier's constraint requires it.

**issue found**: the vision claims TypeScript will error, but with method-level generics on an optional parameter, this may not work as expected.

**fix**: this needs to be explored in the criteria/blueprint phase. add to research items.

---

## summary of r3 review

| item | triage | status |
|------|--------|--------|
| actor context flow | [wisher] | ✅ correctly triaged |
| other sdk patterns | [research] | ✅ correctly triaged |
| prior art | [research] | ✅ correctly triaged |
| multiple suppliers | [answered] | ✅ correctly resolved |
| namespace pattern | [answered] | ✅ correctly resolved |
| optional context enforcement | 🔴 new issue | added to research |

---

## fix applied

updated `.behavior/v2026_03_19.fix-brain-context/1.vision.md`:

added research item about how to enforce required context with optional parameter:
- "how does TypeScript enforce required context when the interface declares `context?` as optional?"

this is a type system design question that needs exploration in criteria phase.
