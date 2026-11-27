# F32 — the extant unit mocks move to injection in their own pr

## .the fork

5.3 i001 r009 blocker.1 and blocker.2 (nitpick.2 too): `unlockKeyrackKeys.test.ts` mocks the daemon sdk, and `vaultAdapterAwsConfig.test.ts` and `mechAdapterAwsSso.test.ts` mock `node:child_process`, `node:fs` and the sso sdk. `rule.forbid.unit.remote-boundaries` forbids a mock in a unit suite. each mock predates this branch. the branch edited two of the factories: the sdk mock now answers `renewable`, and `execFile` routes through the extant `exec` mock.

- **a** — inject the daemon client and the aws cli runner through each operation's context, here, and drop the `jest.mock`s
- **b** — keep the extant mocks, and plan the injection as its own pr

## .taken

b. (a) changes the context contract of `unlockKeyrackKeys` (every unlock caller) and of the `aws.config` vault adapter (the vault adapter contract every vault shares), and it rewrites suites of ~1,300 and ~1,400 lines. that is a massive refactor of a core contract, the one case `rule.forbid.deferrals-short-of-a-dedicated-pr` sends to a dedicated pr. this branch adds no new mock: each new renew operation takes its collaborator by context (`getOneAwsSsoRoleCredentials` `execAwsCli`, `getOneAwsSsoSessionProof` `proveViaSdk`).

## .the dedicated pr

- **title** — `refactor(keyrack): inject the daemon client and the aws cli, so unit suites drop jest.mock`
- **diff** — `unlockKeyrackKeys` takes `daemon: { unlock, findsert }` in its context. `vaultAdapterAwsConfig` and `mechAdapterAwsSso` take `execAwsCli` (the runner `getOneAwsSsoRoleCredentials` already defines) and a file reader. each `jest.mock` of those three suites becomes an injected fake
- **bound** — no behavior change; every extant case keeps its assert

## .rework

dirty for this pr (two shared contracts, two large suites); clean as its own pr.

## .confidence — 75%, why not higher

the branch did touch both factories, and a reviewer can read that as an adoption of the mock.

## .where

- `src/domain.operations/keyrack/session/unlockKeyrackKeys.test.ts`
- `src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.test.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso.test.ts`

## .verdict

open — to the commander at the pr.
