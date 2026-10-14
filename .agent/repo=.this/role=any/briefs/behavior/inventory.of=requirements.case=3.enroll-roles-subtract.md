# requirement: `rhx enroll claude --roles -driver` drops driver

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx enroll claude --roles -driver` enrolls a clone with the ambient roles minus `driver`. the
short alias `-r -driver`, the comma form `--roles -driver,+architect` and the quoted space form
`--roles "-driver +architect"` do the same.

## .why

it is how a human enrolls a peer that must never drive their route
(`rule.forbid.peer-clones-that-carry-the-driver-role`). a parse that drops the `-` turns a reader
into a driver, in the human's own worktree.

## .clamp

- `getPreprocessedRoleArgv` encodes a `-role` token inside a `--roles` run past commander
- `getRoleDeltaTokens` decodes it back before the delta grammar is parsed

## .proof — proven

`blackbox/cli/enroll.acceptance.test.ts`: [case2] `--roles -driver` drops driver; [case5] comma
mixed; [case6] quoted space mixed; the `-r -driver` short-alias case. green 156/156 (2026-09-28).

## .source

the wisher, 2026-10-02 (`v2026_09_26.fix-config-blend` seed 25): *"verify that
`rhx enroll claude --roles -driver` will still work"*.
