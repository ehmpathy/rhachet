# requirement: a `<repo>/.claude` link that aims elsewhere refuses before any role links

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx init --roles …` (and `rhx upgrade`) on a repo whose `<repo>/.claude` link lands anywhere but
the repo actor brain dir, or dangles, refuses before the first role links. the refusal names both
realpaths and the fix, so the tree that meets it diagnoses itself. no role writes through the link.

## .clamp

`assertRepoBrainDirSymlinkLandsHere`, run by `assertRepoActorBrainDirReadyForRoleInits` after the
layout step and before the first role links, in `invokeInit` and `execUpgrade`. the placement before
the role loop is fulcrum F6, open to the commander.

## .proof

- `src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere.integration.test.ts`
  [case4] [case5] [case6] — elsewhere, a dangle, and a file each refuse
- `blackbox/cli/init.preflight.acceptance.test.ts` [case2] — `rhx init --roles …` refuses, the link
  is untouched, and the rerun after the fix passes
- `blackbox/cli/upgrade.acceptance.test.ts` [case18] [t1] — the same refusal on `rhx upgrade`
- owed: the red→green run of the upgrade case, held on a host keyrack AWS unlock

## .source

vision case 4 of `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link`.
