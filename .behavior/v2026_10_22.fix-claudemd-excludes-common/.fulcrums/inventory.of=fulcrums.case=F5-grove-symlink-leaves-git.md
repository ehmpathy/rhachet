# F5 — the grove arrow stays tracked, box-neutral; only `.home/` names a box

- fork: untrack `settings.of.grove.json` · keep it tracked with a relative target, and move the
  one host path into a new untracked link
- the defect: the repo actor's `settings.of.grove.json` was a tracked symlink whose target is
  `/home/<user>/.claude/settings.json` — the machine-name leak the wish forbids, in a link target
  rather than a config value
- taken: keep it tracked, box-neutral (the commander's design on #717). the layout is
  `settings.json -> settings.of.grove.json -> .home/.claude/settings.json -> <home>/.claude/settings.json`.
  every arrow but the last is relative, so every box holds the same bytes; `.home/` is kept out of
  git by the brain dir's `/*` allowlist and findserted per box. the name `.home` mirrors `$HOME`, so
  the target reads as "this machine's home claude settings" (the wisher picked `.home` over `/.../home`
  and `@home`)
- the allowlist keeps `!/settings.of.grove.json`; the layout findsert rewrites an absolute grove arrow
  in place, so no teammate meets a refused pull and no index write is needed
- rework: clean — one name in `CLAUDE_SETTINGS_FILENAMES`, one arrow target in
  `setBrainDirSettingsLayout.ts`
- confidence 90% — low because: a `/model` or `/config` in a repo actor clone renames a fork over the
  tracked grove arrow, so it shows in `git status` until the next `rhx init` or `rhx enroll`
- where: `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`; clamps
  `init.hooks.acceptance` `[case9]` and `[case11]` (red with the grove aimed at the home again),
  `setBrainDirSettingsLayout.integration` `[case1]` and `[case5b]`, `setRepoActorBrainDir.integration`
  `[case3]`
- verdict: the commander's design, comment on #717 — box-neutral, only the home link untracked
