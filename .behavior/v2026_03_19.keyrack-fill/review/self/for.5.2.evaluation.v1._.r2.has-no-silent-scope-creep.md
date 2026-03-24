# self-review: has-no-silent-scope-creep (round 2)

## deeper verification: did i miss any scope creep?

let me look at the git diff more carefully. the first review identified failhide fixes as scope creep. but are there other changes i missed?

### re-examine the file list

from `git diff --name-only origin/main`, i see many files. let me categorize them:

**behavior artifacts (expected):**
- all `.behavior/v2026_03_19.keyrack-fill/` files — in scope

**core fill implementation (expected):**
- `src/domain.operations/keyrack/fillKeyrackKeys.ts` — in scope
- `src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts` — in scope
- `src/infra/withStdoutPrefix.ts` — in scope (needed for fill)
- `src/contract/cli/invokeKeyrack.ts` — in scope (add fill subcommand)

**test fixtures (expected):**
- `src/.test/infra/mockPromptHiddenInput.ts` — in scope
- `src/.test/infra/withSpyOnStdout.ts` — in scope
- `blackbox/cli/keyrack.fill.acceptance.test.ts` — in scope

**keyrack briefs (documentation, non-issue):**
- all `.agent/repo=.this/role=keyrack/briefs/` files — documentation

**failhide fixes (scope creep, documented):**
- vaultAdapterAwsIamSso.ts
- withTestSshAgent.ts
- createKeyrackDaemonServer.ts
- killKeyrackDaemon.ts
- getAllKeyrackDaemonSocketPaths.ts
- connectToKeyrackDaemon.ts

**other changes — need investigation:**
- `src/domain.operations/keyrack/asKeyrackKeySlug.ts` — slug construction
- `src/domain.operations/keyrack/getAllKeyrackSlugsForEnv.ts` — env slug lookup
- `src/domain.operations/keyrack/genContextKeyrackGrantUnlock.ts` — unlock context
- `src/domain.operations/keyrack/genKeyrackHostContext.ts` — host context
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts` — grant lookup
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts` — unlock logic
- `src/domain.operations/keyrack/setKeyrackKey*.ts` — set logic
- `src/access/daos/daoKeyrackHostManifest/` — DAO changes

### are these "other changes" scope creep?

let me think about why these files were modified:

1. **asKeyrackKeySlug.ts** — fill needs to construct slugs to check if keys exist
2. **getAllKeyrackSlugsForEnv.ts** — fill reads keys from manifest for a given env
3. **genContextKeyrackGrantUnlock.ts** — fill unlocks keys to verify
4. **genKeyrackHostContext.ts** — fill needs host context for each owner
5. **getKeyrackKeyGrant.ts** — fill gets keys to verify roundtrip
6. **unlockKeyrackKeys.ts** — fill unlocks keys
7. **setKeyrackKey*.ts** — fill sets keys

these are all operations that fill orchestrates. if they were modified, why?

**likely scenarios:**
- bug fixes discovered while integration test of fill
- API changes to support fill's requirements
- test coverage additions

i need to check the actual diffs to know if these are scope creep.
