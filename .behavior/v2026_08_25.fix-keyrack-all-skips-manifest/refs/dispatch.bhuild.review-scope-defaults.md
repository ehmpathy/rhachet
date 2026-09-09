# ⛔ READ FIRST — the fix proposed below was TESTED AND DOES NOT WORK

i ran it. `--paths-wout` had **zero effect** when the target set comes from `--diffs`.

the guard's five l1 lanes were edited to carry the full exclusion list from the ask section, and
the lane was re-run. measured, from the reviewer's own `tokens.expected.md`:

| tree | before the exclusions | **after** | effect |
|---|---|---|---|
| `.agent/` | 140.0k | **145.4k** | none — it GREW |
| `.behavior/` | 162.7k | **181.4k** | none — it GREW |
| `.dream/` | 15.8k | **15.8k** | none |
| total | 898.1k | **883.7k** | still overflow, 94.7% |

every excluded tree is still graded. the growth is my own artifacts written between the two runs —
which is the compound loop this issue describes, now measured rather than argued.

⚠️ **i do NOT claim the mechanism.** the run reports `paths: (none) / files: null` for the paths
source while `diffs` reports 245 files, so `--paths-wout` appears not to reach a diff-sourced
target set — but that is an inference from one outcome, and this repo forbids exactly that move
(`rule.forbid.mechanism-inferred-from-outcome`). the FACT is the table above. whoever owns
`rhx review` can read the cause in one look at the flag handler.

⇒ **this issue is BLOCKED on `ehmpathy/rhachet-roles-bhrain#443`**, which owns the flag
(`repo=bhrain/role=reviewer/skill=review`). the defaults below cannot ship while the flag they
depend on is inert.

the sequence:

1. **bhrain#443** — make `--paths-wout` apply to a diff-sourced target set, and make the scope
   report say `matched: 0` rather than `(none)` when a supplied flag matched no file
2. **then this issue** — ship the defaults below
3. **independent of both, and shippable NOW** — the zero-target guard, see the "ONE exception"
   section. a review that graded no file has approved no work; it has failed to run. that guard is
   what would have made THIS failure loud rather than silent, and it needs no flag fix

⚠️ the silent-inertness hazard this issue warns about in two other places just claimed me. i
edited five lanes, the config read as fixed, the run reported the same overflow, and only a token
log proved the flags were inert. i reverted the edit rather than leave a guard that looks solved.
**an inert exclude is worse than an absent one.**

the analysis below stands on its own — the token measurements, the yields split, and the A/B
arithmetic are all still correct and still say what should be excluded. only the MECHANISM for
the exclusion is unproven.

---

## the defect

review lanes in the behavior route's verification guard overflow the reviewer context window
(`prompt exceeds 75% of context window`) and return `malfunction` rather than a verdict. a
malfunction blocks stone passage, so the route halts on a fault that is pure scope.

measured on `ehmpathy/rhachet`, branch `beav/fix-keyrack-all-skips-manifest`, read from the
reviewer's own `tokens.expected.md`:

| tree | tokens | share | is it a deliverable? |
|---|---|---|---|
| `src/` | 281.7k | 31.4% | yes |
| `blackbox/` | 248.7k | 27.7% | yes |
| `.agent/` **as targets** | 140.0k | 15.6% | NO — the rulebook |
| `.behavior/` | 162.7k | 18.1% | partly — see below |
| `.dream/` | 15.8k | 1.8% | NO — deferred ideas |
| **total** | **898.1k** | | gate is 75% of 1M = 750k |

**35.5% of the graded corpus is not code.** the cause is the guard's glob:

```
--paths-with '**/*.{ts,sh,md,snap}'
```

that `.md` sweeps every brief, every glossary file, every route yield, every handoff, and every
review artifact into the set of things to grade.

## the two specific errors

**1. `.agent/` is 140.0k of targets, and it splits into two DIFFERENT faults.** the rules glob is
`.agent/repo=.this/**/rule.*.md`, so the 49.2k `--rules` set is `rule.*.md` files only. that
matters, because the two halves of the target tree fail for different reasons:

| half | tokens | fault |
|---|---|---|
| `rule.*.md` + `define.*` + `howto.*` | ~44.0k | **double-supplied** — the rule files are already the rubric, now re-supplied as work to grade |
| `domain.terms/` (`term=*.md`) | **96.0k** | **single-supplied, and it is a REFERENCE** — roughly 100 glossary files at 2-4k each |

⇒ the glossary is the single largest excludable item in the entire run, and it is **not** a
double-supply — it is a lane that grades the dictionary. `term=fix._.choice.reason.md` is
vocabulary a reviewer may need to READ; it is not a deliverable to score.

⚠️ **the honest counter, stated so whoever ships this can weigh it.** a branch CAN author term
clusters as genuine deliverables — this one wrote ~20 — and there are rules that govern their
shape (`rule.require.domain-term-itemization`, `rule.forbid.domain-term-synonyms`). so a blanket
`domain.terms/` exclude discards real work from the graded set.

the resolution is the provenance axis, not the breadth axis: with `--diffs since-main` live, the
intersect keeps exactly the ~20 the branch wrote and drops the ~80 it did not. **so the right
default is to exclude `domain.terms/` only where provenance cannot narrow it** — and to note in
the guard that a repo with a working diff filter should prefer the intersect over the exclude.

**2. the route's own record is graded, and it COMPOUNDS.** `.behavior/` holds the yields, wips,
handoffs and blocker notes the driver writes. so every artifact written to answer a lane enlarges
the corpus the next lane must read. at 162.7k it is now larger than `src/contract/`. this is a
feedback loop with no fixed point.

## the ask

ship default `--paths-wout` entries in the guard's review lanes, so every repo inherits the fix
rather than each driver who rediscovers it.

```
--paths-wout '.agent/**'                   # the whole briefs dir — see "domain.terms alone is
                                           #   NOT enough" below. rule.*.md is already the
                                           #   --rules set; domain.terms/ is reference vocab
--paths-wout '.dream/**'                   # deferred ideas, never deliverables
--paths-wout '.dreams/**'                  # ⚠️ BOTH forms — see the note below
--paths-wout '.behavior/**/*handoff*'      # superseded relays
--paths-wout '.behavior/**/*.wip.md'       # scratch
--paths-wout '.behavior/**/blocker/**'     # driver-to-foreman escalation notes
```

⚠️ **cover `.dream/` AND `.dreams/`.** this repo uses the singular; the plural is in use elsewhere.
a default that ships org-wide and misses the real directory name is **silently inert** — it
excludes not one file, reports no error, and the lane overflows exactly as before while the config
reads as if it were fixed. that is the same silent-and-successful failure mode this issue's last
section describes, so the default should tolerate both rather than presume one.

if bhuild holds a canonical form, normalize on it and say so in the guard comment — an inert
exclude is worse than an absent one, because it looks solved.

## IMPORTANT: keep the yields

`.behavior/` is not uniform, and a blanket exclusion would be the wrong trade:

| item | tokens | keep? |
|---|---|---|
| `5.1.execution.from_vision.yield.md` | 80.5k | KEEP — yield |
| `5.3.verification.yield.md` | 35.9k | KEEP — yield |
| `1.vision.yield.md` | 8.2k | KEEP — yield |
| `0.wish.md` | 2.0k | KEEP — the ask |
| handoff v1-v4 | 20.5k | drop |
| `*.wip.md` | 8.8k | drop |
| `blocker/` | 6.5k | drop |

yields are 124.6k of the 162.7k. to drop `.behavior/` wholesale would discard the thought record
to save 38k. the yields are what a reviewer needs to judge whether the work matches its intent.

## `domain.terms/` alone is NOT enough — take the whole briefs dir

the obvious narrower cut is to exclude only the glossary and keep the rest of the briefs
gradeable. the numbers refuse it:

| cut | total | vs 750k gate |
|---|---|---|
| **option A** — `domain.terms/` only (−96.0k), plus dream + handoffs + wip + blocker | **750.5k** | ⛈️ **fails by 0.5k** |
| **option B** — the whole `briefs/` dir (−140.0k), same other cuts | **706.5k** | ✅ 70.6% |

option A lands **0.5k over a 750k gate** — inside the measurement noise, and it overflows the
moment anyone writes one more paragraph.

⇒ and the deciding argument is not the 0.5k, it is the **trend**. the glossary grows every round
by design — the learner paves term clusters on an hourly nudge, 2-4k each. a scope tuned to sit
0.5k under the gate today is over it after the next term is paved. **option A is a default that
expires.**

### what option B costs, stated plainly

the whole-dir exclude drops three kinds of file, and they are not equally safe to drop:

| kind | tokens | safe to exclude? |
|---|---|---|
| `rule.*.md` | in the 49.2k `--rules` set | ✅ **free** — double-supplied by construction |
| `domain.terms/` | 96.0k | ✅ reference vocabulary |
| `define.*` / `howto.*` | remainder | ⚠️ **NOT free** — single-supplied, and a branch may author them |

this branch authored `define.invariant.empty-render-names-its-cause.md` and
`define.keyrack-verb-machine-wide-support.md` as genuine deliverables. option B drops them from
the graded set.

⇒ that cost is real but **temporary, and it is the provenance axis that repays it**: once
`--diffs since-main` is live, the intersect keeps exactly the briefs the branch authored and drops
the rest. so the guard comment should say: *exclude the briefs dir where provenance is degenerate;
prefer the intersect where it is not.*

## ⚠️ the ONE exception — a lane whose rubric IS the glossary must keep it as a target

the default above says *a reviewer does not need the glossary*. that holds for every lane whose
rubric is about code. it **inverts** for a lane whose rubric is about the vocabulary itself:

| rubric | `domain.terms/` is... |
|---|---|
| `rule.forbid.helpful-error-parents`, `rule.require.given-when-then`, … | reference — **exclude** |
| `rule.require.domain-term-itemization` | **the target** — an exclude would gut the lane |
| `rule.forbid.domain-term-synonyms` | **the target** |
| `rule.forbid.domain-term-ambiguity` | **the target** |

⇒ a blanket `--paths-wout '.agent/**'` applied to a glossary lane makes it match **zero targets**,
report clean, and pass. it would not error. it would look like an approval.

that is the same silent-and-successful failure this issue's last section describes, and it is
worse here, because the lane that polices the vocabulary is precisely the one nobody re-reads.

**so the default must be a DEFAULT, never a hardcode** — overridable per lane, and a glossary lane
overrides it. two shapes that both work:

```yaml
# option 1 — the lane opts out of the default set
- slug: learn-domain-terms
  run: $rhx review --rules '.agent/**/rule.*domain-term*.md' \
         --paths-with '.agent/**/domain.terms/**' --paths-wout-defaults false ...

# option 2 — an explicit --paths-with re-includes what the default excluded
#            (i.e. --paths-with wins over the default --paths-wout, per-lane)
```

⚠️ **and whichever shape ships, a zero-target lane must NOT report clean.** if the exclusions and
the inclusions cancel out, the honest outcome is a `malfunction` that names the empty scope — the
same doctrine `define.invariant.empty-render-names-its-cause` states for a render, and
`rule.forbid.failhide` states for a test. a review that graded not one file has approved no work;
it has failed to run.

that guard is worth more than the exclusions themselves. it makes every future scope defect loud
rather than silent — the ones this issue has not thought of, too.

## the arithmetic, with yields kept

| cut | running total | vs 750k gate |
|---|---|---|
| baseline | 898.1k | 89.8% — OVERFLOW |
| less `.agent/` targets | 758.1k | 75.8% — still over |
| less `.dream/` | 742.3k | 74.2% — under, thin |
| less handoffs + wip + blocker | **706.5k** | **70.6% — comfortable** |

every yield stays and the lane still completes. the `.agent/` exclusion does the heavy lift.

## the sharper shape, if you want it

a yield is not a deliverable to GRADE — it is context to READ. the lanes already have the flag
that says so: `--refs`. to move yields from `--paths-with` to `--refs` states the intent exactly,
at identical token cost. the `--paths-wout` list above is the cheap version; this is the correct
one.

## a second-order note worth a guard comment

`--paths-with` CLEARS the `--diffs since-main` default. a driver who narrows a lane by path to
survive the overflow silently loses the provenance filter, and the lane then grades the whole
corpus rather than the branch. observed here: one lane returned 14 blockers where its twin
returned 0 on the same rubric — every item true of the corpus, none attributable to the branch.

that failure is SILENT and SUCCESSFUL, which makes it worse than the overflow. worth either a
warn when both flags are dropped together, or a line in the guard's own comments.

---

reported from `ehmpathy/rhachet`, behavior `v2026_08_25.fix-keyrack-all-skips-manifest`, stone
`5.3.verification`. full measurements in that route's `blocker/5.3.verification.md`.
