# F28 — one vanish contract, or an opt-in per caller?

- **rework** = 🟡 **clean** — the opt-in is an added optional param with a default; either
  direction is one signature edit and no caller change
- **status** = ANSWERED, **A taken** — one contract, argued rather than defaulted
- **confidence** = 🔴 **94%**, and the 6% is named below
- **where** = `src/infra/filesystem/getAllFilesFromDir.ts` · its 6 production callers
- **raised** = 2026-09-20, at `5.1.execution` peer `i008` `r011` nitpick.2
  (`enroll-impl-arch-defects`)

---

## .the fork

`F20`'s repair `2d` gave the walk a THROW on a mid-walk vanish. that repair was argued for
**one** caller — `genBootPayload`, the budget gate's denominator — and it landed on a shared
infra operation with **six**.

```
src/infra/filesystem/getAllFilesFromDir.ts
  ├─ genBootPayload.ts                    🔴 mine — the repair was argued for this one
  ├─ getRoleFileCosts.ts   (via `getAllFiles`)   `roles cost`
  ├─ findNonExecutableShellSkills.ts             a registry guard
  ├─ assertRegistryHasNoOrphanBriefs.ts          a registry guard
  ├─ discoverInitExecutables.ts                  `run --init` discovery
  └─ discoverSkillExecutables.ts                 `run --skill` discovery
```

🔴 **the lane's catch is exact and was checked by no prior round**: the other five previously
got a silently-dropped file on a vanish and now get a thrown `ConstraintError`, with no
targeted test and no review that confirms they want it.

| option | what it costs |
|---|---|
| 🔴 **A** — **one contract**: the throw holds for every caller (taken) | the five gain a behavior nobody asked them about — argued below, never assumed |
| **B** — an opt-in `{ onVanish: 'throw' \| 'skip' }`, defaulted to `skip` | 🔴 **wrong.** it preserves the defect in five places under the name of compatibility |
| **C** — an opt-in defaulted to `throw` | a param with one call site that ever sets it, which is a flag with no second position |

---

## .taken, and why

🔴 **taken: A.** the vanish throw holds for all six, and the argument is that **the undercount
harm is not specific to the budget gate** — it is the same harm in every one of the five:

| caller | what a silently-skipped file becomes |
|---|---|
| `getRoleFileCosts` (`roles cost`) | 🔴 a **cost report that understates**. the identical defect the budget gate has, one command over |
| `findNonExecutableShellSkills` | a skill that **escapes the guard** — the check reports clean on a file it never read |
| `assertRegistryHasNoOrphanBriefs` | an orphan brief that **escapes the guard**, same shape |
| `discoverInitExecutables` | an init that **silently does not exist** — `run --init x` reports "not found" for a file on disk |
| `discoverSkillExecutables` | a skill that **silently does not exist**, same shape |

⇒ **in all five the skip is the worse answer, and in two of them it is a guard that passes with
no read.** so B does not protect the five; it leaves each of them with a quiet wrong answer that
a re-run would have fixed.

🔴 **and B is a backwards-compatibility shim, which the repo forbids on its own terms.**
`rule.prefer.fewer-paths-via-idempotency` asks whether a branch can be removed rather than
kept; `rule.forbid.unexpected-defaults` asks whether a default is the one a caller would
choose. a `skip` default answers no to both — it adds a code path **and** defaults it to the
behavior this round argued is a defect.

🟡 **C is the honest version of B and is still rejected**: a parameter whose second position no
call site ever passes is a flag with one value, and the next reader must go find out whether
the other position is dead or merely unused.

⇒ **the real disagreement is not about the five callers at all** — it is about whether a
mid-walk vanish is an ERROR or a NORMAL STATE. `F20` `2d` settled that it is an error, with a
measurement: every peer reader on this path already refuses it (`readOneBootSpecFile`,
`readOneSayResource`, `calc.tokens`). **the walk was the one silence.** a per-caller opt-in
would re-open a question the repo has otherwise answered uniformly.

---

## 🔴 .what the lane is RIGHT about, and what the take owes because of it

the lane asks for a test or a review that confirms the five want the throw. the verdict above
answers the **review** half and leaves the **test** half honest:

| the lane asked for | status |
|---|---|
| a review that settles whether the five want it | ✅ **this row.** the table above is that review, and it is on the record rather than in a diff |
| an explicit dream/fulcrum for the blast radius | ✅ **this row** — the lane's own second branch |
| a targeted test per caller | 🔴 **NOT taken.** argued below |

🟡 **five per-caller tests would assert one contract five times.** the contract is the walk's,
and it is clamped where it lives — `getAllFilesFromDir.integration.test.ts` `[case5]`, which
drives a stale link and a vanish side by side and asserts the walk parts them. a copy of that
assertion inside `discoverSkillExecutables.test.ts` grades the walk through a caller that adds
naught to the question (`rule.require.a-cue-is-not-a-claim` — the contract is a CLAIM, declared
once and cited thereafter).

⇒ what IS owed, and is taken: the walk's docblock now **names the six callers and the harm each
avoids**, so the next reader who finds the throw does not have to re-derive why it is uniform.

---

## 🔴 .the residual 6% — a vanish is rarer than a stale link, and the five see more of both

the five callers walk **linked-role trees**, where a stale symlink is routine. `2d` parts a
stale link from a vanish exactly (`lstatSync`), so a stale link still skips — that is the whole
point of the arity repair, and it is what makes A safe for the five.

⚠️ **what the take cannot promise** is the frequency of a real vanish in those trees. a
`pnpm install` that relinks mid-walk is the named window, and `discoverSkillExecutables` runs on
every `rhx run` — the highest-traffic caller of the six. so if the race is more common than
measured, the five feel it first and the symptom is a `ConstraintError` on a command that used
to work.

🟡 **that residual is bounded by the error itself**, which is why it is 6% rather than 20%: the
throw carries `fix: 're-run — a settled tree walks cleanly'`, so the worst case is one retry
with a message that names the retry. the alternative's worst case is a wrong answer with no
message at all.

---

## .what would flip it

a **report of a `ConstraintError` from a settled tree** — that is, a vanish throw with no
concurrent install — would mean the arity repair is short an arm again, and the answer would be
a third `lstat` case rather than an opt-in.

🟡 what would NOT flip it: a caller that finds the throw inconvenient. inconvenience is the
argument `B` rests on, and it is the one the five callers' table above refuses.

---

## .the clamps

**A** — `src/infra/filesystem/getAllFilesFromDir.integration.test.ts` `[case5]`: a stale link at
the top level and a second one a level down, beside a real file. three `then`s — the walk does
**not** throw, the real file is **still** yielded, and **no** stale link enters the list.

⚠️ **the clamp is of the arm's WIDTH, and that bound is stated rather than left to infer.** the
vanish arm has no deterministic drive — the window between a parent's `readdirSync` and a
child's `statSync` belongs to the kernel, and a mock is forbidden at this tier
(`rule.forbid.integration.mocks`). so `[case5]` clamps that a **stale link still skips**, which
is the half a too-eager repair breaks and the half all five callers actually depend on.

🟡 **the five callers' own suites are the second net.** `getRoleFileCosts.test.ts`,
`discoverSkillExecutables`, and the two registry guards each walk a real tree — so a repair that
broke the stale-link skip would redden them, and they ran green at `i008`.

---

## .see also

- `inventory.of=fulcrums.case=F20-defer-the-infra-walk-repair.md` — where repair `2d` was argued
- `rule.require.a-cue-is-not-a-claim` (librarian) — why the contract is clamped once, not per caller
- `rule.forbid.unexpected-defaults` (mechanic) — why a `skip` default is the wrong default
- `rule.prefer.fewer-paths-via-idempotency` (architect) — why the opt-in is a path to remove
- `.dream/2026_09_20.readdirsync-after-existssync-is-unguarded-at-twenty-sites.dream.md` — the
  adjacent pattern, and 🟡 **not this one**: that dream is about an unguarded `readdirSync`
  after an `existsSync`, never about the vanish contract's blast radius
