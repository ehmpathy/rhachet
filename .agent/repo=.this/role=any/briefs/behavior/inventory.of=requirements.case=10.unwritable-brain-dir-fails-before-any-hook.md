# requirement: a brain dir init cannot write fails loud before any hook lands

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx init --roles …` (and `rhx upgrade`) on a repo whose actor brain dir — the dir `<repo>/.claude`
reaches — cannot be written, or whose files a role init must write cannot be written, fails loud
with an error that names the path and the fix. it fails BEFORE any role's init runs, so no role's
hook lands in `settings.of.repo.json`.

## .clamp

`assertRepoActorBrainDirReadyForRoleInits` runs after the layout step and before the first role
links, in both `invokeInit` (`--roles`) and `execUpgrade`. it probes the dir with a create, and
`settings.of.repo.json` with an open-for-write that creates naught
(`assertRepoActorBrainDirWritable`); it also refuses a `<repo>/.claude` that lands elsewhere
(`assertRepoBrainDirSymlinkLandsHere`). each refusal is a `ConstraintError`, exit 2, that names the
path, the errno, the owner, the mode and the fix.

## .proof

- `src/domain.operations/init/boots/assertRepoActorBrainDirWritable.integration.test.ts` — a dir at
  0o555 [case2] and a `settings.of.repo.json` at 0o444 [case3] refuse and change no byte
- `blackbox/cli/init.preflight.acceptance.test.ts` [case1] [case2] — `rhx init --roles … --hooks`
  refuses with no role linked and no hook synced
- `blackbox/cli/upgrade.acceptance.test.ts` [case18] — the same two refusals on `rhx upgrade`.
  owed: its red→green run, held on a host keyrack AWS unlock (2026-10-25)

## .source

the director, 2026-10-25, for `ehmpathy/rhachet#657`: on a cloud grove a fresh tree's postinstall
init failed with `Permission denied` at the mechanic init, after four other roles' hooks had landed.
