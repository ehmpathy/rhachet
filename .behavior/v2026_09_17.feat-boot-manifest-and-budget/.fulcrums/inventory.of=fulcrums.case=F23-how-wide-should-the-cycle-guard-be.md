# fulcrum F23 — how WIDE should the cycle guard be?

- raised  = `5.1.execution`, by my own unit tier going red
- rework  = clean
- status  = ANSWERED
- confidence = 🔴 **96%**

## .the fork, stated fairly

`getAllFilesFromDir` follows symlinks and had no cycle guard, so a self-referential link crashed
the walk with `ELOOP`. a guard was owed. **how much should it catch?**

| option | the key | what it terminates | what else it changes |
|---|---|---|---|
| **A — ever-visited** | every dir the walk has touched | the cycle ✅ | 🔴 **a dag too** — one dir reached by two routes emits once, not twice |
| **B — ancestor chain** | the dirs on the current descent | the cycle ✅ | 🔴 **naught** |

## .taken, and why at the time

**B**, and it is close to forced rather than judged:

**1. a prior behavior already pinned the answer, and A broke it.** I shipped A, and the unit tier
went red on a clamp I had not written:

```ts
// src/infra/filesystem/getAllFilesFromDir.test.ts:126-129
then('traverses symlinked directory', () => {
  const result = getAllFilesFromDir(resolve(testDir, 'symlink-dir'));
  expect(result).toHaveLength(2);        // received 1
});
```

⇒ `rule.require.review-test-changes` is explicit: *"never degrade prior behavior blindly."* to keep
A is to re-decide another behavior's contract with no owner present.

**2. a cycle IS an ancestor revisit — that is its definition.** a dag is two routes to one dir with
no loop, and it terminates on its own. so A catches the defect **plus** a non-defect; B catches the
defect exactly.

**3. the extra catch was never asked for.** the wish is a manifest flag and a budget key. the
`ELOOP` crash was found mid-build and is in scope as a blocker on the walk this feature drives; the
dag double-count is neither a crash nor a budget error.

**4. 🔴 and my own justification for A does not survive a check.** `[case3]`'s first draft argued
*"a payload that counted one file twice would bill an author twice for it."* **false** —
`calcBootPayloadTokens` counts the exact emitted string, so a doubled file is a doubled cost and the
gate reports it honestly. **the one argument I had for the wider guard was wrong on the mechanism.**

## .rework, and why

**clean.** the two guards differ by one line, in one function, and the boundary is clamped from both
sides now — `[case1]`/`[case2]` forbid a narrower guard, `[case3]` forbids a wider one. to take A
later is to flip a line and re-bless two clamps.

## .confidence, and why it is not higher

**96%.** measurements 1 and 2 each settle it alone, and 4 removes the only case for the alternative.
the 4% is that **B is the narrower repair, not the more correct render** — a reader served one brief
under two paths is arguably served badly, and nobody has decided that. ⇒ the decision is caught as a
dream rather than made here, which is what keeps the 4% honest instead of buried.

## 🔴 .what a peer reviewer added to that 4% — the budget ESCALATES the dag duplicate

raised at `5.1.execution` `review.peer r010` §4. it sharpens the residual above rather than reopens
the fork: a dag duplicate was a **render** oddity before this behavior; with a budget declared, the
same duplicate is **twice the tokens against a cap that halts**, and no remedy in the ladder names
the cause.

⇒ the reviewer is right, and the verdict does not move. the split, claim by claim:

| the claim | verdict |
|---|---|
| the gate is honest — it counts the exact emitted string | ✅ stands. measurement 4 above is what established it |
| a duplicate now costs the author a **halt** rather than a wasted line | ✅ **new, and true.** the budget is what raises the stakes |
| the halt offers **no diagnostic** for the cause | ✅ **true, and it is `F13` by design** — the halt names THAT some must go, never WHICH. a per-cause hint is a per-resource hint under a different name |
| ⇒ so the guard should have been **A** | 🔴 **does not follow.** A repairs the duplicate by degradation of a prior behavior's named clamp, with no owner present — measurement 1, unchanged |

🔴 **what the escalation buys is a PRIORITY on the dream, never a different answer here.** the
dream's own open question — *does any `.agent/` tree in the wild carry an aliased dir?* — is worth
more than it was: before the budget a `yes` cost a duplicated line, and after it a `yes` costs a halt
the author cannot diagnose. ⇒ recorded on the dream, which is the artifact that carries the work.

### 🔴 .and the escalation is now PINNED at the grain where it bites

the sentence above is understated on its own: the reviewer's point was recorded, and a record is not
a clamp. the residual carries one too, added the same round —
`src/domain.operations/boot/genBootPayload.integration.test.ts` `[case3]`.

| the grain | what holds it |
|---|---|
| the **walk** — a dag yields two paths | `getAllFilesFromDir.integration.test.ts` `[case3]` (extant) |
| 🔴 the **budget** — those two survive into the payload the gate measures | `genBootPayload.integration.test.ts` `[case3]` (new) |

it pins three facts: the stats bill `files = 2` for the one file on disk; the body carries that
content **twice**, so the tokens really do double; and both labels — `shared/once.md` and
`alias/once.md` — are addressable, so the render is redundant rather than wrong.

🔴 **proven to bite by revert**: with the guard flipped to A (`ancestors.add(dirReal)` in place of
`new Set(ancestors).add(dirReal)`), all three assertions go red. the fix restored, all three green.

⇒ so what changes in the 4% is its **failure mode**, never its size. an unpinned deferral drifts in
either direction unnoticed; this one goes red the day the dream is taken and the guard widens —
which is `rule.require.clamp-edge-cases` applied to a deferral rather than to a fix.

### ✅ .and the day came in the same stone — `r010` §4 is now CLOSED by repair, not by record

> **the 4% above is discharged. the guard's verdict does NOT move.**

the section above says the residual *"goes red the day the dream is taken and the guard widens."* the
clamp fired exactly so — and the repair that turned it red **widened no guard**.

🔴 **the fork this fulcrum states is posed at ONE grain, and that is what hid the answer.** options A
and B are both *"which key does `getAllFilesFromDir` use?"*, so every argument above weighs a change
to the walk's contract against its five callers. a third seam sits below the walk and above the
payload, and the fork's own table has no row for it:

| grain | the question | a dag duplicate is | who owns it |
|---|---|---|---|
| the walk | *"what is reachable?"* | ✅ correct — two routes exist | `getAllFilesFromDir`, 5 callers |
| 🔴 **between** | — | 🔴 the seam taken | `getAllFilesOncePerRealPath`, 1 caller |
| the payload | *"what does the reader receive?"* | waste — one file, learned once | `genBootPayload` |

⇒ so **B stands, untouched**, and measurement 1 is honored rather than overruled: the owner of
`traverses symlinked directory` is asked to re-decide none of it, and the walk's four other callers
are unmoved.

**what flipped, and what did not:**

| the claim | now |
|---|---|
| the guard is **B**, ancestor-scoped | ✅ **unchanged** |
| `getAllFilesFromDir.integration.test.ts` `[case3]` — a dag yields 2 paths | ✅ **unchanged, still green** |
| `genBootPayload.integration.test.ts` `[case3]` — the payload bills 2 | 🔴 **flipped to 1**, by design — it was authored as the flip-trigger and it triggered |
| a duplicate costs the author a halt they cannot diagnose | ✅ **closed.** the duplicate no longer reaches the gate |
| `F13`'s no-per-resource rule leaves the cause unnameable | ✅ **moot** — no cause is left to name |

🔴 **and the deferral's own SAFE/CLEAN test was answered at the wrong grain, which is the lesson
worth more than the fix.** the dream graded both `no`, correctly, for a change to the walk. graded
against the seam actually taken, both are `yes` — one new operation, one call site, and the only test
it flips is the one this behavior authored to flip. ⇒ **a `no` on SAFE/CLEAN is a verdict on a
PROPOSED SHAPE, never on the repair itself**; a second shape can flip both, and neither answer is
weakened.

🟡 what is left open is genuinely the walk grain, for the four callers that are not `genBootPayload` —
recorded on the dream rather than here, since it is another behavior's call.

## .where

- `src/infra/filesystem/getAllFilesFromDir.ts` — the ancestor-scoped guard
- `src/infra/filesystem/getAllFilesFromDir.integration.test.ts` `[case1]`–`[case3]` — the clamps
- `src/domain.operations/boot/genBootPayload.integration.test.ts` `[case3]` — 🔴 the same boundary
  at the PAYLOAD grain, and now the clamp that holds the repair
- 🔴 `src/domain.operations/boot/getAllFilesOncePerRealPath.ts` — the seam between the two grains
- `src/infra/filesystem/getAllFilesFromDir.test.ts:126-129` — the prior clamp that refuted A
- `.dream/2026_09_18.a-dag-under-agent-yields-one-file-twice.dream.md` — the decision, boot half
  taken and walk half still open
- `F20` — the peer row, on the deferral of the wider infra-walk repair

## .the verdict, once ruled

— (open; taken as B for this stone. 🔴 **the residual it deferred is CLOSED by repair at a third
grain** — `getAllFilesOncePerRealPath` — with B and every walk-grain clamp untouched)
