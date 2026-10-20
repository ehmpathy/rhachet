# requirement: a brain dir holds one answer, rhachet's — no kept-aside copies

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a brain dir holds ONE answer, and it is rhachet's: the derived `settings.of.repo.json` and the grove
arrow chain (`settings.json → settings.of.grove.json → ~/.claude/settings.json`), plus the local arrow
`settings.local.json → settings.of.repo.json` (`case=10`).

- a real file where an arrow belongs — `settings.json` from a role init's temp + rename, or
  `settings.of.grove.json` from a `/model` or `/config` in a clone — is replaced by the arrow. its
  content is not merged into `settings.of.repo.json`, and it is not kept aside
- no `settings.forked.<iso>.json` or `settings.grove.forked.<iso>.json` stays in a brain dir; one an
  earlier run left is removed at the next layout findsert
- no report renders a `kept aside` row
- the same rule holds for every actor

## .consequence, closed by `ehmpathy/rhachet-roles-ehmpathy#895`

a role init that writes its allows to `settings.json` loses them at the next findsert. mechanic's
`init.claude.permissions.sh` now writes `settings.of.repo.json` by name, which `case=8` guarantees is
present and in the layout before any role init runs (`blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap`
[case1], 2026-10-19).

## .clamp — landed 2026-10-07

- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` — the layout findsert only
  findserts arrows: a real file at an arrow name is swapped for the arrow (`setSymlinkSwapped`), and
  every `settings(.grove)?.forked.*.json` is removed. it findserts `settings.of.repo.json` as `{}`
  when absent (never the replaced content) — always, since 2026-10-09 (`case=8`)
- the absorb merge and every kept-aside render are deleted: `asSettingsAbsorbedFromFork`,
  `asSettingsLayoutKeptAsideRows`, `asSettingsKeptAsideNoticeLines`, and the `kept aside` heads of the
  hook sync, actor sync, brain dir sync and enroll reports
- `withBrainDirSettingsShield.ts` folds only rhachet's own hook writer output; a writer that leaves
  `settings.json` as json that is not an object fails loud once the arrow is restored

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` [case2], [case3], [case4b], [case5], [case6] — a real `settings.json` or `settings.of.grove.json` is replaced by the arrow, `settings.of.repo.json` is byte-identical or seeded `{}`, and no `.forked.` file appears; [case7] — extant fork copies are removed; since 2026-10-16 a real `settings.local.json` is replaced by its arrow too, since `settings.local.json` became an arrow name (`case=10`, seed S1 of `v2026_10_15.fix-split-layout-local-settings-arrow`) | ✅ green 2026-10-19 |
| integration | `src/domain.operations/actor/enrolled/withBrainDirSettingsShield.integration.test.ts` [case4] — a broken writer output fails loud, the repo settings stay, and no `.forked.` file appears | ✅ green 2026-10-07 |
| integration | `src/domain.operations/enroll/setActorSettingsDerived.integration.test.ts` [case2] — a hash actor's real `settings.json` is replaced, never kept aside or merged | ✅ green 2026-10-07 |
| acceptance | `blackbox/cli/upgrade.default-actor-migration.journey.acceptance.test.ts` [t1], [t2] — a legacy `settings.json` moves, then the arrow replaces it; no `.forked.` file, on the first run or the re-run | ✅ green 2026-10-07 |

## .source

the wisher, 2026-10-07: "we dont want 'kept aside'. only one answer." then "our answer."
supersedes the absorb path and the 2026-09-28 keep-aside call.
