# fulcrum F22 — is a peer noun-cluster under `domain.operations/` a bounded context?

- raised  = `5.1.execution` `review.peer r005` (arch-scope-leaks, blocker.1 + blocker.2)
- rework  = clean
- status  = ANSWERED
- confidence = 🔴 **93%**

## .the fork, stated fairly

a reviewer graded two imports a **scope leak** under
`rule.forbid.scope-leaks` / `rule.require.bounded-contexts`:

| the import | from | into | the concern |
|---|---|---|---|
| `getRoleBriefRefs`, `assertZeroOrphanMinifiedBriefs`, `extractSkillDocumentation` | `domain.operations/role/` | `domain.operations/boot/genBootPayload.ts` | r005 blocker.1 |
| `calcBrainTokens` | `domain.operations/brainCost/` | `domain.operations/boot/calcBootPayloadTokens.ts` | r005 blocker.2 |
| `syncRhachetHooksIntoOneBrainRepl` kernel | `domain.operations/brains/` | `domain.operations/init/hooks/` | a peer lane, same shape |

🟡 **all three rows are ONE question**, which is why they share a fulcrum rather than take three:
each is a named import between two peer noun-clusters under `domain.operations/`, and each is a
leak **iff** those clusters are bounded contexts.

the rule it cites says *"forbid imports from other domains' internal logic"* and *"expose
interfaces via contracts/, shared/"*.

| option | what it claims |
|---|---|
| **A — the clusters ARE bounded contexts** | each import is a leak; a shared surface is owed between them |
| **B — the clusters are SUBDOMAINS of one context** | a named cross-cluster import is the sanctioned mechanism, and no shared layer is owed |

## .taken, and why at the time

**B.** four measurements, each checkable:

**1. the population.** `domain.operations/` holds **27 peer noun-clusters** under one layer —
`boot/`, `brainCost/`, `brains/`, `init/`, `role/`, `invoke/`, … . a bounded context is a
**trust boundary with its own vocabulary**; 27 of them inside one npm package, one `src/`, one
tsconfig, and one published contract is not a boundary, it is a directory convention
(`rule.require.directory.by-primary-noun`).

**2. the precedent on `origin/main`, three PRs deep.** the identical shape already ships:

| pr | the import |
|---|---|
| #336 | `domain.operations/role/*` consumed cross-cluster |
| #286 | the briefs operations, consumed cross-cluster |
| #221 | the same pattern again |

⇒ to grade this a leak is to grade the extant repo a leak, and the reviewer's rubric cannot see
`origin/main`.

**3. `calcBrainTokens` is PUBLIC SDK SURFACE, not a `brainCost` internal.** it is exported at two
contract files:

```
src/contract/sdk.ts:16
src/contract/sdk.brains.ts:52
```

⇒ the rule's own repair — *"expose interfaces via contracts/"* — is **already done**. an import of
a published operation is the sanctioned path, never a reach into internal logic.

**4. there is no alternative mechanism.** `rule.forbid.barrel-exports` forbids an `index.ts`
re-export, and `rule.require.directional-deps` puts `domain.operations` at one layer with no
`shared/` peer beneath it. so option A prescribes a surface the repo's own rules forbid us to
build.

⇒ and `rule.prefer.most-common-denominator` is the positive statement of B: an operation lifts to
the common ancestor **on proven reuse**, and both of these have two peer consumers today. the
lift already happened; the import is what a lift is for.

## .rework, and why

**clean.** were B refuted, the repair is a rename plus a new module home — the extant call sites
change an import path and naught else. no caller hardened against the current shape.

## .confidence, and why it is not higher

**93%.** the four measurements are each verifiable and none is contested. the 7% is the one
question I cannot settle from inside this behavior: **whether the repo INTENDS the 27 clusters to
become bounded contexts over time.** if that is the trajectory, the reviewer is early rather than
wrong, and the right answer is a scheduled decomposition rather than a per-import argument.

⇒ that is a question for the architect and the wisher, not for this stone. the dispute stands on
what the repo IS today, which is what a reviewer grades.

## .where

- `src/domain.operations/boot/genBootPayload.ts:19-22` — the three `role/*` imports
- `src/domain.operations/boot/calcBootPayloadTokens.ts` — the `calcBrainTokens` import
- `src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts` — the hook-sync kernel import
- `src/contract/sdk.ts:16`, `src/contract/sdk.brains.ts:52` — the published surface
- `F19` — the peer fork on whether to share that kernel at all

## .the verdict, once ruled

🔴 **UNRULED, and that is the DESIGN rather than a drop.** `open` here means *open to the
council's reversal*, never *nobody decided* — every fulcrum in this set closes on the same
line, the ANSWERED ones included (`F23`, `F21`, `F24`). the take is **B**, it is live in the
code, and it is carried to the council by the `--as disputed --why` on r005 b1/b2, which is
the one mechanism that makes a dispute outlive the round that made it
(`rule.always.absorb-every-concern`).

⚠️ **a reviewer read this line and concluded the row had been dropped** (i008 `r010` §1:
*"never formally ruled — it's still open, not resolved"*). the read is wrong and the line
earned it — `(open; …)` states the status in a word that carries two senses, which is the
defect `rule.forbid.ambiguous-labels` names. ⇒ the convention is now declared once, in the
inventory's own summary, rather than left for each reader to infer from 28 files.

🔴 **what the reviewer is RIGHT about is the risk, and it is answered by the route rather than
by this file:** the fulcrum council is a terminal stone, so a `DISPUTED` row cannot ride in
implicitly — it is read aloud, with its take and its confidence, before the behavior closes.
a reviewer cannot see that stone list, which is why the ask reads as unmet from outside.

⇒ the go/no-go this row owes the council, stated so it needs no re-derivation:

| the question | what it turns on |
|---|---|
| **do the 27 peer clusters become bounded contexts over time?** | if yes, the reviewer is EARLY rather than wrong, and the repair is a scheduled decomposition — never a per-import argument in this diff |
| if no | B stands, and the extant `origin/main` precedent (3 PRs) stands with it |

## 🔴 .option C — the LIFT, recorded `i017` from `enroll-impl-arch-defects` r11 §2

the fork above is stated as a pair — **A** extract a new module, **B** the import is sanctioned —
and r11 supplies a third arm that is better specified than A, because it dodges A's one fatal
objection.

> **lift `role/briefs/*` to a common ancestor both `boot/` and `role/` may import**, rather than
> extract a new module beneath either.

| | A — extract a module | 🔴 **C — lift to the common ancestor** |
|---|---|---|
| what it needs | a `shared/` peer under `domain.operations` | **no new surface at all** — the cluster moves up one level |
| what the repo's rules say | 🔴 `rule.require.directional-deps` declares no such peer, and `rule.forbid.barrel-exports` forbids the re-export A would lean on | ✅ `rule.prefer.most-common-denominator` **prescribes exactly this** on proven reuse |
| so objection 4 above | refutes it | 🔴 **does not touch it** |

⇒ **objection 4 was the strongest argument against the reviewer's ask, and C survives it.** that is
why the arm is recorded rather than argued down here: to defeat A and declare the fork settled would
be to win against the weaker of the two repairs the reviewer could have meant.

🟡 **it does not flip the take, and the reason is unchanged.** B and C differ on *where the code
lives*, never on whether the import is legitimate — and the question this row reserves is the second
one. ⇒ a council that rules **"a noun cluster IS a bounded context"** should take C rather than A; a
council that rules the other way leaves B intact, and C becomes a tidiness call for a later round.

🔴 **and one procedural point from r11 is adopted outright: a clean lane is not a verdict.** i016's
`arch-smell-scopeleaks` returned clean, and that reflects *no NEW leak* rather than a settlement of
the disputed one. this row is **not** cited as closed by that green.
