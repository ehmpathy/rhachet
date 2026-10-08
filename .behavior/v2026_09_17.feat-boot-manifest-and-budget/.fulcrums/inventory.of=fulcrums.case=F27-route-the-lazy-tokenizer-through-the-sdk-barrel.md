# F27 — route the lazy tokenizer import through the sdk barrel, or keep the direct one?

- **rework** = ✅ **clean** — one import line, in one file, with no signature and no caller touched
- **status** = ANSWERED — A taken
- **confidence** = **96%**, and the 4% is named below
- **where** = `src/domain.operations/boot/calcBootPayloadTokens.ts:44`
- **raised** = 2026-09-20, at `5.1.execution` `review.peer i007 r011` (`enroll-impl-arch-defects` §1,
  as its *"one cheap partial fix, independent of the verdict"*)

---

## .the fork

`F22` records a dispute over two cross-cluster imports. r011 proposes a **partial** resolution of
the second one that stands whatever `F22` settles:

```ts
// A — extant
const { calcBrainTokens } = await import('../brainCost/calcBrainTokens');

// B — proposed
const { calcBrainTokens } = await import('@src/contract/sdk');
```

its argument: `calcBrainTokens` is confirmed public sdk surface (`src/contract/sdk.ts:16`,
`src/contract/sdk.brains.ts:52`), so a contract-layer path already exists — and
`rule.require.bounded-contexts` says *"expose interfaces via `contracts/`"*.

| option | what it costs |
|---|---|
| 🔴 **A** — keep the direct import (taken) | the cross-cluster edge `F22` disputes stays open, un-narrowed |
| **B** — route through `@src/contract/sdk` | 🔴 three separate rule violations, below. and it changes no boundary |

---

## .taken, and why

🔴 **taken: A**, and B is refused rather than merely not-preferred. three reasons, in order of force.

### 1. it is the `directional-deps` blocker, spelled out

`rule.require.directional-deps` states the direction as `contract ← domain.* ← access`, and its edge
table carries the exact row:

> `domain.operations/ → contract/` = **blocker** (upward)

`calcBootPayloadTokens.ts` lives in `src/domain.operations/boot/`. B is that edge.

🟡 **r011's citation is real and points the other way.** *"expose interfaces via `contracts/`"*
describes how an **external consumer** reaches in. the rule that governs how a domain operation
reaches **out** is the one above, and the two are not in tension — they are the same layer contract
read from its two sides.

### 2. `sdk.ts` is a barrel, and the import is deliberately LAZY

```ts
// src/contract/sdk.ts:16
export { calcBrainTokens } from '@src/domain.operations/brainCost/calcBrainTokens';
```

🔴 **a pure re-export of the very file A already names.** B reaches the same module by a longer
route, and crosses a layer boundary to do it.

and the route is not free. `sdk.ts` is 41 lines of barrel — ~25 operations plus `export *` over the
whole `@src/domain.objects` namespace. the import is `await import(...)` for a stated reason:

> *the tokenizer loads LAZILY because `roles boot` runs from a bun binary whose perf suites assert
> `under 250ms`, and js-tiktoken is in no other path of that binary's eval graph.*

⇒ B makes that dynamic import pull **~25 modules plus a namespace** where A pulls one file — in the
one path whose latency is under assertion. **the lazy load's whole point is the narrowness of what
it loads.**

### 3. `rule.forbid.barrel-exports` forbids the shape outright

*"increase codepath variants, increase cyclical import chances, add zero value."*

---

## 🔴 .the general claim, and it is the reason this earned a row

> **a re-export is not a boundary.**

B feels like a boundary repair because the import path grows a `contract/` segment. it is the same
module with a longer name, reached from below. ⇒ **a conformance that changes no edge in the graph
is cosmetic, and here it is cosmetic at the price of three rules.**

🟡 **the 4%:** if this repo later declares a `shared/` or `kernel/` layer beneath `domain.*`, a
genuine downward path for `calcBrainTokens` would exist and A would be superseded by it — not by B.
that is `F22`'s question, not this one.

---

## .what would flip it

- `rule.require.directional-deps` is amended to permit `domain.* → contract/` for re-export-only
  barrels — then B costs only the barrel ban and the eval graph
- `calcBrainTokens` moves **out** of `domain.operations/` into a layer `boot/` may import downward
  from — then neither A nor B is the question
- the `under 250ms` perf assertion is retired — then reason 2 falls, and reasons 1 and 3 still hold

---

## .the clamps

none new. A is the extant line, so the clamp is the **absence** of a change: the `roles.boot.manifest`
and `roles.budget` acceptance suites plus `calcBootPayloadTokens`'s own unit suite pin the behavior,
and the perf suite pins the latency B would have moved.

⚠️ **that is an honest bound, not a full one.** no test asserts *"the eval graph holds one module."*
a B-shaped regression would show as a perf failure rather than as a named assertion, which is why the
argument above is prose rather than a test.

---

## .see also

- `F22` — the parent dispute this row partially addresses, and does not settle
- `rule.require.directional-deps` (mechanic) — the edge table, and the `domain.* → contract/` row
- `rule.forbid.barrel-exports` (mechanic) — the third reason
- `src/domain.operations/boot/calcBootPayloadTokens.ts:28-30` — the lazy load's own docblock
- `F25` — the peer row on the same import, for the ESM half of the question
