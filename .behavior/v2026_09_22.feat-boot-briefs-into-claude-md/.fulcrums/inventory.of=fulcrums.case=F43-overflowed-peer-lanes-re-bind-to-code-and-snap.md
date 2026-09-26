# F43 — the overflowed peer lanes re-bind to code+snap, and `repo-rules` drops `.md`

## .fork

| # | the bind for the 5 overflowed lanes at 5.3 | verdict |
|---|---|---|
| **i** | **repeated per-extension `--paths-with`, each lane narrowed to the corpus its own rubric grades — `repo-rules` = code+snap, no `.md`** | ✅ **taken** |
| ii | repeated per-extension `--paths-with` that keeps `.md` for `repo-rules`, and a trimmed `--conversation` to fit | ❌ |
| iii | leave the binds as they are, report the 5 lanes as a reviewer malfunction, escalate | ❌ |

## .verdict — TAKEN, 85%

## .the cue

peer round i001 (`9af24b1e276bb4c57a`): **5 of 9 level-1 lanes returned `constraint ✋`**, each at
`94.0% of 1048576 tokens`. the correlation was exact, with no exception either way — every lane whose
`--paths-with` carried a brace in the **extension** slot (`**/*.{ts,sh,md,snap}`) overflowed, and
every lane without one ran. the tool printed its own diagnosis: `paths: (none)` · `files: null`, so
`--join intersect` had no second set and degenerated to the raw 369-file diff.

## .grounds

- **(iii) is refused by rule.** the guard bind is driver-owned
  (`rule.always.spend-own-levers-before-escalation`), and an overflowed lane draws **0 budget
  rounds**, so a re-run costs only wall time. a hand-run `rhx review` is forbidden outright
  (`rule.forbid.hand-run-reviews`).
- **(i) over (ii) — the `.md` drop is scope, never a shed of coverage.** 5.3 is the VERIFICATION
  stone: its `artifacts:` are `$route/5.3.verification.yield.md` and `src/**/*`, so its subject is
  the tests and the yield. the repo's own `.md` corpus was **already graded by this same
  `repo-rules` lane at stone 5.1.execution** — verified:
  `5.1.execution.phase0_to_phaseN._.review.i001.42078c95a1d4514c0c.r001._.given.by_peer.repo-rules.md`
  and its `.taken` both exist on disk.
- **the `.md` corpus is the token bulk.** 204 `.md` files changed since `origin/main`, against 243
  code+snap. at the calibrated ~3.2k tokens/file (r8: 99 files → 319,154 tokens → 30.4% context),
  the `.md` half alone is what put every extension-slot lane past the 75% gate.
- **(ii) would trade a real lens for a token budget.** a trimmed `--conversation` shortens the
  reviewer's own read depth on every file, where (i) drops a corpus that another stone already
  graded. one narrows the subject; the other narrows the reviewer.

## .the binds, as landed

| lane | corpus | est. files |
|---|---|---|
| r1 `repo-rules` | `src`+`blackbox` × `.ts`/`.sh`/`.snap` | ~243 |
| r2 `ergo-contract-snapshots` | `.snap` + contract/blackbox test `.ts` | ~50 |
| r3 `mech-external-contracts` | `src/contract` + `blackbox` × `.ts`/`.sh` | ~46 |
| r4 `ergo-acceptance-journey-coverage` | `blackbox` × `.ts`/`.sh`/`.snap` + `src/**/*.snap` | ~65 |
| r6 `ergo-snapshot-visual-blemishes` | `.snap` only | 20 |

each lane carries an inline `.note` in the guard that records **both** halves — the parser defect and
the scope rationale — so a reviewer can check the judgment rather than infer it.

## .rework — clean

one `Edit` to `5.3.verification.guard` restores any lane's prior bind. no code, no contract, and no
caller depends on it, and a re-run of an overflowed lane draws no budget.

## .confidence — 85%, and why not higher

the parser defect is **proven**, not inferred (the 9-lane correlation plus the tool's own
`paths: (none)` line), and the 5.1 coverage of `.md` is **verified on disk**. the residual 15% is the
estimate: the new corpora are sized from `git diff --name-only | wc -l` against one calibration
anchor, so a lane could still land past the gate. that outcome is cheap and self-announced — it costs
a re-run, not a round.

## .where

- `.behavior/v2026_09_22.feat-boot-briefs-into-claude-md/5.3.verification.guard` — lanes r1–r4, r6
- `dreams/v2026_09_25.reseed.review-drops-an-extension-slot-brace-glob-in-silence.md` — the parser
  defect, reseeded to `ehmpathy/rhachet-roles-bhrain`
- `rule.always.diagnose-reviewer-malfunctions` (bhrain/role=driver) — the guard edit as the
  sanctioned remedy
