# domain.term: enroll.depth

term.chosen   = depth
term.kind     = noun
term.boundary = enroll
term.synonyms.forbidden:
- level
- tier
- generation
- hop
- rank

⚠️ **`depth` names TWO quantities here, and only one of them is a budget.** the distinction is the
whole subtlety of the term:

| the quantity | what it is | where it lives |
|---|---|---|
| a clone's **own** depth | a **fact** — how far down the chain it was born | `CLONE_ENV_KEYS.depth` in that clone's env |
| `CLONE_ENROLL_DEPTH_MAX` | a **budget** — the largest such fact we permit to be minted | a constant, `= 1` |

⇒ a fact is read; a budget is checked against. `asCloneEnrollDepth` is the seam: it reads the
**caller's** fact and returns the **child's**, which is then checked against the budget.

## .what

**how many enroll hops separate a clone from the human at the root of its chain.**

```
a human            depth —   (no clone env at all)
  └─ their clone   depth 0
       └─ a peer   depth 1   ← the budget, CLONE_ENROLL_DEPTH_MAX
            └─ ✋  depth 2   refused: ConstraintError, exit 2
```

## 🚨 .the boundary — an enroll chain is unbounded by NATURE

every clone carries the same CLI, so **a clone that may enroll can enroll a clone that may enroll**.
with no bound the chain forks until the host runs out of ptys, and each link costs a real brain.

⇒ the budget is not a safety rail bolted onto a bounded domain. it is the **only** bound there is.

## ⚠️ .the boundary — the +1 is the subtlety

`asCloneEnrollDepth` reads `CLONE_ENV_KEYS.depth` — the **caller's** depth — and returns
`parsed + 1`, the **child's**. the value read and the value returned are two different clones'
facts, which is why the transformer is named rather than inlined (`rule.require.named-transformers`).

| the env holds | the child would be born at | vs budget 1 |
|---|---|---|
| absent (a human) | `0` | ✅ permitted |
| `0` (a human's clone) | `1` | ✅ permitted |
| `1` (a peer) | `2` | ❌ refused |

## ⚠️ .the boundary — a malformed value reads as 0, deliberately

an absent, unparseable, or negative value returns `0` rather than a fault. the var is injected by
our own spawn, so a malformed one means the env was hand-edited or inherited from a foreign tool —
neither of which is evidence of a deep chain.

- to **fault** here would convert a cosmetic env smudge into an enroll that cannot run at all
- to treat it as **MAX** would lock a human out of their first clone

## .refs
- `src/domain.operations/clone/asCloneEnrollDepth.ts`   # the +1 seam and `CLONE_ENROLL_DEPTH_MAX`
- `src/utils/cloneEnvKeys.ts`                           # `depth` — the env key the fact rides
- `src/contract/cli/invokeEnroll.ts`                    # the guard, which fires before any clone dir exists
- `blackbox/cli/enroll.acceptance.test.ts`              # `rhx enroll depth budget` — refuse + permit

## .reason
see the ref-level cluster beside this choice:
- `term=enroll.depth._.choice.reason.md` — etymology, the wisher's bound, the rejected peers
