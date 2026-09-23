# domain.term.choice.reason: enroll.depth

## .etymology

**depth** is the tree word, and the chain it measures is a tree: one human at the root, clones
branched below. a reader who knows a call stack or a directory tree already knows what depth 1
means, with no gloss — which is the test `def.domain-discovery` sets.

it also carries the right **direction**. a chain grows *downward* from a human, and the budget caps
how far down a mint may reach. `depth` says that; every rejected peer below says less.

## .the rejected peers

| candidate | why it was refused |
|---|---|
| `level` | already the peer-review ladder's word (`l1`/`l2`/`l3` in a guard). one word, two concepts — `rule.forbid.domain-term-ambiguity` |
| `tier` | connotes a **class** (free/pro), never a **distance**. a depth-1 clone is not a lesser kind of clone |
| `generation` | implies descent from a parent that may be gone. every link here is a live chain, and the whole chain matters |
| `hop` | names one **edge**, where the budget counts **distance from the root**. `hop 1` reads as "one step from somewhere", which leaves the root unnamed |
| `rank` | implies an authority sort. a peer clone has no less authority than the clone that enrolled it — only less budget left |

## .the wisher's bound

verbatim, 2026-09-16:

> *"up to depth 1 clone"*

and, in the same round:

> *"rhx enroll should be available for oyu up to depth 1 clone"*

⇒ the wisher named both the **capability** and its **budget** in one clause, and named the budget
with this word. so `depth` is adopted, never coined — the term was theirs first.

⇒ archived in full at `.behavior/v2026_09_11.fix-clone-say/.seeds/`.

## .why 1, and not 0 or 2

| budget | what it buys | verdict |
|---|---|---|
| `0` | a human may enroll; a clone may not | ❌ refuses the very capability the wisher asked for |
| **`1`** | a human's clone may enroll one peer; that peer may enroll no one | ✅ **the wisher's number** |
| `2+` | a chain three deep | ❌ buys no named capability, and each link costs a real brain |

⇒ depth 1 buys the ONE capability the peer motive needs — *a clone stands up a peer and talks to
it* — and buys no more. that is `rule.prefer.bounded-scope` applied to a budget.

## .why the bound is checked BEFORE any clone dir exists

the guard fires ahead of the clone dir and ahead of the child spawn, so an over-budget enroll leaves
no half-formed chain behind — there is no orphan dir to prune and no brain process to kill.

⇒ `rule.prefer.prevent-over-correct`, rung 1: the wrong state is never expressible, over reported
after the fact.

## .evidence

- **the wisher's words** above — the term and its number, both adopted verbatim
- **dimensional walk**: the env value crosses `{absent, 0, 1, malformed, negative}` × the budget,
  and every cell is named in the `._.choice._.md` tables
- **clamp, dogfooded by mutation** (`rule.require.clamp-edge-cases`):

  | mutation | observed |
  |---|---|
  | drop the `+1` | 🔴 3 failed (48s) — the caller's depth is read as the child's |
  | restore | 🟢 6 passed |

- **files**: `asCloneEnrollDepth.test.ts` (unit) · `blackbox/cli/enroll.acceptance.test.ts`
  `rhx enroll depth budget` `[case1]` refuse, `[case2]` permit

## .invariants

- the depth is carried in the **child env**, never on disk and never as a flag. a flag would let a
  clone under-report its own depth and mint a chain the budget forbids
- `[case2]` — the **permit** row — carries as much weight as the refusal. a budget that refused a
  depth-0 caller would make `rhx enroll` unreachable by a clone at all, which is the exact defect
  `term=enroll.attended` repaired
