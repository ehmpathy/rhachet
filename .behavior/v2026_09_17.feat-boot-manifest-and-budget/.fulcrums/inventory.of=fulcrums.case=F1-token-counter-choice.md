# F1 — the token counter: estimator vs real tokenizer

**rework: dirty · status: 🔴 ANSWERED — BY THE WISHER · confidence: 100%**

## 🔴 .SETTLED 2026-09-18 — a REAL TOKENIZER. read the verdict here, the argument below

**taken: a real tokenizer (`js-tiktoken`, `o200k_base`), lazily loaded when a `budget` is declared.**

I had taken `ceil(chars / 3.5)` at 72% — a deliberate overcount, on the argument that a real
tokenizer breaches a live `under 250ms` perf assertion. **the wisher refused the tradeoff rather
than pick a side of it**, and it is now **requirement 7** of the wish (seed **S3**).

⇒ 🔴 **and my argument had a hole requirement 4 already closed.** the objection was *"the tokenizer
costs seconds on the boot path"* — true, and **the boot path it costs seconds on is the one with no
budget, which needs no counter at all.**

| the boot | pays the tokenizer? | the assertion it lives under |
|---|---|---|
| no `budget` declared — every extant boot | **zero.** byte-identical, per requirement 4 | the live `under 250ms` — **untouched** |
| a `budget` declared | yes | 🔴 a **new** assertion, owed at the criteria stage |

🔴 **requirement 4 was read for six rounds as a blast-radius shield alone. it is also the perf
shield.** the durable lesson, in seed S3: *when a cost looks prohibitive, ask which callers actually
pay it — an opt-in feature's cost falls on opt-in callers, so a global assertion may not sit in its
path at all.*

⇒ **`F1′` stops to be a `[research]` spike.** it was *"a real tokenizer behind an on-disk cache —
priced but never measured warm"*. the tokenizer is now required, and the **cache** is an
optimization the lazy load may make unnecessary: only budgeted boots pay, so the miss-on-every-edit
objection lands on a far smaller population than the whole boot path.

### 🔴 .items 1 and 2 are now MEASURED — 2026-09-18, and the attribution was wrong

the wisher pushed on the perf claim directly — *"how slow is tokenization? i thought it was fast"* —
and the measurement says **they are right, and my wording was wrong.**

| # | run | mean | what it isolates |
|---|---|---|---|
| a | `npx tsx --version` | **81ms** | process + tsx startup, alone |
| b | `rhx calc.tokens` on **678 chars** | **1,882ms** (5 runs, σ 447ms) | a + encoder construction. encode ≈ 0 |
| c | `rhx calc.tokens` on **3,010,092 chars** / 793 files | **4,973ms** (5 runs, σ 631ms) | a + construction + full encode |

**the decomposition, by subtraction:**

| component | cost | scales with |
|---|---|---|
| process + tsx startup | **~81ms** | naught |
| 🔴 **encoder construction** (`encodingForModel`) | **~1,800ms** | naught — **ONE time per process** |
| **encode** | 🔴 **0.97 MB/s** — `(c − b) = 3,091ms` for `3,009,414` chars | payload size |

⇒ **for one role's 44,666-char boot payload, encode costs ~46ms.**

#### 🔴 the correction — "the tokenizer costs 1.66s" named the wrong operation

| what I wrote | what is true |
|---|---|
| *"the real tokenizer breaches a live assertion by ~6.6x"* | **the ENCODE does not.** ~46ms sits inside `under 250ms` with room to spare |
| *"a real tokenizer costs ~1.66s"* | 🔴 **encoder construction costs ~1.8s. tokenization costs 46ms.** two operations, and only one of them scales with the payload |

🟡 **item 2's guess was directionally right and its evidence was not.** I inferred *"almost entirely
fixed"* from a corpus run that appeared **faster** than a single-file run — a measurement artifact,
never evidence. the honest basis is the three-run subtraction above, and it happens to confirm the
guess: **fixed cost is 39x the encode of a real boot payload.**

⇒ and `calcBrainTokens.ts:15` constructs the encoder **inside the function body**, so a per-file
call pays ~1.8s **per file**. any implementation must construct once and reuse — a real builder
constraint this measurement surfaces, and one that stayed invisible while the cost was
mis-attributed to *"the tokenizer."*

#### 🔴 .the synthesis — requirement 9's gate 1 removes the cost entirely

the fixed cost is paid **once per process**, and `repo introspect` is a process where 1.8s is free —
it runs inside `npm run build`, beside a `tsc` compile.

| gate | pays construction? | pays encode? |
|---|---|---|
| **1 — `repo introspect`**, pre-publish | ✅ yes, ~1.8s — **free here**, it is a build step | ✅ ~46ms |
| **3 — `roles boot`** | 🔴 **naught, if the count is precomputed** | 🔴 **naught** |

`rhachet.repo.yml` is already the artifact introspect writes, and `castIntoRoleRegistryManifest.ts`
already carries a `boot?: string` field per role. ⇒ **a token count beside it makes gate 3 an
integer comparison**: no tokenizer, no construction, no encode, no dependency on the boot path.

🔴 **so the gate-position redirect and the perf objection solve each other.** `F1` argued the
tokenizer is too slow for the boot path; `F4` argued the gate belongs on the boot path. **the wisher
moved the gate to build time, which is exactly where the slow part is free** — and what remains on
the boot path is a number read from a manifest.

🟡 what this leaves open: whether gate 2 (`hook.onStop`) reads a precomputed count or pays
construction. it is a session-end hook with no `250ms` assertion over it, so ~1.8s is likely
acceptable — but that is a measurement owed, never a claim settled.

### 🟡 what is still owed to the criteria stage

| # | the question |
|---|---|
| ~~1~~ | ✅ **MEASURED above.** 81ms startup / ~1,800ms construction / 46ms encode |
| ~~2~~ | ✅ **MEASURED above.** fixed cost dominates, 39x over a real payload's encode |
| 🔴 **1′** | the **new perf assertion** for a budgeted boot, now that the shape is known: does gate 3 read a precomputed count (⇒ the extant `under 250ms` holds untouched) or tokenize in-process (⇒ ~1.9s, a new assertion)? |
| 🔴 **2′** | whether `rhachet.repo.yml` gains a **token-count field** — a schema addition, and the one dirty edge of this otherwise-clean re-decision |
| 3 | 🔴 **which model's encoder.** `o200k_base`/`gpt-4o` is what `calcBrainTokens.ts` uses and what every measurement here used. a budget is enforced against *one* tokenizer, and the payload is consumed by a *different* model — so the honest statement is that the count is exact for a named encoder and approximate across models |

⇒ item 3 is the residual honesty problem, and it is **much smaller** than the one it replaces: a
named-encoder exact count carries a model-family error of a few percent, where `chars ÷ 4` carried
**3.29x**.

---

## 🔴 .the argument below is SUPERSEDED — keep it for its measurements

all of it debated **which estimator** to pick. that debate is closed. the measurements are still the
record of *why* the extant counter cannot stand, and `F12`'s numerator result is still the larger
half of the same defect.

> 🟡 **read `F12` first.** F12 measures that the gated number covers **36.5%** of the emitted payload
> (16,427 of 44,666 chars), a **2.72x** omission; this fulcrum debated the **divisor** applied to
> that number. ⇒ 🔴 **requirement 7 now settles both at once** — *accurate* means real tokens over
> the **full emitted payload**, so the numerator and the denominator are repaired in one move rather
> than in F12-then-F1 order.

---

## .the fork, stated fairly

the wish makes the token count decisive (requirement 2: it refuses a boot), then names three
counters and asks us to pick one and state the error bar.

| option (the wish's words) | its stated tradeoff |
|---|---|
| keep `chars ÷ 4` | *"zero deps, and it refuses a boot on a number nobody has verified"* |
| a real tokenizer | *"accurate per model, and it adds a dependency to the boot path"* |
| `chars ÷ 4` **plus a measured correction** | *"cheap, and the correction needs a one-time measurement"* |

---

## 🔴 .what the measurement changed

both premises behind option 2 turned out wrong, in opposite directions.

**measured via `rhx calc.tokens`** (entooled this round; `.agent/repo=.this/role=any/skills/`),
over this repo's 977-file `.agent` brief corpus:

| quantity | value |
|---|---|
| chars | 3,376,305 |
| tokens (o200k_base, gpt-4o) | 850,635 |
| `chars / 4` estimate | 844,077 |
| **error, corpus-wide** | **−0.8%** — undercounts |
| true divisor | **3.969** |
| per-file density: min / p05 / p50 / p95 | **2.96** / 3.59 / 3.98 / 4.75 |

**measured via `rhx perf.test`**, 5 runs, tokenizer on one tiny file:

| quantity | value |
|---|---|
| a `calc.tokens help` floor (bash + rhx dispatch) | 174ms |
| one real-tokenizer run | **1,830ms** |
| the tokenizer's own cost | **~1,656ms** |

### the two corrections

1. **the dependency is already here.** `js-tiktoken@1.0.18` is in `package.json:122`, used by
   `calcBrainTokens.ts`. so *"adds a dependency"* was never the cost.
2. ⚠️ ~~**the real cost is latency, and it disqualifies the option.**~~ 🔴 **REFUTED 2026-09-18 —
   see `.the correction` below.** it read: *"~1.66s against a boot path whose own acceptance test
   (`roles.boot.performance.collocated.acceptance.test.ts:45`) asserts `under 250ms` across a 30-run
   average — warm-cache actuals noted at ~69ms on line 47. so the real tokenizer breaches a live
   assertion by ~6.6x."*

   🔴 **the assertion and the 1.66s are both real, and the sentence that joins them is not.** the
   1.66s is **encoder construction**; the **encode** of a 44,666-char payload is **~46ms**. ⇒ the
   claim measured one operation and attributed the cost to another.

   🟡 corrected at `review.self r1`, issue 1: an earlier draft cited *"35-70ms"* as the target.
   that range was assembled from two tests' incidental **comments**, and its `~36ms` half came from
   `run.skill.performance…`, which does not exercise the boot path at all. ⇒ **the r1 correction
   made the number more rigorous and left the attribution wrong** — which is why the claim survived
   six rounds of review, and why only a question about the *mechanism* found it.

⇒ and the wish's *suspicion* about glyph density was right in direction, wrong in magnitude: our
glyphs do tokenize badly (`⚠️` = 3 tokens for 2 chars, `├─` = 2 for 2), but at corpus scale the
prose dilutes them to −0.8%.

---

## 🔴 .the part that actually matters — the error is SCALE-DEPENDENT

the corpus-wide −0.8% reads as comfort and is **nearly irrelevant**, because a budget does not
measure a corpus. it measures **one payload**, and a route-scoped manifest is small and dense.

| the payload | `chars / 4` error |
|---|---|
| the whole 977-file corpus | −0.8% |
| a single p05-density brief (3.59) | **−10%** |
| a single min-density brief (2.96) | **−26%** |

⇒ **a small manifest of dense briefs is exactly the shape `--manifest` exists to serve, and
exactly where `chars / 4` fails worst.** an undercount is the one direction that matters: it lets
an over-budget payload render, which is the silent pass requirement 2 forbids.

---

## .the guess taken, and why — at the time

**take option 3: `chars / 4` with a measured, conservative correction — biased to OVERCOUNT.**

```
tokensEstimated = ceil(chars / 3.5)
```

| why 3.5, not 3.969 | |
|---|---|
| 3.969 is the corpus **mean** | half of all payloads are denser than the mean, so a mean-calibrated divisor undercounts half of them |
| 3.5 sits below p05 (3.59) | ⇒ it **overcounts ~95% of individual briefs** |
| an overcount is the safe direction | it refuses a boot that was marginally fine (annoyance, one line of diff) rather than passes one that was not (the defect) |
| it is free | no tokenizer init, no latency, no new dependency on the boot path |

⇒ **the asymmetry is the whole argument.** the two errors are not symmetric in cost:

| mis-grade | cost |
|---|---|
| overcount → refuses a boot that fit | the author raises the budget by a line. visible, cheap, reviewable |
| **undercount → passes a boot that did not fit** | 🔴 the exact defect this wish exists to prevent. silent, permanent, paid every session |

---

## ⚠️ .the confidence of the SUPERSEDED guess — 72%

> 🔴 **each section from here to `.the see also` grades a guess that no longer ships.** it is kept
> because a fulcrum's job is the record of the call, and because **two of its three "confident of"
> rows turned out false** — which is worth more than the guess was.

| what I claimed confidence in | the verdict |
|---|---|
| the measurement (977 files, two instruments, both entooled and re-runnable) | ✅ **held** — the corpus numbers are unchanged, and `rhx calc.tokens` re-runs them |
| 🔴 the latency refusal of a boot-path tokenizer | 🔴 **FALSE.** it measured encoder construction, not encode |
| the overcount-is-safer asymmetry | 🟡 **moot** — a real count needs no safety margin |

| what I claimed doubt about | the verdict |
|---|---|
| **that a deliberately-inaccurate divisor is the right contract to publish** | 🔴 **the doubt was right, and it was the whole answer.** the wisher read it and refused the divisor |
| whether `3.5` is the right constant, vs p01, vs a per-file density probe | moot |
| whether the doc can honestly explain *"the number we show is not the number you pay"* | 🔴 **also right** — and the honest answer was that it cannot, so the number changed |

🔴 **the lesson: my stated doubt named the correct objection, and I shipped past it anyway.** a 28%
doubt pointed at *"we would publish a number we know is wrong"* — and the fulcrum's own guess kept
the wrong number. ⇒ **a doubt that names a contract defect is not a confidence discount; it is a
defect on the record.**

🔴 **the 28% of doubt is concentrated in one place: we would ship a counter we KNOW is wrong, on
purpose, and call it `tokens`.** that is a legibility hazard of its own — an author who trims to
hit 5,000 shown-tokens has really trimmed to ~4,400 real ones, and lost 12% of headroom they
were entitled to.

⇒ a reviewer may reasonably prefer the real tokenizer **behind a cache** (hash the payload, store
the count) — which trades latency for cache-invalidation complexity. that option was not
measured, and it is the strongest alternative.

### 🔴 .but the cache is narrower than it reads — found at `review.self r3`

two facts, each established elsewhere, that together bound the alternative hard:

| fact | source |
|---|---|
| **a boot is a fresh process.** every `rhachet roles boot` is a cli spawn — a `SessionStart` hook invokes the binary | the cli architecture |
| the perf suite spawns the compiled binary **30 times** per suite, across 8 suites — ~240 separate processes | `.dream/2026_09_07.perf-suites-starve-a-cosheduled-network-install.dream.md` |

⇒ **an in-memory cache does naught.** it cannot survive the spawn boundary, so each of those ~240
spawns pays the full ~1.66s cold. the cache must be **on disk** to help at all — which turns a
"hash the payload" line into a cache dir, a write on the boot path, and an invalidation contract.

🔴 **and it fails worst in exactly the loop this vision centers.** `case=7` is an authorship loop:
the author edits the manifest, re-boots, reads the headroom, edits again. **a cache keyed on payload
content misses on every edit** — so the one actor who boots most often is the one actor the cache
never serves.

| who boots | cache behavior |
|---|---|
| a session, on an unchanged payload | ✅ hits — the ideal case |
| 🔴 **an author mid-trim (`case=7`)** | **misses every time** — the content changed, which is why they re-booted |
| the perf suite | 🔴 misses per spawn unless the cache is on disk |

⇒ this does **not** retire the alternative — an on-disk cache keyed on content is still coherent,
and the steady-state session case is its strongest ground. it does mean the alternative is *"an
on-disk cache with a write on the boot path, that misses throughout the authorship loop"*, rather
than *"hash the payload, store the count."*

🟡 **the honest effect on this fulcrum's confidence: it strengthens the guess taken, and I hold
72% rather than a raise.** the 28% of doubt was never about the alternative's cost — it is about a
divisor we know is wrong, published under the name `tokens`, and no fact above touches that doubt.

---

## .the rework cost — why dirty

| what calibrates against the counter | the ripple |
|---|---|
| **every `budget.tokens` value in every spec** | a divisor change re-calibrates all of them at once. a spec that fit yesterday halts today |
| the `<stats>` line, snapshotted | every boot snapshot in `blackbox/cli/__snapshots__/` |
| the halt's arithmetic, snapshotted | the new over-budget snapshots |
| any consumer that reads a token count | `rhachet-roles-bhrain#510`, `rhachet-roles-bhuild#392` |

⇒ **the numbers become a published contract the moment the first budget is declared.** that is
what makes this dirty rather than clean.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:148` — the extant `Math.ceil(totalChars / 4)`
- `src/domain.operations/brainCost/calcBrainTokens.ts` — the real tokenizer, already present
- `.agent/repo=.this/role=any/skills/calc.tokens.sh` — the instrument, re-runnable

## .the verdict

_(open — for the fulcrum council)_
