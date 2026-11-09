# F7 — the role package bump rides this pr

## .the fork

the boot of this worktree required the upgraded role packages. `e743cd2e` bumps them in
`package.json` (`rhachet-roles-ehmpathy` 1.39.7 → 1.42.0, `rhachet-roles-bhrain`, `-bhuild`,
`-ghlitch`, `declapract*`), and `e645f592` resnaps the two init suites whose output the bump moves.
three 5.3 lanes (`ergo-contract-snapshots`, `mech-test-intent`, `behavior-experience-coverage`) ask
whether the resnap hides a regression, and whether it belongs in a clone fix.

- **A** — keep the bump and its resnap in this pr, named in the pr body as a ride-along
- **B** — split them into a separate `chore(deps)` pr, and rebase this fix onto it
- **C** — keep the bump, and repoint `rhx.acceptance` `[case5]` (`rhx init +architect`) at a role
  that still declares a hook, so its `apply hooks to brains → no changes needed` lines stay

## .the narrowed claim, round 5.3 i003

`enroll-verif-test-intent` (r012) is right that the 12 other sites pin hooks-apply in general, never
the `rhx init +<role>` alias path `[case5]` held. with the bump, that one path is unpinned until
B or C lands. it is still no regression of the code: the alias path runs, and it prints the hooks
block for the role it is given; 1.42.0's architect simply has no hook to print.

## .taken, and why at the time

A. the resnap moves no expected value to fit a broken output; the input moved. 1.42.0's architect
ships 53 briefs and declares no hook — its `getArchitectRole.js` reads *"no self-boot hook …
rhachet's `repo introspect` refuses a role that boots itself from a hook"*. the hooks-apply path
stays pinned by 12 snapshot sites in `init.full`, `init.hooks`, `init.hooks.boot-guard`,
`brain-dir-boot.journey` and `upgrade`. ci was green on the bump at `9e672810`. a split would hold
the fix behind a second pr for a change the boot already demanded.

## .verdict — ruled by the wisher, 2026-11-09

the rule: if the cure or its tests need the role-package bump, take C; if not, drop the bump from
#735, with no split tree.

they do not. `computeCloneInputState.ts` and every test this pr adds import naught from a
`rhachet-roles-*` package, and the only outputs the bump moved were the two init snapshots. so the
bump is dropped:

- `rhachet-roles-ehmpathy` 1.42.0 → 1.39.7, `-bhrain` 0.43.1 → 0.42.1, `-bhuild` 0.24.0 → 0.23.3,
  `-ghlitch` 0.4.0 → 0.3.0 — origin/main's pins, via `rhx set.package.upgrade --to`
- `prepare:rhachet` drops `achiever` and `telepath`, the two roles that arrived with the bump
- `settings.of.repo.json` is origin/main's bytes again (the bump's role hooks and entry points gone)
- the two init snapshots, resnapped by `path://` over each whole file with the old packages
  installed, came back byte-identical to origin/main: `git diff --stat origin/main` over both is
  empty. independent run, no resnap: 5 suites, 281 passed (`init.incremental`, `rhx.acceptance`,
  the `clone.say` files). unit, `path://clone`: 632 files, 5124 passed

kept, as not the role-package bump: `declapract` 0.13.27 / `declapract-typescript-ehmpathy` 0.50.0
(the husky files this pr carries are that practice's output, F3), `rhachet-brains-openrouter`
0.1.4, `npm run build &&` in `prepare:rhachet`, and the `rhachet-artifact-git` move to dev deps.

one host residue rides: `settings.of.grove.json` is the per-host arrow to `~/.claude/settings.json`,
rewritten by every `rhx init` on the host that runs it. this host's init set it to this host's home;
a revert to the prior host's path would cut this host's clones off from their own user settings.

## .rework

clean — a later split is a revert of two commits here and a re-apply in their own pr.

## .risk

low — dev dependencies and two init snapshots; no prod code, no credential.

## .confidence — 85%, and why it is not higher

the wisher may want routine bumps kept out of a fix pr, so the fix reads alone in the history.

## .where

- `package.json`, `pnpm-lock.yaml` (`e743cd2e`)
- `blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap`, `rhx.acceptance.test.ts.snap` (`e645f592`)
