# F6 — a groveless box keeps the tracked arrows; only the `.home/` link drops

- fork: on a box with no `~/.claude/settings.json`, drop every grove name (the prior layout) · keep
  the two tracked arrows and drop only the `.home/` link · untrack `settings.json` too
- why it is in this pr: with the grove arrow tracked again (F5), a drop of every grove name would
  delete two tracked files on any groveless box — a fresh ci box first — and break the clean
  `git status` this pr promises
- taken: keep the tracked arrows, drop only `.home/.claude/settings.json`. the chain then ends at an
  absent name inside the brain dir, so a write through it lands in the ignored `.home/`, never in the
  human's home; claude reads a `settings.json` with no target as absent, as it read no `settings.json`
  before
- rework: clean — one branch in `setBrainDirSettingsLayout.ts`
- confidence 80% — low because: it reverses the layout's "no arrow to an absent file" rule for the two
  tracked names, a layout call the commander has not ruled on
- where: `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`; clamps
  `setBrainDirSettingsLayout.integration` `[case4]`, `[case4b]`; `enroll.acceptance` `[case2c][t1]`;
  `init.hooks.acceptance` `[case9]` (a groveless box, the grove arrow stays tracked)
- verdict: —
