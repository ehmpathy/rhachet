# rule.forbid.helpful-error-parents

## .what

throw exactly **two** error **families**: `ConstraintError` and `MalfunctionError` — either
leaf itself, **or a subclass that extends one of them**.

never throw their `helpful-errors` parents — `BadRequestError`, `UnexpectedCodePathError` —
and never a bare `Error`.

```
HelpfulError
├── BadRequestError          ← parent. names no owner. DO NOT THROW
│   └── ConstraintError      ← caller fixes it, exit 2
│       └── <YourError>      ← a subclass. inherits owner + exit 2. OK to throw
└── UnexpectedCodePathError  ← parent. names no owner. DO NOT THROW
    └── MalfunctionError     ← server fixes it, exit 1
        └── <YourError>      ← a subclass. inherits owner + exit 1. OK to throw
```

⇒ the forbidden move is a DIRECTION, never a depth: never reach **up** to a parent that names
no owner. a subclass that extends a leaf reaches **down** — it inherits the leaf's owner and
exit code, so it decides both exactly as the leaf does. what a subclass adds is a
distinguishable type a catch site can branch on (`instanceof CloneWireCorruptionError`) with the
owner/exit-code guarantee held intact — the same reason `asCliErrorJson` reads
`error.constructor.name`, which a subclass sharpens rather than breaks.

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

## 🚨 .any error you TOUCH conforms — the fix-forward half

the two parents are **deprecated**. no new throw may use one, and — this is the half that retires
the extant 197 without a sweep — **an error site your change already touches converts on the way
through.**

| you are about to | then |
|---|---|
| write a **new** throw | 🔴 `ConstraintError` or `MalfunctionError`. never a parent, never bare `Error` |
| **edit** a line that throws a parent | 🔴 convert it. you already hold the context to answer *"who fixes this?"* |
| edit a **file** that throws parents on lines you do not touch | leave them. this is on-contact, not per-file |
| **read** a parent throw and move on | leave it — a read is not a touch |
| sweep the repo to convert them all | 🔴 **forbidden** — see the migration hazard below |

⇒ this is `rule.prefer.scouts-honor` bound to one defect class, and the bound is what makes it
safe: **at contact you have already paid the cost to grasp the site**, which is the exact cost the
*"who fixes this?"* question demands and the exact cost a bulk rewrite cannot pay.

⚠️ **and the conversion is never free of a clamp.** each move changes an exit code, so a test that
pins the old one goes red. **that redness is the fix rendered, not a regression** — resnap it and
say so, or the next reader reads the resnap as a regression waved through.

## .enforcement

- a thrown `BadRequestError` or `UnexpectedCodePathError` = **blocker**
- a bare `throw new Error(...)` = **blocker**
- a type guard widened to admit a parent class, rather than a throw site corrected =
  **blocker**
- a parent throw left in place **on a line your change already edits** = **blocker**
- a bulk find-and-replace across untouched sites = **blocker** (each site owes the owner question)
- a subclass that extends `ConstraintError` or `MalfunctionError` = **false positive** — it
  reaches down, so it inherits the leaf's owner and exit code; the direction, never the depth,
  is what this rule forbids
- a bare `Error` thrown by a test SPECIMEN whose declared subject IS the unclassified path =
  **false positive** — a leaf would be classified, so the one input that proves the cli's
  unclassified arm cannot be a leaf. the specimen lives in test code — a `src/.test/` asset, or
  a fixture a blackbox test writes into its temp repo — and its docblock names this carve-out
  (e.g. `example.rhachet.use.plainThrow.ts`, `upgrade.acceptance` `[case17]`)

## .the in-repo inventory — the rule is NOT yet met

this rule was authored the day the defect above shipped, so it states the target, not the
current state.

⚠️ **a count decays, so it is stated with its date and its exact predicate — never as "the"
number.** re-derive rather than cite; a stale figure quoted as current is the same false-record
shape this rule's own §*"the trap"* names.

```
# the predicate, verbatim, so a re-measure is comparable
#   throw new (BadRequestError|UnexpectedCodePathError)  |  (…)\.throw
# scope: src/, prod only (*.test.ts excluded)

2026-09-06  → 197 sites across  81 files
2026-09-07  → 191 sites across  78 files
```

⚠️ **the delta is the on-contact half at work, and it is NOT a sweep.** one file of it is
attributable — `getRoleFromManifests.ts`, 4 sites, converted because a change already touched it.
the rest is unattributed and is stated as such rather than claimed. **the migration itself is
un-taken**, and is queued as `.dream/2026_09_07.forbidden-error-parents-remain-at-191-sites.dream.md`,
which carries the per-area breakdown a later traveler needs.

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
