# F29 — migrate `roles cost` to the real counter, or defer it?

- **rework** = 🔴 **dirty** — the migration changes every number a second command prints, so a
  reversal re-opens `invokeRolesCost.ts`, `formatCostTree.test.ts`, and that command's acceptance
  tier. 🟡 the grade follows the **reversal**: to defer is one dream, and to un-defer later is a
  contract change with a release note
- **status** = 🔴 **REVERSED** — B taken at `i010`; **A landed** later in the same stone, so the
  deferral no longer holds. the fork and its argument are kept below as the record of the call;
  `.the reversal` at the foot is what is true now
- **confidence** = **88%** at the time of the call, and the 12% is named below — 🔴 **the 12% is
  what came due**
- **where** = `src/domain.operations/role/getRoleFileCosts.ts:81` · `src/contract/cli/invokeRolesCost.ts`
- **raised** = 2026-09-21, at `5.1.execution` `review.peer i010 r010` (`enroll-impl-behavior-intent` §2)

---

## .the fork

requirement 7 replaced the boot's `chars / 4` with a real tokenizer, because the number came to
**carry weight** — it refuses a boot. `roles cost` was not migrated, so the repo now ships two
token counts over the same files by two methods, and the refuted one renders a **ranked tree**.

| option | what it costs |
|---|---|
| **A** — migrate `roles cost` too | one counter, repo-wide. and it changes every number that command prints, re-opens a command this behavior never touched, and needs its own disclosure + snapshot round |
| 🔴 **B** — dream it, and correct the record here (taken) | the two counters coexist, recorded, with the rank hazard named |
| **C** — add the disclosure line only, skip the migration | 🟡 **the middle that reads as caution, and it is the weakest**: it opens the same file A does, so it pays A's CLEAN cost and buys a label rather than a fix |

---

## .taken, and why

🔴 **taken: B.** the SAFE/CLEAN test (`rule.always.fix-forward-under-scouts-honor`):

| half | SAFE? | CLEAN? | verdict |
|---|---|---|---|
| the **boot** gate's counter | ✅ | ✅ | 🔴 **done this round** — requirement 7 |
| the **`roles cost`** counter | 🟡 a silent step change in a number a reader may track across releases | 🔴 **no.** `invokeRolesCost.ts` is a command this diff never opened, and its render is a caller-visible contract | dream it |

🟡 **option C is the one that most needs an argument against it, because it reads as the cautious
middle.** it opens `invokeRolesCost.ts` exactly as A does — so it fails CLEAN on identical grounds
— and what it ships is a label on a number that stays wrong. ⇒ **a disclosure is the right
companion to a migration and a poor substitute for one.**

---

## 🔴 .the raise's stated mechanism does NOT survive, and the fact beneath it does

r010 §2 framed the harm as *"the only diagnostic path a halt leaves you"* and *"the halt's
recommended trim-target discovery path"*. measured:

```
rhx grepsafe --pattern 'roles cost' --path src/domain.operations/boot   → 1 line
```

and that one line is a `genBootPayload.ts` docblock about a record the payload **declines** to
repeat. **the halt recommends no path at all** — its whole vocabulary is four strategy verbs, and
it names no tool, no command, and no file. that is `F13` as built.

⇒ so the estimator corrupts no advice the halt gives. **it is a latent hazard in `roles cost`
itself**, reachable by an author who goes to look — which is why the dream is filed against that
command rather than against the halt.

🟡 **and the fact beneath it is sharper than the raise put it.** an aggregate understatement is
uniform and harmless to an order; a **per-file** error is not. the measured spread is 2.96 → 4.75
chars/token, so two files of equal true cost can differ ~60% in the estimate — enough to **invert
their rank** in the tree. the raise argued the number is low; the defect is that the **order** can
be wrong.

---

## 🔴 .why it is a dream and not a citation of `F17`

`F17` is `ANSWERED` and names this gap in its own words. **that status reads identically whether
the work landed or never began** — which is exactly how `F9` shipped `status: ANSWERED` over a
`src/` that carried no warn at all, caught in this same round at `i010`.

⇒ **a fulcrum records a DECISION; it does not carry it out.** so the deferral earns an artifact a
later reader can act on, and `.dream/` is where deferred work lives.

---

## .what would flip it

- the halt, or any boot surface, gains a line that **names** `roles cost` — then the estimator sits
  in the halt's recommended path for real, and the raise's original mechanism becomes true
- a second command adopts the real counter — then `roles cost` is the last holdout rather than one
  of two, and the inconsistency argument outweighs the blast radius
- a reported defect where a reader trimmed the wrong file off a `roles cost` rank — that makes it
  `urgent` rather than `better`, because it names a shipped harm

---

## .the clamps

**the boot counter** — `calcBootPayloadTokens.test.ts`, three clamps: a real count, an undercount
proof against `chars / 4`, and a density bound. ⚠️ that last one was written `< 4.0`, reverted
against, and **stayed green** — `chars / ceil(chars / 4)` is ~3.97, just under 4.0 from the
round-up. tightened to `3.8`, which is what makes it bite.

**`roles cost`** — none at the time of the call, and that was the deferral stated plainly. 🔴 **it
now routes through the same counter as the gate**; see `.the reversal` below.

---

## 🔴 .the reversal — and the row carried its own failure mode, in the other direction

**A landed.** `src/contract/cli/invokeRolesCost.ts:166-167` constructs `getOneBrainTokenCounter` and
calls `calcBootPayloadTokens` — the gate's own counter, over the gate's own render. the two estimators
this row deferred are now one, and `getRoleFileCosts.ts` / `formatCostTree.ts` are deleted.

🔴 **what makes this row worth a second read is that it held the caution and still drifted.** its
`.see also` says, of `F9`: *"the row that proves an `ANSWERED` status is not evidence the work
landed."* ⇒ **the same status is not evidence the work was SKIPPED either, and that direction went
unnamed until a reviewer read the code.**

| the drift | what a reader concludes | caught by |
|---|---|---|
| `F9` — status `ANSWERED`, work never began | the feature ships | a review round, `i010` |
| 🔴 `F29` — status `ANSWERED — B taken`, work landed anyway | the migration is still owed | a review round, `i017` |

⇒ **a status field is a claim about the world, so it decays in both directions**, and only a read of
the code settles which way. the acknowledgment DID land here at the time — buried in `.see also`,
where a reader who consults the header never reaches it. **a correction that does not reach the field
a reader meets first is a correction that did not land.**

🟡 **the general shape is `rule.require.a-cue-is-not-a-claim`, applied to a fulcrum's own header.** the
status is the claim; the body is the argument. an update to the argument that leaves the claim intact
is exactly the drift that rule forbids, one artifact up from the prose it usually governs.

---

## .see also

- 🟡 its dream — `2026_09_21.roles-cost-ranks-by-an-estimator-…` — was **pruned once the migration
  landed**, so this row is the record that outlived it. `src/contract/cli/invokeRolesCost.ts` routes
  through `getOneBrainTokenCounter`, which is the same counter the gate uses
- `F17` — the fulcrum that named this and did not close it
- `F9` — the row that proves an `ANSWERED` status is not evidence the work landed
- `F13` — why the halt names no resource, and therefore no discovery path
- `src/infra/filesystem/getAllFilesFromDir.ts:32` — the one extant in-code note of the same fact
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test, run per half
- `rule.always.catch-dreams-for-followups` (driver) — why a dirt deferral owes both artifacts
