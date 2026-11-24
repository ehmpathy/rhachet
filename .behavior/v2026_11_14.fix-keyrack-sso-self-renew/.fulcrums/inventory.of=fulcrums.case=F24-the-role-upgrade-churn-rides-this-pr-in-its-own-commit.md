# F24 — the role upgrade churn rides this pr, in its own commit

## .the fork

i001 r008 nitpick.1, r009 nitpick.1 and r011 #12: the `rhx init` snapshots lost their `🪝 apply hooks` block, and husky hooks, `.gitattributes`, `boot.yml` and package bumps ride along. all of it is fallout of the route's first act, `rhx upgrade` (`rhachet-roles-ehmpathy` 1.39.7 → 1.42.0), which the yield classifies.

- **a** — revert the upgrade from this pr and ship it apart
- **b** — keep it here, and land it as its own commit on the rebase, so the renew commits read as the renew
- **c** — restore hooks-render coverage with a fixture role that declares a hook, in this pr

## .taken

b. the route ran on the upgraded roles, and the rebase onto main takes main's lock and resnaps `init.incremental` and `rhx.acceptance` anyway, so the churn is re-cut at the rebase. an upgrade commit apart from the renew commits gives the reader the split a asks for, with no revert of the tools the route was driven with. c is a coverage gap of the upgraded role package, not of the renew; it is the package owner's to restore.

## .rework

clean: drop the upgrade commit at the rebase, and re-run `rhx upgrade` in a pr of its own.

## .confidence — 80%, why not higher

the commit split rests on the rebase, which waits on the commit quota a human grants.

## .where

- `blackbox/cli/__snapshots__/rhx.acceptance.test.ts.snap`
- `blackbox/cli/__snapshots__/init.incremental*.snap`
- `.husky/*`, `.gitattributes`, `package.json`, `pnpm-lock.yaml`

never staged, in any commit of this pr: the host-local edits to `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json` (a symlink repointed to this host's home) and `settings.of.repo.json` (hooks from roles this host enrolls). each commit stages by path, never with `--unstaged include`.

## .the hook lines, measured

5.3 i001 r002 nitpick.1, r004 nitpick.1, r005 blocker.1 and r008 blocker.1 read the `rhx.acceptance` `[case5]` change (`🫧 no roles with hooks found`) as a possible regression in init's hook discovery. measured 2026-11-21:

- the installed `rhachet-roles-ehmpathy@1.42.0` `getArchitectRole.js` declares no `hooks` and no `onBoot`; only its docblock names hooks. so init now finds no hooks because the role has none, and the discovery code is unchanged
- the hooks-applied branch keeps its coverage: `apply hooks to brains` sits on 15 snap lines in other suites (e.g. `brain-dir-boot.journey.acceptance.test.ts.snap`), driven by fixture roles that declare hooks, which no package bump moves
- `[case5]` exists for the bare-sigil alias and its replay row, and those lines are unchanged

the `$COUNT` mask (r002 nitpick.3, r008 nitpick.1): the counts are those of the installed role package, not of a fixture, so they move on each bump. the mask keeps the alias and replay asserts stable across bumps, and the fixture-role suites still pin their exact counts.

at the rebase this commit takes main's `pnpm-lock.yaml`, and both snaps are re-cut against main's version. only count and dependency lines may move in that re-cut.

## .verdict

open — to the commander at the pr.
