# rule.require.clamp-the-premise-a-guard-rests-on

> **when a branch exists because *"the path beneath it would throw"*, clamp the THROW — never
> the output.**

an output assertion cannot part *"the guard worked"* from *"the guard was never needed."* both
render the same value, so both are green, forever.

## .why

a guard's docblock is a **claim**, and a claim no run measures is a claim that justifies its branch
for as long as anyone reads it. worse than an unjustified branch: the reason to keep it *reads as
measured*, so the next reader who might have deleted it does not.

the failure has a shape, and the shape is what makes it invisible:

| | the guarded path | the unguarded path |
|---|---|---|
| what it renders | the same value | the same value |
| what an output assertion sees | green | green |
| what parts them | **only a `not.toThrow` on the unguarded call** | — |

⇒ the whole defect lives in the gap between *"the branch produces the right answer"* (measured) and
*"the branch is why the answer is right"* (assumed).

## .the test

> **"if I deleted this branch, WHICH row goes red?"**

- a row goes red → the premise is clamped
- every row stays green → 🔴 the branch is redundant, or its clamp is blind. **name which** before
  you keep it
- you cannot say without a run → run it. that is the dogfood `rule.require.clamp-edge-cases` demands

⚠️ the second question is the one that gets skipped: **"is the premise itself measured anywhere?"**
a branch can be genuinely load-bearing and still rest on a false reason.

## .the worked case — measured 2026-09-06, `src/utils/asThrownValueText.ts`

a total renderer carried a symbol branch, with this justification in its own docblock:

> *"`String(Symbol('x'))` raises `TypeError: Cannot convert a Symbol value to a string`."*

**it is false.** `String(value)` holds an explicit carve-out for symbols and returns their
descriptive text. what raises is IMPLICIT conversion — a template literal, or `+ ''`.

so the branch was redundant with the fallback beneath it, and **strictly weaker**: the carve-out
reads a symbol's description directly, where `.toString()` goes through a prototype method a caller
could patch.

**how it survived:** three test rows asserted `asThrownValueText(Symbol('nope')) === 'Symbol(nope)'`.
that is true down **both** paths. the claim had spread to four files — among them the docblock of
the function written to cure the hazard — and a peer review report repeated it back as fact.

**how it was caught:** the dogfood of an unrelated clamp. a revert of the fix was expected to redden
two rows; **one reddened.** the row that stayed green was the whole discovery.

**the cure that closed it** — the premise, not the output:

```ts
const thrown = Symbol('nope');
expect(() => String(thrown)).not.toThrow();
expect(() => `${thrown as unknown as string}`).toThrow(TypeError);
```

## .where it fires

any guard whose reason is a **capability claim about the code beneath it**:

- *"`String()` would throw here"* → assert `String()` throws
- *"this would be `undefined` without the default"* → assert it is `undefined` unguarded
- *"the raw call is not idempotent"* → call it twice, unguarded, and show the divergence
- *"this regex is needed because the plain match over-consumes"* → run the plain match

⇒ each is one `expect` on the **unguarded** expression. that is the whole cost.

## .the caveat

this is no demand that every branch carry a proof. it fires when a branch is **justified in prose by
a claim about behavior** — that claim is what earns a measurement. a branch whose reason is a domain
rule (*"an empty list must render `none`"*) is clamped by its own output row and needs no second one.

⚠️ and a redundant branch is not always a deletion. state which it is — *"redundant, deleted"* or
*"kept for X, and here is X measured."* the failure this rule names is neither of those; it is the
third option, where nobody knows.

## .enforcement

- a guard justified by a behavior claim, where deletion reddens no row = **blocker**
- a docblock that cites specific behavior (an error class, a message, a return) with no run behind
  it = **blocker** — a wrong reason is worse than an absent one, because it stops the next look
- a branch kept after its premise is refuted, with no restated reason = **blocker**

## .see also

- `rule.require.clamp-edge-cases` (mechanic) — the dogfood loop that surfaces this; *"a clamp with
  no teeth is a claim that looks like a proof"*
- `rule.forbid.host-specific-cures-in-hints` — the same demand, narrowed to a hint's host premise
- `rule.require.timeless-comments` (mechanic) — a docblock is read as durable fact; this rule is
  what makes it one
- `rule.require.fewer-paths-via-idempotency` (architect) — the branch a refuted premise leaves
  behind is a code path to collapse
