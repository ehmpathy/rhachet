# rule.forbid.helpful-error-parents

## .what

throw exactly **two** error words: `ConstraintError` and `MalfunctionError`.

never throw their `helpful-errors` parents — `BadRequestError`, `UnexpectedCodePathError` —
and never a bare `Error`.

```
HelpfulError
├── BadRequestError          ← parent. names no owner. DO NOT THROW
│   └── ConstraintError      ← caller fixes it, exit 2
└── UnexpectedCodePathError  ← parent. names no owner. DO NOT THROW
    └── MalfunctionError     ← server fixes it, exit 1
```

## .why

the parents are reachable and throwable, but they name no **owner** — so they decide neither
the exit code nor the remedy. only the two leaves carry that.

`rule.require.failloud` already holds the right table (caller → `ConstraintError` → 2,
server → `MalfunctionError` → 1). what it does not say is that the **parents are forbidden**,
and that gap is exactly what let a defect ship.

## .the defect this rule exists to prevent

found by peer review on `beav/feat-keyrack-unlock-scope`, 2026-08-10:

1. `inferKeyrackMechForSet.ts` threw a bare `BadRequestError` for a mistyped menu choice
2. `emitKeyrackBlockedReport` accepts a `ConstraintError` **by type**, deliberately, so a
   `MalfunctionError` cannot be dressed up as caller-fixable
3. a `BadRequestError` is therefore **not** accepted — it is the parent, not the leaf
4. so the fault could not route through the turtle blocked-report renderer

the result a human saw from `keyrack fill`:

```
         │  │  choice: 9
BadRequestError: invalid mechanism choice
{
  "answer": "9",
  "expected": "1-2"
}
[args] keyrack,fill,--env,test
```

a raw class name, a json blob and an `[args]` trailer, flush-left, **outside** the treestruct
it interrupted — while every peer command (`get`, `source`, `set`, `del`, `unlock`) rendered
the same class of fault as `🐢 bummer dude...`. one rule, two renders, picked by which command
a human typed (`rule.forbid.surprises`, nielsen heuristic 4).

## ⚠️ .the trap — never widen the guard

the attractive fix was to **widen** `emitKeyrackBlockedReport` from `ConstraintError` to
`BadRequestError`. it type-checks, it is backward compatible, and it even preserves the
"`MalfunctionError` cannot pass" property.

**it is still wrong.** it admits a vaguer class and blurs the one distinction that decides the
exit code. the right fix is to correct the **throw site**.

> if a type guard or renderer rejects your error, the **error** is wrong — not the guard.

## .the test

ask: **"who fixes this?"**

- the caller → `ConstraintError`, exit 2
- the server → `MalfunctionError`, exit 1
- cannot answer → you do not yet understand the fault, so do not throw yet

## .examples

### 👎 bad — a parent class, so no owner and no exit code

```ts
throw new BadRequestError('invalid mechanism choice', {
  answer,
  expected: `1-${supported.length}`,
});
```

### 👍 good — the leaf, plus a hint that names the fix

```ts
throw new ConstraintError('invalid mechanism choice', {
  answer,
  expected: `1-${supported.length}`,
  hint: `enter a number between 1 and ${supported.length}`,
});
```

## .enforcement

- a thrown `BadRequestError` or `UnexpectedCodePathError` = **blocker**
- a bare `throw new Error(...)` = **blocker**
- a type guard widened to admit a parent class, rather than a throw site corrected =
  **blocker**

## .the in-repo inventory — the rule is NOT yet met

this rule was authored the day the defect above shipped, so it states the target, not the
current state. measured 2026-08-10, in prod code only (`src/`, tests excluded):

```
throw new BadRequestError | throw new UnexpectedCodePathError | .throw
  → 339 sites across 133 files
  → 16 of them in src/contract/cli/invokeKeyrack.ts alone
```

so a live example is one command away:

```
$ rhx keyrack status --env invalid
BadRequestError: invalid --env: must be one of sudo, prod, prep, test, all, camp

[args] keyrack,status,--env,invalid
```

the same flush-left class dump the `keyrack fill` defect produced — a caller's typo reported
as exit 1, with no turtle report. and the `--env` validator alone is duplicated at **five**
sites (`invokeKeyrack.ts` ×4 + `asResolvedEnvForSet.ts`), each with its own copy of the throw.

### ⚠️ the migration is NOT a blind find-and-replace

each site must be re-asked **"who fixes this?"** before it moves. the two parents do not map
one-to-one onto the two leaves:

- a `BadRequestError` is usually a `ConstraintError` — but not always; some are internal
  invariants a caller cannot reach, which are `MalfunctionError`
- an `UnexpectedCodePathError` is usually a `MalfunctionError` — but some guard a caller's
  input from a boundary and owe exit 2

and **each move changes an exit code**, so an acceptance suite that pins the old code goes
red. that redness is the fix rendered, not a regression — the same way `keyrack fill`'s
`[case10]`/`[case11]` moved from 1 to 2.

### why it was not taken with the defect that produced it

the `keyrack fill` fix corrected the **one** throw site whose fault could not render, plus the
five in `fillKeyrackKeys.ts` it halts through. to convert the other 333 would move exit codes
across every cli surface in the repo — a repo-wide contract change, tracked separately rather
than smuggled into a feature branch.

## .see also

- `rule.require.failloud` (mechanic) — the caller/server table this sharpens
- `rule.require.exit-code-semantics` (mechanic) — 0 success, 1 malfunction, 2 constraint
- `rule.require.errors-name-the-fix` (ergonomist) — the `hint` the good example carries
- upstream: `ehmpathy/rhachet-roles-ehmpathy#556` — to state this in the org-wide mechanic briefs
