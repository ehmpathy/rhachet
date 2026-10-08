# F44 — repair the eighteen foreign skips now, or defer them

- **rework** = `clean`
- **status** = 🔴 **REVISED TWICE** — at `review.self r2` the six keyrack failhides were **REPAIRED**; at `review.self r3` the deferred set's **stated cause was refuted by measurement**
- **confidence** = 🔴 **93% → 60% → 80%** (the *verdict* survived both revisions; the *reason* given for it did not)
- **raised at** = `5.3.verification`, the zero-skips scan

---

## 🔴 .revision 2 — the ask offered a remedy that closes NOT ONE site

**measured 2026-09-24**, after the human installed `age` and the tier re-ran clean.

this fulcrum's ask reads *"accept the deferral, **or supply the paid API keys**."* 🔴 **the second
half is not a remedy at all**, and three measurements say so:

| # | the measurement | what it refutes |
|---|---|---|
| 1 | `genActor.brain.caseAskable.integration.test.ts:17-20` fail-fasts at **module scope** on absent `XAI_API_KEY` / `OPENAI_API_KEY`. the suite **ran**, and its real brain call passed — `✓ returns creative prose … (4655 ms)` | 🔴 **the keys are already present.** keyrack supplies them; the tier unlocks `ehmpath/test` on every run |
| 2 | every deferred site is a **hard** `when.skip(…)` / `given.skip(…)` — a literal token in the source, never a conditional | 🔴 **a hard skip does not consult a credential.** it would skip identically with every key in the world on the env |
| 3 | `src/contract/cli/invokeAct.integration.test.ts:201` skips for a wholly different mechanism — `process.chdir(testAssetDir)` at `:209`, a cwd mutation that leaks into every other suite sharing that jest worker | the set is **not homogeneous by cause**, for the third time |

⇒ **so the ask handed a human an act that would change naught.** the real remedy is an **edit to the
test files** — delete the `.skip` token — and it is that edit, never a credential, that the
SAFE/CLEAN test must grade.

### 🔴 what the verdict rests on now

**B still holds, and its ground is narrower and firmer than before:**

| the old ground | the ground that survives |
|---|---|
| *"they need a live key we do not hold"* | 🔴 **false** — we hold it |
| — | ✅ **cost**: to un-skip is to bill a real OpenAI call per site, per CI run, forever |
| — | ✅ **SAFE fails** on `invokeAct:201` for an unrelated reason — a `process.chdir` in a worker is a test-infra redesign, not a flag |
| — | ✅ **CLEAN fails** — 12 sites across 6 files, none in this diff, on subsystems this behavior never touched |

🟡 **the verdict is unchanged and the confidence RISES**, which is the honest direction: a verdict
that survives the refutation of its own stated reason is better supported than one that never had
its reason tested.

### 🔴 the COUNT is unchanged at 19 — and a first pass at this revision nearly shrank it

a first draft of this correction rewrote **19 → 12**, on the premise that the 12 brain skips were
the ones whose cause had been refuted. 🔴 **that would have dropped 7 real deferred sites** — the 2
openai and the 5 keyrack failhides — while it repaired a wrong cause.

⇒ **a correction that repairs a CAUSE must not silently narrow the SET.** the three populations,
held apart:

| population | count | the cause, verified |
|---|---|---|
| brain hard `.skip(` | **12** | 🔴 **not credentials.** cost per CI run + the `process.chdir` hazard |
| openai `runIf(!CI)` | **2** | runs locally (`4 passed, 0 skipped`); skips on CI to avoid the bill |
| keyrack integration failhides | **5** | an `op` binary present **or** absent on the worker's PATH |

🟡 **and this is the fourth appearance of this fulcrum's own lesson, from the other direction.** the
earlier three were censuses that under-counted because the partition was drawn on the searcher's
attention. this one nearly *over*-corrected — same root, opposite sign: **the set was treated as
homogeneous when it never was.**

### 🔴 the lesson — a fourth instance of the SAME mechanism, and this time it was MINE

this fulcrum already records three censuses mis-partitioned by a property of the searcher's
attention. **this is the fourth, and it is not a partition error — it is an inference error:**

> **I observed `skipped` on a set of brain tests and concluded `credential-gated`. the outcome was
> real; the mechanism was invented to explain it.**

⇒ that is `rule.forbid.mechanism-inferred-from-outcome` exactly, and it is the **second** incident of
that rule in this stone — the first was `sudo -n true` read as *"sudo is unusable"*. both share one
shape: **a true observation, plus a plausible cause that was never probed.**

🟡 **and the tell was available the whole time and cost one grep**: a credential gate reads
`runIf(hasKey)`; these read `.skip(`. the two are distinguishable by a literal token in the source,
and no measurement of the *outcome* can tell them apart.

---

## 🔴 .the revision — the SAFE answer was a SPECULATION, and a measurement refuted it

`review.self r2` (`has-zero-test-skips`) re-asked the SAFE question against the file rather than
against a guess, and the guess did not survive.

| the SAFE claim, below | what the file said |
|---|---|
| *"the six keyrack guards would start to exercise a `mock-op-cli` whose behavior may diverge from real `op`"* | 🔴 **the mock was ALREADY the file's own documented mechanism, at three other sites** — `:440`, `:458`, `:631`, and `:618` states outright *"creds-free via the mock op CLI on PATH"* |
| *"each of the 18 needs a credential"* | 🔴 **false for all six.** three need op **present** (the mock supplies it); three need op **ABSENT** (an op-free PATH supplies that). neither is a credential |

⇒ the six were repaired in-round. **result: `37 passed, 0 failed, 0 skipped`**, where before the
suite carried six `expect(true).toBe(true)` sites.

🔴 **and the repair surfaced three genuinely-untested assertions** — the first run after the guards
came out was `34 passed, 3 failed`. those three had never once executed on this host. that is the
whole cost of a failhide, made visible: a `.skip` at least reports itself, where
`expect(true).toBe(true)` reports as a **PASS** (`rule.forbid.failhide`).

### what the deferred set keeps — and it GREW from twelve to fourteen

the CLEAN half of the original answer holds for them, unrevised: they instantiate
`genBrainRepl({ slug: 'openai/codex' })`, so to un-skip is to make the **whole integration tier**
demand a live key and spend money per CI run. that is a real credential and a real cost, and it is
what parts them from the six.

🔴 **`review.self r2`'s re-scan added two more to that set, and they were absent from the original
eighteen entirely:**

| site | the form | why it was missed |
|---|---|---|
| `src/domain.operations/stitch/invokeImagineStitcher.integration.test.ts:22` | `given.runIf(!process.env.CI)` | not read as a gate — it carries no `.skip` token |
| `src/domain.operations/weave/enweaveOneStitcher.integration.test.ts:40` | same | same |

both call `getContextOpenAI()` and set a 3-minute timeout, so their **cause is identical to the
twelve** and their disposition follows it. ⇒ **this fulcrum now covers 14 deferred sites, not 12.**

🔴 **and their form is the sharpest in the repo**: `runIf(!process.env.CI)` skips **precisely on
CI** — it runs on a dev box and not on the machine the stone's mandate is about. every other gate
here either runs on CI (the perf ten, whose constant is `!!(CI || PERF)`) or skips everywhere (the
brain twelve). these two are the only inversion.

### 🔴 and FIVE more, in the integration twin of the file this fulcrum already repaired

`src/domain.operations/keyrack/adapters/vaults/1password/vaultAdapter1Password.integration.test.ts`
carries the identical failhide form the acceptance file did — **and it was invisible because the
failhide scan had been scoped to the one file the repair touched.**

| site | needs | why it is not repairable here |
|---|---|---|
| `:21` | an op-free PATH | — |
| `:75`, `:87`, `:114` | a mock `op` on PATH | 🔴 the acceptance repair's lever is **blackbox** infra, handed to a **subprocess** via `env`. this is an in-process `src/` test, so the same move needs a cross-boundary import or a mutation of the jest worker's `process.env.PATH` — which leaks into every other suite in that worker. **SAFE fails** |
| `:95` | a real 1Password **credential** | the original premise, and here it is actually true |

🟡 **one of its six WAS repairable and was repaired**: `:68` awaited `unlock()` then asserted
`expect(true).toBe(true)` — a tautology, never a gate. now `await expect(…).resolves.toBeUndefined()`,
the shape `[case3]` uses 15 lines above. `7 passed, 0 failed, 0 skipped`.

⇒ **this fulcrum now covers 14 deferred sites**: 12 brain + 2 openai.

🔴 **the 5 keyrack integration sites it once held are REPAIRED** (re-verified 2026-10-06, `5.3`
`review.self r2`): each case now constructs an op-free PATH or a mock `op` on PATH via `withPath()`,
which restores PATH in a `finally`, so the worker-leak objection no longer applies.
`rhx git.repo.test --what integration --scope 'path://vaultAdapter1Password.integration' --mode apply`
→ `7 passed, 0 failed, 0 skipped`.

### 🔴 the lesson the revision carries

**the two populations were fused under one fork because they shared a SYMPTOM (a skip) rather than
a CAUSE.** one needed a credential; the other needed a PATH entry that was already written, already
documented, and never reached. ⇒ a fork over a set is only as good as the set's homogeneity, and
this set was not homogeneous.

### 🔴 the lesson fired AGAIN, in the census that recorded it

the same `review.self r2` that split the six also re-counted the repo, and the re-count came back
**30** where the record said **22**. the 8 it had missed were not missed for want of care — the
regex had already matched them. they were missed because the tally was **partitioned by owner**:

| partition | result |
|---|---|
| by **owner** — *"this behavior's four"* vs *"the other eighteen"* | 22, with 8 sites outside both buckets |
| 🔴 by **CI behavior** | 30 = 10 run on CI · 14 skip · 6 report a false pass |

⇒ so the corrective this fulcrum carries is **not** *"scan more carefully."* it is:

> **choose the partition before you count, and choose it to be the property that decides the
> verdict.** a census sorted on any other property is both incomplete and mis-dispositioned — and it
> reads as thorough regardless, because every row in it is individually true.

🟡 **that is why the SAFE claim failed in the first place too.** *"does it need a credential?"* is
the property that decides the verdict; *"is it in my diff?"* is not. both errors are one error.

### 🔴 and a THIRD time, in the same pass

the failhide scan that found the integration twin's six had been run **scoped to one file** — the
file the repair was about. three instances now, one mechanism:

| the census was sorted by | it missed |
|---|---|
| **owner** — mine vs foreign | the 6 unrun perf sites, the 2 `runIf(!CI)` sites |
| **the scope I happened to run** — `path://roles.boot.performance` | the other 6 perf sites |
| 🔴 **the file I happened to repair** — the acceptance suite | the integration twin's 6 |

⇒ each partition was a **property of my own attention**, never a property of the defect. the defect's
own property is *"what does CI do with it, and what would it take to change that"*, and every site
sorts cleanly under it — the one that turned out repairable among them (`:68`, which needed naught).

🔴 **so the rule generalizes past skips:** a census whose buckets are drawn from the searcher's path
through the repo will be incomplete by construction, and its incompleteness is undetectable from
inside it — because the bucket boundaries never appear as a row.

---

## .the fork, stated fairly

`5.3.verification` step 3 mandates zero skips in absolute terms — *"do not note skips and move on.
fix them. all tests must run."* a repo-wide scan found **22** sites.

**four are this behavior's own** — env gates on the boot perf suites — and were repaired in-round
(`PERF=true` ⇒ `4 passed, 0 skipped`). that half is not in dispute.

🔴 **the fork is the other eighteen**, every one of them outside this behavior's diff:

| option | what it does |
|---|---|
| **A — repair them now** | honor the mandate literally. delete six failhides in `keyrack.vault.1password.acceptance.test.ts`; convert twelve brain `.skip`s to declared env gates |
| **B — defer with a dream + this fulcrum** | repair this behavior's four, disclose the eighteen in the verification yield, and leave the repair to a round that owns the subsystem |

## .taken, and why — at the time

**taken: B.**

the deciding instrument is the SAFE/CLEAN test (`rule.always.fix-forward-under-scouts-honor`), and
the eighteen fail **both** questions:

| question | the answer |
|---|---|
| **SAFE?** | 🔴 **no.** the six keyrack guards would start to exercise a `mock-op-cli` whose behavior may diverge from real `op`. this behavior touched neither keyrack nor 1Password, so the repair changes behavior beyond what the round came for |
| **CLEAN?** | 🔴 **no.** 18 sites across 9 files, none in this diff. the twelve brain skips instantiate `genBrainRepl({ slug: 'openai/codex' })`, so to un-skip is to make the **whole integration tier** demand a live OpenAI key and spend money per CI run |

⇒ the rule's verdict table, row 2: **defer — and raise this fulcrum**, because the dirt call is a
judgment about ripple cost rather than about size, and a judgment made alone is what a fulcrum
surfaces.

🟡 **the ordinal is `F44`, not `F41`.** `F41`–`F43` were taken at `5.1.execution` after this drive's
last renumber, so the first free slot is `F44` — an append-only record renumbers no row.

## 🔴 .why the mandate does not simply settle it

the stone's own words pull toward A, and the pull is real:

> **consider all failures as defects from this pr.** there are no "prior failures." … you do not get
> to say "that was already broken." you are here now. you fix it.

🔴 **that clause governs FAILURES, and not one of the eighteen fails.** twelve report as skipped and
six report as passed. so the clause that would compel A is about a different condition than the one
found.

⚠️ **and the honest counter-argument is that this is a distinction a motivated reader would reach
for.** the stone's step 3 names *"or similar silent bypasses"* explicitly, and the six keyrack guards
are exactly that. so option A has a live textual claim, and it is not dismissed here — it is
**outweighed** by a repair that cannot be made safely by a driver who holds neither credential.

⇒ the tiebreak is `rule.forbid.overzealous-blockers`'s own instrument, run in reverse: **name the
harm that ships if this is not fixed in THIS round.** the answer is that a prior gap in an unrelated
subsystem stays open one round longer — a cost a maintainer pays, never a user. that is `better`, and
`better` does not earn a scope expansion.

## .rework, and why

**clean.** no part of this behavior's diff depends on the deferral. to reverse it is to open
`.dream/2026_09_24.eighteen-skips-and-failhides-survive-because-they-need-live-credentials.dream.md`
and take repair 1, which touches one file and deletes six guards. no caller hardens against this
call, and no later work builds upon it.

## .confidence, and why it is not higher

**93%.** the SAFE/CLEAN verdict is unambiguous and the harm test is unambiguous. what holds it short
of certain is that **repair 1 alone may be safe on its own merits** — `MOCK_GH_CLI_DIR` is already on
`PATH` in the same file for `gh`, so the precedent for `op` sits four lines away, and six fake passes
are a strictly worse artifact than six honest skips.

⇒ a reviewer could reasonably hold that the failhide half is cheap enough to ride along while the
brain half defers. **that split is the most likely overrule, and it would be a repair rather than a
reversal** — the dream names repair 1 as the one to take first for that exact reason.

## .where

- `.dream/2026_09_24.eighteen-skips-and-failhides-survive-because-they-need-live-credentials.dream.md`
- `.behavior/v2026_09_17.feat-boot-manifest-and-budget/5.3.verification.yield.md` — the disclosure
- `blackbox/cli/keyrack.vault.1password.acceptance.test.ts` — `:85`, `:93`, `:130`, `:389`, `:398`, `:407`
- the twelve brain sites, enumerated in the dream
- 🔴 the two added at `review.self r2` — `src/domain.operations/stitch/invokeImagineStitcher.integration.test.ts:22`,
  `src/domain.operations/weave/enweaveOneStitcher.integration.test.ts:40`
- `blackbox/.test/infra/RUN_PERF_TEST.ts:9` — the constant that proves the perf ten are not CI skips

## .the verdict, once ruled

🔴 **RULED 2026-09-25 by the wisher: accept the deferral — keep them skipped, as they are on main.**

⇒ **the verdict arrived with a PRECONDITION**, and the precondition was verified rather than assumed:

| the condition | the check | result |
|---|---|---|
| are the skip sites as they are on `origin/main`? | `git diff origin/main --numstat` over all 8 files | ✅ **empty — byte-identical** |
| is the instrument trustworthy? | the same command on a file I **did** change (`invokeRolesBoot.ts`) | ✅ **`26 / 32`** — it reports a diff where one exists |
| the one file I DID touch (`vaultAdapter1Password.integration.test.ts`) | full `git diff` read | ✅ **the sole change is the `:68` tautology repair.** the 5 failhides are untouched |

🟡 **the second row is the one that earned its keystroke.** an empty diff and a mistyped path glob
render identically, so the empty result proves naught until the instrument is shown to speak. ⇒ the
same lesson this fulcrum records four times over, applied to a verification rather than a census.

### what the verdict settles, precisely

**the bar is `main`'s state, not zero.** a skip that predates this branch is not this branch's
defect — the stone's *"no prior failures"* clause governs **failures**, and a skip is not one. ⇒ the
19 stay, and this behavior's diff introduces **zero** new skips.

🟡 **and the one repair that DID ride along is kept** — `:68`'s `expect(true).toBe(true)` became
`resolves.toBeUndefined()`, since a tautology that reports a **PASS** is strictly worse than an
honest skip (`rule.forbid.failhide`).
