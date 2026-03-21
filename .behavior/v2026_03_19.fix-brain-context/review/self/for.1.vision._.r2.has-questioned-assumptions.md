# self-review r2: has-questioned-assumptions

second pass. slower. deeper.

---

## re-read: the vision document

line by line review...

### line 35: `BrainAtom<ContextBrainSupplier<'xai', BrainSuppliesXai>>`

wait. the vision shows the generic on the **class/interface**, not just on the method.

the wish shows:
```ts
ask: <TOutput, TPlugs, TContext = Empty>(...)
```

the generic is on the **method**.

but the vision shows:
```ts
export const xaiAtom: BrainAtom<ContextBrainSupplier<'xai', BrainSuppliesXai>> = {
```

the generic is on the **type**.

**issue found**: the vision misrepresents the contract. the wish adds `TContext` to the method signature. the vision shows it on the type annotation.

### how this matters

if `TContext` is on the method:
```ts
interface BrainAtom {
  ask: <TOutput, TPlugs, TContext = Empty>(input, context?: TContext) => ...
}
```

then callers can pass different contexts on each call:
```ts
const atom: BrainAtom = xaiAtom;
await atom.ask(input1, xaiContext);
await atom.ask(input2, anthropicContext); // different context!
```

if `TContext` is on the interface:
```ts
interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => ...
}
```

then the brain is bound to one context type:
```ts
const atom: BrainAtom<XaiContext> = xaiAtom;
await atom.ask(input1, xaiContext);
await atom.ask(input2, anthropicContext); // type error!
```

**the wish says method-level. the vision illustrates interface-level.**

### verdict: 🔴 issue found

this is a design question for the wisher:
- method-level generic = flexible, each call can have different context
- interface-level generic = constrained, brain is typed to one context

both are valid. but the vision must match the wish, or the question must be raised.

---

## action: fix the vision

i will **not** fix the vision. this is a design question.

instead, i will add this to the "open questions" section of the vision.

---

## re-read: assumption about BrainRepl.act

### line 75 in vision shows usecases table

the table says "declare `TContext` on BrainAtom/BrainRepl" but:
- the wish explicitly mentions BrainRepl.ask AND act
- the vision focuses only on ask

is act different?

checked the code... `BrainRepl.ts:86-95` shows `act` has the same signature as `ask` with `context?: Empty`.

**verdict**: act is the same pattern. the vision could be more explicit but this is not an error — just a completeness note already captured in r1.

---

## re-read: genContextBrainSupplier signature

the wish shows:
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(input: {
  supplier: TSlug,
  supplies: TSupplies,
}): ContextBrainSupplier<TSlug, TSupplies> => {
```

but the vision shows:
```ts
const context = genContextBrainSupplier({
  supplier: 'xai',
  supplies: {
    creds: async () => ({...}),
  },
});
```

this matches. no issue.

---

## deeper look: what if Empty doesn't work?

the wish says `TContext = Empty` for backwards compat.

what is `Empty`? let me check.

from `type-fns`, `Empty = Record<string, never>` — an object with no properties.

if a brain declares `TContext = Empty`, and a caller passes `{ foo: 'bar' }`, does it type check?

```ts
type Empty = Record<string, never>;
const fn = <T = Empty>(ctx?: T) => ctx;
fn({ foo: 'bar' }); // does this work?
```

yes, because `T` is inferred from the argument, not from the default.

**verdict**: no issue. the default only applies when `T` is not inferred.

---

## summary of r2 review

| item found | severity | action |
|---------|----------|--------|
| method-level vs interface-level generic | 🟡 design question | add to open questions in vision |
| act not explicitly shown | 🟢 completeness note | captured in r1 |
| Empty default behavior | 🟢 verified | no issue |

---

## action taken

i will update the vision to add the method-vs-interface question to "open questions".

wait — the route says "for each issue found, articulate how it was fixed". but i said i will not fix the vision directly because it's a design question.

let me reconsider. the vision should accurately represent the wish. if the wish says method-level generic, the vision examples should match.

**decision**: update the vision examples to show method-level generic usage, and add a note about the design tradeoff.

---

## fix applied

updated `.behavior/v2026_03_19.fix-brain-context/1.vision.md`:

the vision examples used `BrainAtom<TContext>` syntax which implied interface-level.

the wish says method-level: `ask: <TOutput, TPlugs, TContext = Empty>`.

**changes made:**

1. updated "day-in-the-life: after" example to show method-level generic on `ask`
2. updated "supplier declares context type" example to show method-level generic
3. updated usecases table to say "use `TContext` method generic"
4. updated timeline to reflect method-level pattern
5. added assumption #4 about method-level generics
6. added "design decisions" section with explicit rationale for method-level choice
7. updated summary table to note "(method-level generic)"

the vision now matches the wish's method-level generic design.
