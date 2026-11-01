# requirement: role inits meet the split layout

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a role init that writes through `<repo>/.claude` writes into the split layout, and what it writes
stays.

- every brain dir holds `settings.of.repo.json` as a real file: `{}` when absent, an extant one never
  touched, a symlink or a dir at that name refused before any change. the same for every actor
- `rhx init --roles …` and `rhx upgrade` put the repo actor's brain dir in the layout BEFORE the
  role inits run: the legacy repo actor dir moves, `<repo>/.claude` links to the brain dir, and the
  layout findsert runs. the boot render, the delta re-derive, the active actor sweep and the hook
  sync stay after the inits
- so a permission init that adds its allows to `settings.of.repo.json` (the
  `ehmpathy/rhachet-roles-ehmpathy#895` design) finds the file in place, and after one `rhx init` or
  one `rhx upgrade` its allows sit in the repo actor's `settings.of.repo.json`, `settings.json` is the
  grove arrow, and naught it wrote is dropped
- bare `rhx init` and `rhx init --hooks` run no role init, so they take no early layout step

## .clamp — landed 2026-10-09

- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` — `setBrainDirSettingsLayoutWithinLock`
  refuses a non-file `settings.of.repo.json` (`ConstraintError`), then findserts `{}` when absent
- `src/domain.operations/init/boots/setRepoActorBrainDirLayout.ts` — the legacy move, the
  `<repo>/.claude` link and the layout findsert, as one step; `setRepoActorBrainDir` calls it after
  its render. `setRepoActorBrainDirLayoutBeforeInits` defers a classed fault to the boot sync, which
  re-runs the step and reports it
- `src/contract/cli/invokeInit.ts` — the step runs when `--roles` is given, before
  `initRolesFromPackages` / `setIncrementalRoles`
- `src/domain.operations/upgrade/execUpgrade.ts` — the step runs before `initRolesFromPackages`
- `src/contract/cli/invokeRolesInit.ts` — `rhx roles init` runs the step before `execRoleInits`,
  when the role has inits and the cwd is in a git repo (loaded lazily)
- `src/domain.operations/init/boots/syncBootsForBrainDirs.ts` — `symlinkPrior` keeps the early
  step's link effect in the brain dir report
- `src/domain.operations/brains/getBrainsDetectedAndSupplied.ts` — with `settings.of.repo.json` in every
  repo actor brain dir, the auto-detected hook sync keeps only the brains an installed package
  supplies, so a repo with no claude adapter never fails on claude

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` [case1] — a fresh brain dir gets `settings.of.repo.json` `{}`; [case8] — an extant one is untouched; [case9] — a symlink is refused and naught changes | ✅ green, 2026-10-12 |
| integration | `src/domain.operations/init/boots/setRepoActorBrainDirLayout.integration.test.ts` [case1] — a fresh repo gets the repo actor dir, the `<repo>/.claude` link, the grove arrows and `settings.of.repo.json` `{}`, and a rerun is a no-op; [case2] — a legacy `actor.via.slug=.default` dir moves to `actor.via.repo=ambient`; [case3] — an extant `settings.of.repo.json` is untouched | ✅ green, 2026-10-12 |
| integration | `src/contract/cli/invokeRolesInit.integration.test.ts` [case3] — `rhx roles init` on a legacy repo: the init finds `settings.of.repo.json` in place, its write holds, and `settings.json` is the grove link | ✅ green, 2026-10-13 |
| integration | `src/contract/cli/invokeInit.integration.test.ts` [case2][t0] — a repo whose `<repo>/.claude` is a real dir, `rhx init --roles mechanic` with the real `rhachet-roles-ehmpathy` mechanic init (1.40.0, which writes by name): the dir migrates first, the init's permissions land in `settings.of.repo.json`, and `settings.json` is the grove arrow | ✅ green, 2026-11-01 |
| integration | `src/domain.operations/brains/getBrainsDetectedAndSupplied.integration.test.ts` [case1]–[case3] — claude kept when supplied or faulted, skipped when unsupplied | ✅ green, 2026-10-12 |
| acceptance | `blackbox/cli/role-inits-meet-split-layout.acceptance.test.ts` [case1] — a legacy repo, one `rhx init --roles tester --hooks`: the init's allow and the synced hooks both sit in `settings.of.repo.json`, `settings.json` is the arrow, home untouched; [case2] — a migrated repo with no hook sync gets `settings.of.repo.json`; [case3] — the same as [case1] via one `rhx upgrade` | ✅ green, 2026-10-12 |

the tester init in the acceptance proof refuses unless `<repo>/.claude` is already the link and
`settings.of.repo.json` is already present, so a regression of the order or the guarantee fails the
command itself.

## .source

the `ehmpathy/rhachet-roles-ehmpathy#895` driver's design (mechanic permission hooks on the split
`.claude/` layout, q1 → write `settings.of.repo.json` by name) plus the wisher's split layout,
2026-10-09.
