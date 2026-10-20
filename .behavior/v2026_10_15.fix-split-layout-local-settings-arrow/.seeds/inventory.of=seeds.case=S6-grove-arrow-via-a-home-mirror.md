# seed S6 — the grove arrow reads the same on every box, via a `.home` mirror

## .said (2026-10-16)
> did we fix teh abspath in the settings.of.grove.json btw?

> all i want from settings.of.grove.json is for it to exist and show the symetry between of grove and of repo

> sick. what if we just make it then .home/ instead of ~
> that way theres no risk

> So .home becomes a real dir that mirrors only the one path we need, with a file symlink at the end:
> i'm with you now

## .settled
- `settings.of.grove.json` stays tracked, beside `settings.of.repo.json`, to show the two sources
- its target is the relative `.home/.claude/settings.json`, so the tracked string is identical on
  every box and names no user
- `.home` is a real dir (never an arrow to the home dir, so no link-follower walks into the home);
  its one leaf `.home/.claude/settings.json -> ~/.claude/settings.json` is the only machine-local
  entry, untracked by the brain dir's `/*` ignore
- every actor dir gets the same layout (F1, ruled the same day)

## .landed
- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`
- `src/_topublish/rhachet-brains-anthropic/src/hooks/constants.ts` (`groveHome`)
- `define.brain-dir-layout-is-one-for-every-actor`, `define.invariant.brain-config-grove-vs-repo`
