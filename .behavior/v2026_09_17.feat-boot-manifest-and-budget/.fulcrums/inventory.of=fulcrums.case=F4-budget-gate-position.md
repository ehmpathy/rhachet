# F4 — where the budget gate sits

**rework: clean · status: 🔴 REFUTED then RE-DECIDED by the wisher · confidence: 99%**

---

## 🔴 .the refutation — the fork was posed one level too low

**the whole table below asks *"which LINE of the render path?"* — and that question presupposes the
render path is the gate.** the wisher named a different process entirely:

> the repo manifest introspect should fail; the role packages run a compile / manifest / introspect
> operation already in their build flow. that is where the budget hooks in.

⇒ and the pavement was already there. `invokeRepoIntrospect.ts:82-92` is **four `assertRegistry*`
guards in a row**, each documented *"fail fast at repo introspect"*:

```ts
assertRegistrySkillsExecutable({ registry });   // :83
assertRegistryBootHooksDeclared({ registry });  // :86
assertRegistryHooksNoNpx({ registry });         // :89
assertRegistryHasNoOrphanBriefs({ registry });  // :92
```

**the budget gate is a fifth peer at line 93.** no new mechanism, no new failure surface, no new
error shape — `ConstraintError`, already the family's verdict.

🔴 **this is `rule.always.reuse-pavement-before-improvise`, failed.** i wrote 96% confidence about a
gate position while a four-member guard family sat in `src/domain.operations/manifest/` for
precisely this job. i never looked, because the fork i had posed did not admit the answer.

### .why introspect is the right process — measured

| | boot time (the guess below) | **introspect time** (the wisher's) |
|---|---|---|
| runs where | any consumer repo | 🔴 **only** inside `rhachet-roles-*` — a hard `ConstraintError` at `:55-59` |
| the spec it reads | `.agent/repo=*/role=*/boot.yml` | `src/domain.roles/*/boot.yml`, via `role.boot.uri` relative to `packageRoot` (`castIntoRoleRegistryManifest.ts:117-119`) |
| **is that spec writable?** | 🔴 **no — 13 of 15 are symlinks into a version-pinned pnpm store** | ✅ **yes — git-tracked regular files.** measured: 3 of 3 in `rhachet-roles-ehmpathy` |
| is the author present? | no | ✅ **yes — it is their own `npm run build`** |
| when does it fire? | every consumer session, forever | ✅ **once, pre-publish** (`prepublish` → `build` → `build:complete` → `repo introspect`) |

⇒ **git cannot track a symlink-into-`node_modules`, so the introspect-time spec is writable by
construction.** the ownership problem that generated `F10` and requirement 8 **cannot arise at this
gate.**

### 🔴 .and it makes the vision's own aha-line literally true

the day-in-the-life claims *"the trim happened at authorship, in the author's own hands, in under a
minute."* at a **boot-time** gate that sentence is aspirational — the halted party is a consumer,
the author is absent, and for 13/15 specs the named file is unwritable. **at introspect it is a
plain description of the mechanism.** the wisher quoted my own line back at me, and the line was the
tell.

### .what it does to the two rungs

the wisher's two instructions compose rather than compete:

| gate | the spec there | the rung |
|---|---|---|
| **introspect** — pre-publish, in the author's own repo | ours, writable, author present | 🔴 **halt.** every remedy is actionable |
| **boot** — in a consumer repo | 13/15 foreign and unwritable | 🟡 **warn.** say it, proceed |

⇒ requirement 8's symlink test survives, **but it is demoted**: it no longer computes a default at
the primary gate, it *describes why the backstop gate warns*. and requirement 2's *"spend naught"*
becomes trivially true at introspect — there is no payload to spend, because no boot occurs.

---

<details>
<summary>🟡 the superseded guess — kept because a refuted axis must not read as a forgotten one</summary>

## .the fork, stated fairly

`bootRoleResources.ts` computes the char total at lines 127-146, then prints from line 189. the
gate could sit:

| position | consequence |
|---|---|
| **after the count, before the first print** (line ~147) | the halt emits no payload. requirement 2 satisfied |
| after the first `printStats()` (line ~190) | `<stats>` is already on stdout when the halt fires — a partial payload |
| in the cli layer, before `bootRoleResources` is called | the cli would have to re-derive the payload to count it. a second render path |

**none of the three is the introspect operation.** that omission is the defect, not the choice among them.

---

## .the guess taken, and why

**line ~147 — immediately after `totalChars` is computed, before any `console.log`.**

| the argument | |
|---|---|
| a boot's stdout **is** the context injection | so to emit any of it is to pay for it. a halt that has already printed has already spent |
| the count is **already there** | lines 127-146 compute `totalChars` with no output emitted. the gate is a free insertion |
| it keeps one render path | the cli layer stays thin; no duplicate traversal |

⇒ **requirement 2 is not merely "be loud" — it is "spend naught".** that turns a stylistic choice
into a positional constraint, and the constraint is cheap to honor.

---

## .the confidence — 96%

the highest-confidence fulcrum in the set. the only doubt: whether the **token** count (not the
char count) needs a per-resource breakdown for the halt's "3 heaviest" list (`case=2`), which
would need a per-file loop the extant code does not do — it sums into one `totalChars`
(lines 136-140).

⇒ that is a small extension of the same loop, not a re-architecture. it stays clean.

### 🔴 .the doubt above cites a feature nobody decided to build — found at `review.self r4`

the *"3 heaviest"* list is **not in the wish.** it is the vision's own invention, and until `r4` it
carried no fulcrum row — so this 96% guess names, as a design constraint, a feature that had never
been put to a reviewer.

⇒ **that is the cost of an un-itemized call: it becomes a premise.** the list is now `F13`, at 70%,
and if the council drops it, the per-resource loop above is no longer owed.

🟡 **the 96% still holds, and the reason is that the dependency runs one way.** the gate's
**position** follows from requirement 2 alone (*"spend naught"* ⇒ before the first `console.log`).
the breakdown decides only *what the gate computes at that position*, never *where it sits*. ⇒
`F13` can go either way without a move.

### ✅ .and it went — the doubt is DISCHARGED, 2026-09-18

the wisher struck the *"3 heaviest"* block outright (`F13`). so **the per-resource loop is not
owed**, and the one stated doubt behind the 96% is gone:

| | before | now |
|---|---|---|
| what the gate must compute | a total **and** a per-resource breakdown | 🔴 **a total alone** |
| the extant loop | needed a per-file extension | ✅ **sums into one `totalChars` already** (lines 136-140) |

⇒ 🔴 **the re-decision and the refutation pull the same way.** at gate 1 the count is precomputed
into `rhachet.repo.yml` anyway, and a scalar is far cheaper to precompute than a ranked list. **the
two wisher corrections, made independently, simplify the same mechanism.**

---

## .the rework cost — why clean

one insertion point in one operation. no contract, no persisted value, no consumer.

</details>

---

## .the confidence — 99%

the wisher named the process directly, and the pavement is four peers deep with a documented
`.why` that states this exact job. the residual 1% is not the gate's home but its **reach**:
whether the boot-time warn rung is built in this behavior or deferred, which is a scope call for
the council rather than a design doubt.

---

## .the rework cost — still clean, and cheaper than the guess

a fifth `assertRegistry*` call at `invokeRepoIntrospect.ts:93`, plus one operation beside its four
peers. **cheaper than the refuted guess**, since it needs no change to the render path at all.

---

## .where

| the gate | the file |
|---|---|
| 🔴 **the halt** | `src/contract/cli/invokeRepoIntrospect.ts:93` — the fifth guard |
| the guard itself | `src/domain.operations/manifest/assertRegistryWithinBudget.ts` — beside its four peers |
| the spec it reads | `castIntoRoleRegistryManifest.ts:117-119` — `role.boot.uri`, relative to `packageRoot` |
| 🟡 the boot-time warn | `src/domain.operations/invoke/bootRoleResources.ts:~147` — the refuted position, re-purposed as the backstop rung |

## .the verdict

**re-decided by the wisher 2026-09-18: the gate is the introspect operation.** the render-path
position is demoted to the warn rung. the fork among the three render-path lines is moot.

⇒ what remains open for the council: whether the warn rung ships in this behavior (`F4′`, folded
into requirement 8's scope) or is deferred.
