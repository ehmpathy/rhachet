# F12 — the git read fixtures in three new integration tests stay per file

## .the fork

review r1 nitpick.2 (5.3, i002): `getAllPathsInGitIndex` and `runGit` are declared in
`delGitIndexPaths.integration.test.ts`, `setRepoActorBrainDir.integration.test.ts` and
`setRepoActorBrainDir.teammatePull.integration.test.ts`. extract one shared fixture under
`src/.test/infra/`, or keep each beside its test.

## .taken, and why at the time

keep each beside its test. the three are not one shape:

- `delGitIndexPaths` lists the whole index via its `runGit`, and passes the fixture identity per
  commit call
- `setRepoActorBrainDir` lists one pathspec (`ls-files -- <path>`) via a bare `execFileSync`
- `teammatePull` bakes the fixture identity into its `runGit`, for a clone and a pull

`rule.require.shared-test-fixtures` asks for extraction at a non-trivial shared shape; each copy is
three to six lines, and a shared fixture must carry the union of three call shapes. and the move
touches three integration suites whose rerun on the paved path needs the aws sso unlock, ruled out
on 2026-11-05 — so the extraction would ship unrun, for a nitpick.

## .rework — clean

one new file under `src/.test/infra/` and three import swaps; no prod code moves.

## .confidence — 75%, and why it is low

a fourth git-fixture test would tip the rule's "2+ files" bar past doubt; the call is a judgment
on three small, divergent copies.

## .where

`src/infra/delGitIndexPaths.integration.test.ts` · `src/domain.operations/init/boots/setRepoActorBrainDir.integration.test.ts` · `src/domain.operations/init/boots/setRepoActorBrainDir.teammatePull.integration.test.ts`

## .verdict

unruled.
