# F10 — the keyrack vault fakes in `unlockKeyrackKeys` predate this pr, and stay

## .the fork

review r3 blocker.1 cites `rule.require.external-contract-integration-tests`: every vault in
`unlockKeyrackKeys.integration.test.ts` is an injected fake, so add a real call per vault service
(1password, aws sso, github secrets, the os keychain) here, or leave the file's vault map as it is.

## .taken, and why at the time

leave it. this pr's edit to that file is the clock bracket on four TTL rows (F7) and naught else:
`git diff origin/main` on the file shows 37 added and 27 removed lines, and not one of them names a
vault adapter or the `vaultAdapters` map. the fakes, and the header that argues for them, are on
`origin/main` today.

- the subject of the file is the unlock orchestration (which keys, which TTL, which order), and it
  injects each vault through its context, so the fakes are dependency injection, not a module mock
- the real vault contracts are the job of each adapter's own suite (`vaultAdapterAwsParams`,
  `getOneKeyrackAwsParam` call aws for real), not of the orchestrator
- a real 1password, github secrets or keychain call per vault is a new test corpus with its own
  credentials and its own mutation risk on a human's store: work of its own, owed to a pr of its
  own, if the council wants it

## .rework — clean

naught in this pr depends on the choice.

## .confidence — 80%, and why it is not higher

the rule reads as unconditional, and a council may want the gap closed now that a reviewer found
it. the defense rests on scope, since the touched lines never reach the vault map.

## .where

`src/domain.operations/keyrack/session/unlockKeyrackKeys.integration.test.ts`

## .verdict

unruled.
