# F30 — nheuron's foreign role is `prioritizer`, and it is a fork, not an extension

## .the fork

F15 named `learner` as the foreign role. the stone 6 census on nheuron `origin/main` found
otherwise:

- `learner` has no `.agent/repo=.this/role=learner` dir, as on 2026-11-03
- of nheuron's six native roles (any, director, foreman, prioritizer, resident, strategist), only
  **prioritizer** shares a slug with a linked package: `rhachet-roles-bhuild@0.23.3` ships
  `prioritizer`
- nheuron's `prepare:rhachet` does **not** list prioritizer, so bhuild's prioritizer is not linked
  today. no double boot now, and none after F11 lands
- the two trees do not align path for path:
  - nheuron: 45 files, flat. e.g. `briefs/define.invariant.eco.cost-rolls-up-and-sums.md`
  - bhuild 0.23.3: 57 files, nested. e.g. `briefs/rank/define.invariant.eco.cost-rolls-up-and-sums.md`
  - so the same brief names sit at different paths. bhuild's role reads as nheuron's prioritizer
    promoted and reorganized, and a mod would shadow no file

three options:
- **a. leave prioritizer native.** no move. nheuron boots as before. the stone yields a census and
  no moves, and nheuron is no first consumer
- **b. adopt bhuild's prioritizer, mod the deltas.** link bhuild's prioritizer, and write
  `.agent/repo=.mods/role=prioritizer/` with `of: bhuild/prioritizer@0.23.3`. it holds only what
  nheuron has and bhuild lacks (e.g. `define.eco.rocks.ahbode.md`). nheuron's boot changes to the
  published role plus its deltas. this breaks step 4's "same briefs as before"
- **c. not every published file, add all 45.** the boot stays the same, but the mod is a full fork
  in an overlay's coat. every bhuild upgrade would pester for naught

## .taken — none; this one is the wisher's

- (a) defeats the stone's `.why`.
- (b) changes what nheuron's clones read.
- (c) is a fork the overlay was not built to carry.

the pick decides what nheuron's prioritizer clones boot, so it is not a call for the driver.

best guess, if forced: **b**. bhuild's prioritizer is the promoted form, and the deltas are what the
overlay is for. but step 4 would have to be amended to "boots the published role plus nheuron's
deltas".

## .rework

**clean before the nheuron pr merges.** the move is one pr in one repo. after the merge it is a
second pr.

## .risk

**medium.** under (b) or (c), a wrong pick changes what nheuron's prioritizer clones boot. the harm
is a behavior one, in an extant repo, so it waits for the wisher.

## .confidence

60% on b, before the diff below. the diff was owed to settle whether nheuron's prioritizer holds
edits bhuild never took.

## .the diff — nheuron's 45 against bhuild's 57

measured 2026-11-16 by git blob sha:
- nheuron `uladkasach/nheuron` `main`, `.agent/repo=.this/role=prioritizer/`
- bhuild `ehmpathy/rhachet-roles-bhuild` `v0.23.3`, `src/domain.roles/prioritizer/`
- each file is matched by basename, since bhuild nests the briefs under `goal/` · `rank/` · `seat/`
  · `store/` and nheuron keeps them flat

| class | count |
|---|---|
| in both, same bytes | **0** |
| in both, content differs | **36** (29 briefs, 7 others) |
| nheuron only | **9** (3 briefs, 6 skill-dir test files) |
| bhuild only | **21** |
| total | 45 = 36 + 9 · 57 = 36 + 21 |

### in both, content differs — 36

the mod shadows none of these. under b, nheuron boots bhuild's copy.

| basename | bhuild path |
|---|---|
| define.decomposition.from-bot-and-from-top.md | briefs/goal/ |
| define.eco.decomposition-vs-orchestration.md | briefs/goal/ |
| define.eco.goal-slugification.md | briefs/goal/ |
| define.eco.rock-lifecycle-and-treestruct.md | briefs/goal/ |
| define.eco.rock-taxonomy.md | briefs/goal/ |
| define.eco.seed-dispatch-body-shape.md | briefs/goal/ |
| define.eco.solve-vs-clamp.md | briefs/goal/ |
| define.eco.strategic-vs-tactical.md | briefs/goal/ |
| define.invariant.eco.a-part-gates-its-whole.md | briefs/goal/ |
| define.invariant.eco.a-surgoal-must-be-declared-first.md | briefs/goal/ |
| rule.always.consider-both-directions-when-you-decompose.md | briefs/goal/ |
| rule.require.aim-a-gate-at-the-work.md | briefs/goal/ |
| rule.require.rock-goal-treestruct.md | briefs/goal/ |
| define.invariant.eco.cost-rolls-up-and-sums.md | briefs/rank/ |
| define.invariant.eco.quant-informs-opine.md | briefs/rank/ |
| howto.find-the-serialization-a-rank-hides.md | briefs/rank/ |
| rule.always.hunt-the-serialization-when-you-rank.md | briefs/rank/ |
| rule.forbid.sev-from-cash-alone.md | briefs/rank/ |
| rule.require.a-gain-cell-behind-every-sev.md | briefs/rank/ |
| define.prioritized-vs-sponsored.md | briefs/seat/ |
| howto.read-eco-priority-flags.md | briefs/seat/ |
| rule.always.prioritize-never-supervise.md | briefs/seat/ |
| rule.always.render-priorities-as-treestruct.md | briefs/seat/ |
| rule.forbid.fabricated-opines.md | briefs/seat/ |
| define.eco.priority-glyphs.md | briefs/store/ |
| define.invariant.eco.goal-is-uuid-primary-uri-unique.md | briefs/store/ |
| define.invariant.eco.status-is-derived-from-three-refs.md | briefs/store/ |
| define.invariant.eco.the-csv-is-truth-the-db-is-a-cache.md | briefs/store/ |
| define.invariant.eco.the-store-is-plaintext-in-git.md | briefs/store/ |
| boot.yml | ./ — the mod's boot.yml replaces nheuron's (below) |
| readme.md | ./ — not carried; a readme is out of a mod's scope (F5) |
| skills/eco.priority.sh | skills/ |
| skills/eco.seed.sh | skills/ |
| skills/eco.seed.integration.test.ts | skills/ |
| skills/work/ecowork.sh | skills/work/ |
| skills/work/ecowork.db.mjs | skills/work/ — bhuild split it into 8 `ecowork.db.*.mjs` modules |

what the drift is, sampled on one of the 29 briefs (`define.invariant.eco.quant-informs-opine.md`):
- bhuild's copy is nheuron's condensed. same invariant, same table, same counter-argument, same
  overturn conditions, same enforcement, tighter prose
- the one loss is a nheuron-local `.dream/` citation (F6, the open fork on the primary sort), which
  has no home in a published role

so the 29 read as one promoted edition, not as edits bhuild never took. the other 28 are measured
as different and were not read line by line. the step-2 move reads each before it lands, and
any claim that bhuild dropped returns to nheuron as an add under a new name, or upstream as a seed.

the skills are not shadowed. bhuild's `ecowork.sh` loads its split `ecowork.db.*` modules, so a
shadow of nheuron's monolithic `ecowork.db.mjs` would mix two editions of one skill.

### nheuron only — 9

| file | under b |
|---|---|
| briefs/define.eco.risk-is-unforeseen-behavioral-ambiguity.md | **mod add**. nheuron leaves it unclaimed, so it lands in `also` |
| briefs/define.eco.rocks.ahbode.md | **mod add**. unclaimed, as today |
| briefs/rule.require.lowfruit-before-topfruit.md | **mod add**, `say:`, as nheuron's boot.yml says it |
| skills/eco.seed.garden-cwd.integration.test.ts | not mod content. a test is neither a booted brief nor an invoked skill (F5) |
| skills/work/ecowork.due.integration.test.ts | not mod content |
| skills/work/ecowork.integration.test.ts | not mod content |
| skills/work/jq.variable-keywords.integration.test.ts | not mod content |
| skills/work/__snapshots__/ecowork.due.integration.test.ts.snap | not mod content |
| skills/work/__snapshots__/ecowork.integration.test.ts.snap | not mod content |

the six test files test nheuron's own copies of the skills. under b those copies go. at step 2,
each behavior they hold (`due`, the garden cwd, the jq keywords) is checked against bhuild's suite.
any behavior bhuild lacks becomes a seed to bhuild, never a mod.

### bhuild only — 21

these come with the published role, and nheuron gains them:

- briefs/glossary.of=prioritizer.md (`say:` in bhuild's boot.yml)
- briefs/rank/define.invariant.eco.gain-propagates-down-and-sums.md
- briefs/rank/define.invariant.eco.gain-sums-up-never-down.md
- getPrioritizerRole.ts
- skills/work/ecowork.db.{assert,goal,read,schema,store,verbs,vocab}.mjs (7)
- skills/work/ecowork.harness.ts
- skills/work/ecowork.{commit,goal,graph,migrate,mirror,quant,render}.integration.test.ts (7)
- skills/work/ecoworkGain.integration.test.ts
- skills/work/__snapshots__/ecowork.render.integration.test.ts.snap

### the mod set — named

```
.agent/repo=.mods/role=prioritizer/
  boot.yml
  briefs/define.eco.risk-is-unforeseen-behavioral-ambiguity.md
  briefs/define.eco.rocks.ahbode.md
  briefs/rule.require.lowfruit-before-topfruit.md
```

```yaml
# boot.yml
of: bhuild/prioritizer@0.23.3
always:
  briefs:
    say:
      - briefs/rule.require.lowfruit-before-topfruit.md
```

- three adds. zero shadows, zero nots
- an add is said by a glob (F2). the two unclaimed adds land in `also`, as they do in nheuron today
- the published say list already holds nheuron's other three says (seat, fabricated opines,
  serialization), so the mod repeats none of them

### what steps 2–5 meet outside the role dir

- **the `gain.*` pair.** nheuron's `role=any` holds `define.invariant.eco.gain-*` briefs. bhuild now
  ships two of them under `rank/`. once both are linked they would boot twice. the move retires
  nheuron's copies, or keeps the ones bhuild lacks
- **a dead ref.** nheuron's prioritizer `boot.yml` refs
  `briefs/define.invariant.eco.sponsorship-flows-down-a-gate.md`, which is not in the role dir. it
  lives elsewhere or nowhere. the move finds it a home or drops the ref
- **the budget.** nheuron's prioritizer `boot.yml` sets `budget: tokens: 10_000`. bhuild's has no
  budget key. whether a mod's boot.yml may carry a budget is not settled by F12, so the move either
  measures `roles cost` under the cap without the key, or raises it as a fulcrum of its own
- **`prepare:rhachet`** gains `prioritizer`, and nheuron's `.agent/repo=.this/role=prioritizer/` is
  removed in the same pr, so the published role and the native one never boot side by side

## .verdict

**ruled (b) — director, 2026-11-16.** nheuron adopts the published bhuild prioritizer and mods only
its extra files. the diff above names the mod set before the move. step 4 reads "boots the published
prioritizer plus nheuron's deltas". steps 2–5 land in-tree at nheuron `main` after #702 releases,
from the director's seat. no nheuron clone is owed from this route's driver.

## .where

`6.adopt.mods.in.nheuron.stone` steps 1–4. `F15` (its learner premise is stale).
