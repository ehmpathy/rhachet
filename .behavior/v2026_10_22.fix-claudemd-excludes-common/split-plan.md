# split-plan — #717 into layer prs

#717 at head `c8e9aa99`: 111 files, +5405 −203 = **5608 lines** changed, ~63 min of review. The bar is 30 min per pr.

The plan has six layer prs, in dependency order with the base first. Each is under 30 min. #717 closes unmerged once L6 lands, and is superseded by the six.

## .the review-time model

- **rate** — calibrated to the director's measure: 63 min / 5608 lines = **1.12 min per 100 changed lines**. Changed = added + deleted, per file, from the pr's own file list.
- **margin check** — the plan holds a second, harsher model too: every src/blackbox line that is not a snapshot costs **2×**. Every layer stays under 30 min under both (F15).

## .the layers

| # | layer | deps | files | lines | min (rate) | min (2× code) |
|---|---|---|---|---|---|---|
| L1 | ci base: role bump + two deflakes | main | 8 | 149 | 1.7 | 2.4 |
| L2 | base libs: git index, machine-name scan, brain dir name, the rule | L1 | 13 | 721 | 8.1 | 15.5 |
| L3 | claudeMdExcludes: one portable glob, the per-machine entries cleaned | L2 | 18 | 925 | 10.4 | 18.5 |
| L4 | the grove link leaves git | L2 | 14 | 569 | 6.4 | 12.6 |
| L5 | the check that bites, plus the route record | L3, L4 | 42 | 1644 | 18.5 | 21.8 |
| L6 | the route machinery | L5 | 16 | 1600 | 18.0 | 18.0 |
| | **sum** | | **111** | **5608** | **63.1** | |

L3 and L4 share no file, and each needs only L2. Either may land first, or the two may review in parallel.

---

## L1 — ci base: role bump + two deflakes

**why first:** every later layer's snapshots were taken under `rhachet-roles-ehmpathy@1.39.9`, and every later layer's ci needs the two deflakes to stay green.

| file | + | − | lines |
|---|---|---|---|
| `package.json` | 1 | 1 | 2 |
| `pnpm-lock.yaml` | 41 | 28 | 69 |
| `src/.test/defaultPeerReviewerBrain.integration.test.ts` | 4 | 1 | 5 |
| `blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` | 8 | 8 | 16 |
| `blackbox/cli/__snapshots__/rhx.acceptance.test.ts.snap` | 4 | 16 | 20 |
| `src/domain.operations/clone/asClonesInStableOrder.ts` | 4 | 1 | 5 |
| `src/domain.operations/clone/asClonesInStableOrder.test.ts` | 19 | 0 | 19 |
| `src/domain.operations/keyrack/session/unlockKeyrackKeys.integration.test.ts` | 9 | 4 | 13 |
| **total** | | | **149** |

**clamp:** `asClonesInStableOrder.test.ts [case2]` is red without the instant compare and green with it.

## L2 — base libs

**why here:** L3 and L4 both import these. The rule brief lands here too, since L3 and L4 code comments cite `rule.forbid.machine-names-in-committed-config`. Each cited path then exists the day its citer lands (F16).

| file | + | − | lines |
|---|---|---|---|
| `src/infra/asGitEnvInCLocale.ts` | 8 | 0 | 8 |
| `src/infra/asGitEnvInCLocale.test.ts` | 34 | 0 | 34 |
| `src/infra/delGitIndexPaths.ts` | 90 | 0 | 90 |
| `src/infra/delGitIndexPaths.integration.test.ts` | 216 | 0 | 216 |
| `src/domain.operations/invoke/link/findsertDirGitignore.ts` | 8 | 39 | 47 |
| `src/.test/infra/setProcessEnvVar.ts` | 16 | 0 | 16 |
| `src/.test/infra/withTempHome.ts` | 3 | 2 | 5 |
| `src/.test/infra/getAllMachineNamesInText.ts` | 87 | 0 | 87 |
| `src/.test/infra/getAllMachineNamesInText.test.ts` | 135 | 0 | 135 |
| `src/domain.operations/actor/enrolled/constants.ts` | 8 | 0 | 8 |
| `src/domain.operations/actor/enrolled/getBrainOndiskDir.ts` | 2 | 1 | 3 |
| `src/domain.operations/invoke/link/findsertAgentEphemeralGitignore.ts` | 4 | 3 | 7 |
| `.agent/repo=.this/role=any/briefs/rule.forbid.machine-names-in-committed-config.md` | 65 | 0 | 65 |
| **total** | | | **721** |

**behavior:** none changes. `findsertDirGitignore` moves onto `delGitIndexPaths`. That gives the new lib a prod consumer in the same pr, so no export lands with no caller. `ACTOR_BRAIN_DIR_NAME` replaces two `'brain'` literals with the same value.

## L3 — claudeMdExcludes: one portable glob (wish outcomes 1 and 2)

| file | + | − | lines |
|---|---|---|---|
| `src/domain.operations/enroll/asClaudeMdExcludesPortable.ts` | 12 | 0 | 12 |
| `src/domain.operations/enroll/asClaudeMdExcludesPortable.test.ts` | 44 | 0 | 44 |
| `src/domain.operations/enroll/getClaudeMdExcludesList.ts` | 24 | 8 | 32 |
| `src/domain.operations/enroll/getClaudeMdExcludesList.test.ts` | 104 | 15 | 119 |
| `src/domain.operations/enroll/genBrainCliConfigArtifact.ts` | 19 | 17 | 36 |
| `src/domain.operations/enroll/genBrainCliConfigArtifact.integration.test.ts` | 123 | 3 | 126 |
| `src/.test/infra/getThisMachine.ts` | 16 | 0 | 16 |
| `src/domain.operations/enroll/setActorSettingsDerived.ts` | 25 | 1 | 26 |
| `src/domain.operations/init/hooks/asEnrolledActorsHookSyncLines.ts` | 12 | 2 | 14 |
| `src/domain.operations/init/hooks/asEnrolledActorsHookSyncLines.test.ts` | 87 | 2 | 89 |
| `src/domain.operations/init/hooks/__snapshots__/asEnrolledActorsHookSyncLines.test.ts.snap` | 18 | 2 | 20 |
| `src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts` | 12 | 6 | 18 |
| `src/domain.operations/init/hooks/syncHooksForLinkedRoles.integration.test.ts` | 1 | 1 | 2 |
| `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json` | 1 | 1 | 2 |
| `blackbox/cli/enroll.acceptance.test.ts` | 109 | 0 | 109 |
| `blackbox/cli/__snapshots__/enroll.acceptance.test.ts.snap` | 146 | 9 | 155 |
| `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` | 81 | 1 | 82 |
| `blackbox/cli/__snapshots__/brain-dir-boot.journey.acceptance.test.ts.snap` | 23 | 0 | 23 |
| **total** | | | **925** |

**clamps:**
- `getClaudeMdExcludesList.test.ts`: the glob matrix.
- `genBrainCliConfigArtifact.integration.test.ts [case8]`: two merged homes are cleaned.
- `[case9]`: an absent key.
- `enroll.acceptance [case2f]`.
- the real-cli `[t3.0]` home-sentinel probe. Its live-brain asserts stay owed a gate, per the dream.

`getThisMachine` rides here, at its first consumer. The `hint =` separator (F14) rides here too, with the block it renders.

## L4 — the grove link leaves git (F5)

| file | + | − | lines |
|---|---|---|---|
| `src/domain.operations/init/boots/setRepoActorBrainDir.ts` | 33 | 5 | 38 |
| `src/domain.operations/init/boots/setRepoActorBrainDir.integration.test.ts` | 174 | 5 | 179 |
| `src/domain.operations/init/boots/setRepoActorBrainDir.teammatePull.integration.test.ts` | 187 | 0 | 187 |
| `src/domain.operations/init/boots/asRepoActorBrainDirOutcome.ts` | 5 | 1 | 6 |
| `src/domain.operations/init/boots/asRepoActorBrainDirOutcome.test.ts` | 9 | 1 | 10 |
| `src/domain.operations/init/boots/syncBootsForBrainDirs.ts` | 4 | 0 | 4 |
| `src/domain.operations/init/boots/syncAndReportBrainDirBoots.ts` | 2 | 1 | 3 |
| `src/domain.operations/boot/asBrainDirSyncReportLines.ts` | 49 | 13 | 62 |
| `src/domain.operations/boot/asBrainDirSyncReportLines.test.ts` | 62 | 0 | 62 |
| `src/domain.operations/boot/__snapshots__/asBrainDirSyncReportLines.test.ts.snap` | 11 | 0 | 11 |
| `.agent/.actors/actor.via.repo=ambient/brain/.claude/.gitignore` | 0 | 1 | 1 |
| `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json` (removed) | 0 | 1 | 1 |
| `blackbox/cli/upgrade.default-actor-migration.journey.acceptance.test.ts` | 1 | 2 | 3 |
| `.agent/repo=.this/role=any/briefs/define.brain-dir-repo-vs-actor.md` | 1 | 1 | 2 |
| **total** | | | **569** |

**clamps:**
- `setRepoActorBrainDir.integration.test.ts`: the untrack, the steady state that never writes, and the temp-home grove.
- `teammatePull`: the refused pull and its cure.
- `asBrainDirSyncReportLines [case6]` and `[case7]`.

## L5 — the check that bites, plus the route record (wish outcome 3)

**why last of the code:**
- `committedConfigNamesNoMachine` `[case1]` needs L3's glob in the committed file.
- `[case2]` needs L4's untracked grove link.
- `init.hooks [case9]` snaps both trees at once.
- landed earlier, any of the three would be red by design.

| file | + | − | lines |
|---|---|---|---|
| `src/.test/committedConfigNamesNoMachine.integration.test.ts` | 129 | 0 | 129 |
| `blackbox/cli/init.hooks.acceptance.test.ts` | 167 | 0 | 167 |
| `blackbox/cli/__snapshots__/init.hooks.acceptance.test.ts.snap` | 14 | 0 | 14 |
| `.behavior/…/0.wish.md` | 27 | 0 | 27 |
| `.behavior/…/1.vision.experience.case={1,2,3,4,5,_}.*.md` (6 files) | 250 | 0 | 250 |
| `.behavior/…/1.vision.experience.dimensions.md` | 71 | 0 | 71 |
| `.behavior/…/1.vision.yield.md` | 146 | 0 | 146 |
| `.behavior/…/5.1.execution.from_vision.yield.md` | 44 | 0 | 44 |
| `.behavior/…/5.3.verification.yield.md` | 77 | 0 | 77 |
| `.behavior/…/.fulcrums/inventory.of=fulcrums.*.md` (15 files: `_` + F1–F14) | 450 | 0 | 450 |
| `.behavior/…/blocker/5.3.verification.md` | 17 | 0 | 17 |
| `.behavior/…/dreams/*.md` (5 links) | 5 | 0 | 5 |
| `.behavior/…/pr.body.md` | 60 | 0 | 60 |
| `.dream/v2026_*.md` (5 files) | 170 | 0 | 170 |
| `.agent/repo=.this/role=any/briefs/howto.clear-a-stale-git-index-lock.md` | 17 | 0 | 17 |
| **total** | | | **1644** |

The fulcrums F15–F17 (this plan's calls) join the inventory here. Those 4 summary rows and 3 entry files add about 40 lines, which is 0.4 min.

## L6 — the route machinery

| file | + | − | lines |
|---|---|---|---|
| `.behavior/…/{1.vision,5.1.execution.from_vision,5.3.verification}.guard` | 676 | 0 | 676 |
| `.behavior/…/{1.vision,5.1.execution.from_vision,5.3.verification}.stone` | 392 | 0 | 392 |
| `.behavior/…/{1.vision,5.1.execution.from_vision,5.3.verification}.stamp` | 209 | 0 | 209 |
| `.behavior/…/.route/passage.jsonl` | 281 | 0 | 281 |
| `.behavior/…/refs/template.[feedback].v1.[given].by_human.md` | 27 | 0 | 27 |
| `.behavior/…/{.bind,.route}/*.flag` (2) | 4 | 0 | 4 |
| `.behavior/…/{.route,.reviews/peer,review/self}/.gitignore` (3) | 11 | 0 | 11 |
| **total** | | | **1600** |

This is template copy and a machine-written ledger. A reviewer reads it to confirm the passage, never to grade it. It lands last because it records the route that L5's record explains (F17).

---

## .how each layer gets its tree (when a seat frees)

1. Branch from `origin/main`, after the prior layer merges.
2. Run `git checkout c8e9aa99 -- <the layer's files>`, so each file's content is byte-identical to the green #717 head.
3. Run the layer's own unit and integration suites locally. Ci runs acceptance.
4. Commit, push, and `--watch` to green.
5. The body names its layer, its dependency, and the #717 cases it carries.

**the one seam to watch:**
- `settings.of.repo.json` is re-rendered by `rhx init` and by the role bump.
- on the L3 tree, take #717's version whole, and confirm the diff vs main is the one exclude line.

## .fulcrums this plan best-guessed

| case | call | rework | confidence |
|---|---|---|---|
| F15 | review time is linear in changed lines, calibrated to the director's 63 min; a 2× code weight is the margin check | clean | 75% |
| F16 | the rule brief lands in L2, beside the base libs, before any code that cites it | clean | 85% |
| F17 | the route splits into its record (L5, with the check that closes the wish) and its machinery (L6, last); together they are 33 min, over the bar | clean | 70% |
