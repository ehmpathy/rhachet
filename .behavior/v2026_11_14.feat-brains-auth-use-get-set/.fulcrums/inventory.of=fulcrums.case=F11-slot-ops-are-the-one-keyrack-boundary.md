# F11 — the four slot ops are brain auth's one boundary to keyrack

## .the fork

the brain auth slot ops (`slot/get|set|del|getAll*`) import keyrack domain ops and the host
manifest dao, and `setBrainAuthAccount` imports `asBrainCliSpawnEnv` from enroll. two peer reviews
(r4, r5) asked that brain auth reach keyrack through a contract instead.

- **A** — keep the reach-in, confined to `account/slot/`, the one dir that names keyrack
- **B** — route through `src/contract/sdk.keyrack.ts`
- **C** — lift a keyrack slot facade into `domain.operations/keyrack/`, and call that

## .taken, why

**A**. B is an upward import: a domain op that imports the contract layer breaks
`rule.require.directional-deps`, and today only `src/contract/sdk.keyrack.ts` itself imports
keyrack's internals. A confines the tie to four files that a keyrack change would touch in one
place. the enroll import has precedent: `clone/pty/genBrainCliPtyClone.ts` and
`genBrainCliPlainClone.ts` import the same `asBrainCliSpawnEnv`, since every brain cli spawn
shares one env.

## .rework

clean for C: one facade op in keyrack, four slot ops repointed. no caller outside `slot/` changes.

## .confidence — 75%, why not higher

C may be what the reviewers mean by a contract; whether a facade earns its file for four callers
is a taste call.

## .where

- `src/domain.operations/brain/auth/account/slot/*`
- `src/domain.operations/brain/auth/account/setBrainAuthAccount.ts`

## .verdict

open.
