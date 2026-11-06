# F6 — a groveless box deletes the tracked `settings.json`; deferred

- fork: fix it in this pr (keep the arrow on a groveless box, or untrack `settings.json` too) ·
  defer it to a dream
- taken: defer. the gap predates this pr, names no machine, and its fix reverses a layout decision
  (`define.brain-dir-layout-is-one-for-every-actor`: no arrow to an absent file) — not clean
- rework: clean either way — one name added to `BRAIN_DIR_NAMES_UNTRACKED`, or one branch dropped
  in `setBrainDirSettingsLayout.ts`, plus a groveless clamp
- confidence 80% — low because: a fresh ci box is the likeliest groveless box, and this pr's
  promise is a clean `git status`; a reviewer may read the gap as inside that promise
- where: `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`; dream
  `.dream/v2026_10_22.fix.groveless-box-deletes-tracked-settings-json.md`
- verdict: —
