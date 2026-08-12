# domain.term.choice.reason: assert

## .etymology

latin *asserere* — to claim, to declare firmly. the word carries **a claim made, not a question
asked**, which is exactly the distinction that separates it from `check` / `verify` / `validate`:
those three ask, and return an answer. an assertion **states**, and the only way it fails is
loudly.

that asymmetry is why the return type is `void`. a `check*` that returned `void` would be
useless; an `assert*` that returned a boolean would invite a caller to ignore it, which is the
one behavior the word forbids.

## .why itemized now

the word **predates this round** — 8 prod declarations across 3 domains. it was itemized on
2026-08-03 because this round **declared two more** (`assertKeyrackReachAbsent`,
`assertKeyrackExportNamesDistinct`), which makes it a constituent verb of a dop declared here,
and `rule.require.domain-term-itemization` applies from that moment.

⚠️ and the round nearly shipped it unexamined. a self-review pass caught that `assert` is **not**
in the sanctioned verb set (`get` / `set` / `gen` / `del` + `as*` / `is*`) and stopped to check
rather than assume the precedent was sound. it was — but the check is what makes it a settled
term instead of a habit.

## .disputes

### dispute: get / set / gen / del  —  raised 2026-08-03  —  status: RESOLVED (keep `assert`)
- raised.by  = the role-standards self-review, on a slow re-read of `rule.require.get-set-gen-verbs`
- claim      = the rule declares a **closed** verb set and calls a synonym verb a **blocker**.
               `assert*` is outside it, so by the rule's letter these two dops are violations
- counter    = the rule carves out *"imperative action commands"*, and offers `dispatchTask` as
               its own example. an `assert*` fits precisely: it names an **act**, not a read and
               not a mutation. it has no resource to `get`, no state to `set`, no resource to
               `gen` or `del`, and returns no value that a get-verb could name. to force one
               into `getKeyrackReachAbsence` would name a *value* the operation does not
               produce — strictly worse, and it would mislead about the return type
- evidence   = **8 prod precedents across 3 unrelated domains** (keyrack, manifest, role), all
               of which predate this work. that is not one author's habit; it is an established
               repo convention with a consistent shape: `assert$Noun$Condition` → void or throw
- resolution = keep `assert`. it is a sanctioned domain verb under the rule's own carve-out

### dispute: assure (via `rule.require.assure-via-type-checks`)  —  raised 2026-08-03  —  status: RESOLVED (keep `assert`)
- claim      = the repo already mandates `is$Noun.assure(x)` for assertions, and names the
               assert-variant `.assure` deliberately. so `assertKeyrackReachAbsent` should be
               `isKeyrackReachAbsent.assure(…)`
- counter    = that rule governs **type** assertions — narrow a value to a type, throw if it is
               not of that type. an `assert*` here narrows **no value**: it holds a rule about a
               *relationship between* values (this mech may not carry a reach; these exports may
               not collide). there is no type to narrow to, so `withAssure` has no predicate to
               wrap and the mechanism does not fit
- resolution = keep `assert` for invariant guards; `.assure` stays the tool for a type narrow.
               the two are complementary, and the split is: **`.assure` narrows one value;
               `assert*` holds a rule**

## .evidence

**the shape, consistent across all 8 precedents:**

```ts
export const assert$Noun$Condition = (input: { … }): void => {
  if (invariantHolds) return;                    // silent success
  throw new ConstraintError(msg, { …, hint });   // loud failure, names the fix
};
```

**the name pattern** is `assert` + `$Noun` (the subject) + `$Condition` (what must be true) — so
the name reads as the invariant itself: *"assert keyrack reach absent"*, *"assert keyrack export
names distinct"*, *"assert registry skills executable"*. a reader learns what is guaranteed from
the filename alone, with no need to open it.

**why the forbidden synonyms are forbidden:**

| word | why not |
|------|---------|
| `validate` | overloaded — commonly returns an error list rather than throws |
| `verify` | implies a report of a result; an assert has no result |
| `check` | asks a question; the answer is the whole point, and here there is none to return |
| `ensure` | implies it will *make* the condition true; an assert never mutates |
| `guard` | names a code shape (the early return), not a domain act |
| `enforce` | implies enforcement that persists; an assert acts once, at one call site |

## .invariants

- an `assert*` returns `void` or throws. it never returns a value, and never a boolean
- an `assert*` never mutates. if it would need to *make* the condition true, it is a `gen*`
- an `assert*` throws a `HelpfulError` subclass with `metadata.hint` — `ConstraintError` when the
  caller can fix it, `BadRequestError` at a cli boundary, per `rule.require.failloud`
- an `assert*` is not a type predicate. a value that must be narrowed wants `is$Noun.assure(x)`
