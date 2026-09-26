# F36 — the upgrade boot exit clamp is deferred

## .fork

`rhx upgrade` re-renders every brain dir boot after its role re-link, skips the hook sync when the
default render failed, and exits 2 or 1 by the sync's own rule. whether those three owe their own
clamp on the upgrade path, or ride on the `invokeInit` clamps of the same rule and gate.

| option | |
|---|---|
| a. defer: a dream | the rule and the gate are the same code `invokeInit` [t1] [t2] [t4] clamp; only the upgrade forward is bare |
| b. clamp now | a test that reaches the boot sync through `rhx upgrade` itself |

## .verdict — RESOLVED, (b)

the premise of (a) was that a hermetic clamp needs an injected installer in `execUpgrade`. it does
not: `upgrade.acceptance` [case12] already runs a real `--roles ehmpathy/mechanic` install against
the `with-roles-linked` fixture, and that path reaches the boot sync.

[case12.1] seeds a `settings.json` collision between `<repo>/.claude` and the default dir, then runs
the same upgrade. it pins:

- exit 2
- stderr `✗ boot.md (default) not written:` and `└─ hint: merge`
- no `🔭 search for linked roles with hooks` — the hook sync is skipped
- the default dir `settings.json` left as found

teeth: with the exit forward in `invokeUpgrade` and the `defaultRendered` gate in `execUpgrade`
removed, the exit and hook-sync assertions went red; restored, green.

a `.claude` file (the `invokeInit` [t2] setup) does not reach the sync on upgrade: the mechanic
role's own `init.claude.sh` fails first, as an unclassified exit 1. hence the collision setup.

the dream `v2026_09_24.feat.clamp-the-upgrade-boot-exit-with-a-stub-installer` is retired.

## .where

- `blackbox/cli/upgrade.acceptance.test.ts` [case12.1]
- `src/contract/cli/invokeUpgrade.ts` — the exit line
- `src/domain.operations/upgrade/execUpgrade.ts` — the boot sync + the gate
