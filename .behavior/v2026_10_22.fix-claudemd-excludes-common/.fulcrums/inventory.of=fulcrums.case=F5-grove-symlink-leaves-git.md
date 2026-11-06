# F5 — the tracked grove symlink leaves git, in this pr

- fork: leave `settings.of.grove.json` tracked · gitignore it and untrack it here
- the defect: the repo actor's `settings.of.grove.json` was a tracked symlink whose target is
  `/home/<user>/.claude/settings.json` — the machine-name leak the wish forbids, in a link target
  rather than a config value. at HEAD it read `/home/vlad/.claude/settings.json`
- why not defer: `rule.forbid.deferrals-short-of-a-dedicated-pr` — the fix is one allowlist line,
  one retired line and one index removal, no massive refactor
- taken: untrack it. `BRAIN_DIR_GITIGNORE_LINES` in
  `src/domain.operations/init/boots/setRepoActorBrainDir.ts` drops `!/settings.of.grove.json`, and
  the retired list carries it so a prior allowlist converges. the same sync then drops the link
  from git's index (`delGitIndexPaths`, forced: each box relinks it, so its staged entry differs
  from both the file and HEAD), so every repo that tracked it untracks it on its next `rhx init`
  or `rhx upgrade`, not only this one. `settings.json →
  settings.of.grove.json` (relative, no machine) stays tracked. every layout findsert (`rhx init`,
  `rhx enroll`) already relinks the grove per box, and drops both arrows on a box with no grove
  (`setBrainDirSettingsLayout` `[case4]`), so naught depended on the link in git
- rework: clean — revert = re-add one allowlist line and re-track the link
- confidence low because: it narrows the wisher's 2026-09-29 call ("the repo actor commits the
  settings names") by one name. a fresh clone that launches a bare, un-aliased `claude` before any
  `rhx init` or `rhx enroll` meets `settings.json` as an arrow with no target, so the grove's box
  defaults do not apply to that one launch
- cost to a teammate, measured: a box that relinked the tracked link holds a local change to a
  path the untrack commit deletes, so `git pull` refuses. the cure is `git checkout -- <link>`, then
  pull; the next `rhx init` relinks it, ignored, and git stays clean. a teammate whose box syncs
  with the fix before the pull meets no refusal at all (`teammatePull` `[t3]`). the pr body and the
  `🧠 untracked` report row both name the cure
- the sync reads the index first (a read takes no lock), so the steady state never writes it; the
  `🧠` report names each untracked link, so the staged deletion never rides into a commit unseen
- enroll does not untrack: it runs on every launch, and an index write there would race the
  human's own git. a repo that still tracks the link sees it churn on enroll until one
  `rhx init` or `rhx upgrade` lands and its deletion is committed
- where: `src/domain.operations/init/boots/setRepoActorBrainDir.ts`; clamps
  `setRepoActorBrainDir.integration.test.ts` `[case1][t0]`, `[t3]`, `[t4]`, `[t5]`, `[t6]`;
  `delGitIndexPaths.integration.test.ts`; `setRepoActorBrainDir.teammatePull.integration.test.ts`;
  repo scan `committedConfigNamesNoMachine` `[case2]` (red while the link is in the index)
- verdict: —
