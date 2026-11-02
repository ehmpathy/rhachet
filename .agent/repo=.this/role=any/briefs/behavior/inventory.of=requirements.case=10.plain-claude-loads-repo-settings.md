# requirement: a plain `claude` at the repo root loads the repo actor's settings

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a `claude` that rhachet did not spawn — launched at the repo root, with no `$CLAUDE_CONFIG_DIR` and no
enroll — loads the repo actor's `settings.of.repo.json`: its allows and its hooks.

- the repo actor's brain dir holds `settings.local.json -> settings.of.repo.json`, a relative arrow, so
  claude's local layer (`<repo>/.claude/settings.local.json`) reaches the repo's settings
- a plain session then loads the same set an enrolled one loads: the grove at low rank, the repo's
  settings at high rank
- an enrolled clone still reads no local layer (requirement case 9 holds)

the invariant behind it: `define.invariant.unenrolled-claude-is-ambiently-enrolled.md` — a session the
repo did not explicitly enroll is still ambiently enrolled by the repo.

## .clamp

`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` findserts the arrow in every actor
dir; a real file at the name is REPLACED.

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` [case1], [case7] — the arrow is findserted, and a real `settings.local.json` is replaced | ✅ green, 2026-10-17 |
| acceptance | `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` [case2] — a real plain claude at the repo root runs the repo's allowed probe with no prompt, and the repo role's boot hook fires | ✅ green, 2026-10-16 · 🟡 rerun owed: the suite's tui waits changed 2026-10-17, and that run met an api key with no credit · 🟡 since 2026-11-02 the case runs only under `LIVE_API=true` (no credential is funded for ci), so ci skips it; the rerun needs a funded key |

## .source

the wish of `.behavior/v2026_10_15.fix-split-layout-local-settings-arrow`, 2026-10-15: a plain session
on the split layout loaded none of the repo actor's allows or hooks.
