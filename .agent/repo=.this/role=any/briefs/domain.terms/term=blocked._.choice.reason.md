# domain.term.choice.reason: blocked

## .etymology

from the road metaphor the keyrack renders already speak: a command is a route a caller walks, and
a caller-fixable fault is a **road closed** — the way is shut, and the caller holds what reopens it.
the word was not coined for the term; it was read off the render that already existed
(`└─ ✋ blocked: …`), then promoted to the vocabulary once the round below settled what it admits.

chosen over `failed` (spans both owners, so it dissolves the exit-code distinction), `rejected` /
`refused` (name the command's act, not the caller's state — and `refused` is already spent on
`KeyrackMechReachPolicy.REFUSED`), and `denied` (implies a permission verdict, which this is not —
a mistyped menu choice is denied by nobody).

## .the defect that settled the admission rule — 2026-08-10

the term's `.what` was loose until a live defect forced it sharp. `keyrack fill` prompts for a
mechanism; a human typed `9` against a 1–2 menu, and got:

```
         │  │  choice: 9
BadRequestError: invalid mechanism choice
{
  "answer": "9",
  "expected": "1-2"
}
[args] keyrack,fill,--env,test
```

a raw class name, a json blob and an `[args]` trailer, flush-left, **outside** the treestruct it
interrupted — while every peer command (`get`, `source`, `set`, `del`, `unlock`) rendered the same
class of fault as the blocked tree. one rule, two renders, picked by which command a human typed
(`rule.forbid.surprises`, nielsen heuristic 4).

**two causes, and the second is the one that taught the term:**

1. the treebucket was opened and never closed, so the dump escaped the tree
2. `inferKeyrackMechForSet` threw a bare **`BadRequestError`** — the PARENT of `ConstraintError` —
   and `emitKeyrackBlockedReport` accepts a `ConstraintError` by type, so the fault could not route
   through the blocked renderer at all. it also exited **1** (server defect) rather than **2**,
   because the parent carries no `.code.exit`

## ⚠️ .the dispute that was raised and closed the same day

### dispute: widen the guard to `BadRequestError` — raised 2026-08-10 — status: RESOLVED (keep `ConstraintError`)

- raised.by = the driver, mid-fix
- claim = `emitKeyrackBlockedReport`'s bound could be widened from `ConstraintError` to its parent
  `BadRequestError`. it type-checks, it is backward compatible, and it even preserves the property
  that a `MalfunctionError` cannot pass. one line, and the fault renders
- counter = the wisher's, and decisive: *"prefer constraint error and malfunction error"* … *"clearly"*.
  a widened bound admits a vaguer class and blurs the one distinction that decides the exit code.
  the parents name no **owner**, so they decide neither the code nor the remedy — they are reachable
  and throwable, but they are not words this repo speaks
- resolution = the bound stays `ConstraintError`. the **throw sites** moved instead
  (`inferKeyrackMechForSet` + all 5 in `fillKeyrackKeys`), and the exit code corrected 1 → 2. a
  ⚠️ note on the operation now forbids a future widen, and `rule.forbid.helpful-error-parents`
  states it repo-wide

> **the generalized lesson:** if a type guard or renderer rejects your error, the **error** is
> wrong — not the guard.

## .evidence

**the render, after** — and note the exit code is part of the term, not a detail beside it:

```
         │  │  choice: 9
         │  │
         │  └─
🐢 bummer dude...
⠀
🐚 keyrack fill
   └─ ✋ blocked: invalid mechanism choice
      └─ hint: enter a number between 1 and 2
```

**clamped, and dogfooded on both halves separately** (`rule.require.clamp-edge-cases`) —
`blackbox/cli/keyrack.fill.acceptance.test.ts` `[case10]` / `[case11]`:

| revert | result | proves |
|--------|--------|--------|
| throw site back to `BadRequestError` | 4 failed (2 exit-code + 2 snapshot) | the error-word half |
| the bucket-close `catch` removed | 2 failed (snapshots only) | the render half |
| both restored | 43 passed / 0 failed, on an independent run | the fix |

the two reverts redden **different** counts, so neither half implies the other.

**the term is not yet met repo-wide.** measured the same day, prod code only:

```
throw new BadRequestError | throw new UnexpectedCodePathError | .throw
  → 339 sites across 133 files   (16 in invokeKeyrack.ts alone)
```

so a fault that cannot render blocked is still one command away — `keyrack status --env invalid`
dumps a bare class name today. tracked at **ehmpathy/rhachet#461**, cut one pr per surface, with
each site re-asked *"who fixes this?"* rather than blind-replaced.

## .invariants

1. a render labelled `blocked` was produced by a `ConstraintError` — never any other class
2. a blocked render and exit 2 always co-occur; neither appears without the other
3. `MalfunctionError` never renders blocked; it is a crash, and it exits 1
4. no `BadRequestError` or `UnexpectedCodePathError` is ever thrown, so neither can reach either
   branch

## .see also

- `term=notice._.choice._.md` — the three render nouns; `report` is the noun `blocked` qualifies
- `rule.forbid.helpful-error-parents` — the repo rule this term rests on
- `rule.require.exit-code-semantics` — 0 success, 1 malfunction, 2 constraint
- `rule.require.errors-name-the-fix` — the `hint` leaf a blocked report carries
- upstream: `ehmpathy/rhachet-roles-ehmpathy#556` — the org-wide mechanic brief
