## the defect

`--paths-wout` has **zero effect** when the target set comes from `--diffs`. the flag is accepted,
the run proceeds, and not one file is excluded. it fails **silently and successfully** — the only
way to detect it is to read the token log and notice the excluded trees are still there.

## the measurement

`ehmpathy/rhachet`, branch `beav/fix-keyrack-all-skips-manifest`. five review lanes were edited to
carry a full exclusion list, then re-run. from the reviewer's own `tokens.expected.md`:

| tree | before the exclusions | after | effect |
|---|---|---|---|
| `.agent/` | 140.0k | **145.4k** | none |
| `.behavior/` | 162.7k | **181.4k** | none |
| `.dream/` | 15.8k | **15.8k** | none |
| total | 898.1k | 883.7k | still overflow, 94.7% |

the flags passed:

```
--diffs since-main
--paths-with '**/*.{ts,sh,md,snap}'
--paths-wout '.agent/**'
--paths-wout '.dream/**'
--paths-wout '.dreams/**'
--paths-wout '.behavior/**/*handoff*'
--paths-wout '.behavior/**/*.wip.md'
--paths-wout '.behavior/**/blocker/**'
--paths-wout '.behavior/**/.reviews/**'
--join intersect
```

every one of those trees is still present in the graded set afterward. `.agent/` and `.behavior/`
grew between the runs, which is unrelated — those are artifacts authored between the two runs —
but the point stands: the exclusions removed no file at all.

## the one clue, offered as a clue and NOT as a diagnosis

the failed run's scope report reads:

```
├─ targets
│  ├─ diffs: since-main
│  │  └─ files: 245
│  ├─ paths: (none)
│  │  └─ files: null
│  └─ joined via intersect
│     ├─ files: 218
│     └─ tokens: 883.7k
```

`paths:` reports `(none)` and `files: null` even though seven `--paths-wout` flags were supplied.
so the exclusions may never reach the diff-sourced target set.

⚠️ that is an **inference from one outcome**, and it should be treated as a lead rather than a
cause. the reproducible fact is the table above. whoever owns the flag handler can settle the
mechanism in one read, and should — an outcome-derived mechanism is how a wrong fix ships.

## the ask

1. **make `--paths-wout` apply to a diff-sourced target set** — or, if that is deliberate, name
   the flag that does narrow a diff-sourced set, and say so in `--help`
2. **make the scope report honest.** `paths: (none)` while seven path flags were supplied is the
   surface that would have caught this in seconds. if a supplied flag matched no file, report
   `matched: 0` rather than `(none)` — those are different facts
3. **fail a zero-target review as a `malfunction`, never as clean.** if exclusions and inclusions
   cancel out, a review that graded no file has approved no work; it has failed to run. this is
   the same doctrine as `rule.forbid.failhide`, and it is the guard that makes every future scope
   defect loud

## why this matters beyond one repo

the review lanes in bhuild's behavior route overflow because ~35% of the graded corpus is not code
— the rulebook, the route's own record, and deferred ideas are all swept in by a `**/*.md` glob.
the fix is a set of default exclusions. **that fix is blocked on this one**, because the flag it
would use is inert.

⇒ tracked as `ehmpathy/rhachet-roles-bhuild#365`, which now leads with this disproof.

## the hazard this belongs to

a review scope has two axes — **breadth** (`--paths-with` / `--paths-wout`) and **provenance**
(`--diffs`). two failure modes have now been observed in this family, and both are quiet:

- `--paths-with` **clears** the `--diffs` default. a driver who narrows a lane by path to survive
  an overflow silently loses provenance, and the lane then grades the whole corpus rather than the
  branch. observed: one lane returned 14 blockers where its twin returned 0 on the same rubric —
  every item true of the corpus, none attributable to the branch
- `--paths-wout` is inert against a diff-sourced set — this issue

neither errors. both return a plausible, well-argued review. the common cure is item 3 above plus
an honest scope report: **the reviewer should refuse to grade a scope it cannot honestly describe.**

---

reported from `ehmpathy/rhachet`, behavior `v2026_08_25.fix-keyrack-all-skips-manifest`, stone
`5.3.verification`. logs: `.log/bhrain/review/2026-09-06T16-56-40-610Z/`.
