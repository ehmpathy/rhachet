# F12 — extant test design in a file this pr touched only for its temp path stays out of scope

## .the fork

two peer lanes (mech-external-contracts r003 blocker.1–2, mech-test-scope-purity r009 blocker.1
and nitpick.2) cite a stub `gh` on PATH in `keyrack.vault.osSecure.githubApp.acceptance.test.ts`
and `keyrack.aws-params.githubApp.acceptance.test.ts`, and stub `age` / `apt-get` / `sudo` in
`install.age.acceptance.test.ts`. the diff against `HEAD` shows the stubs are extant: this pr
changed one mask line in each keyrack suite (`TEST_REPO_PATH_PATTERN`, since the fixture dirs now
mint under the test-fns root) and the farm's temp root in the age suite. the pr may swap the
stubs for a real `gh` against a local stand-in, as the githubSecrets suite did, or leave them.

## .taken, and why

leave them, and catch the swap as a dream. the wish bounds this behavior to how the acceptance
suite shares the box: its width, its priority, its leftovers. a swap of the `gh` boundary in two
keyrack suites is a contract change to what those suites prove, with its own review and its own
stand-in shapes (the github app token mint, the app installation lookup) that
`genFakeGithubApiServer` does not yet serve. the mask edits the pr did make leave the stubs
exactly as they were; neither suite asserts less than before.

## .rework

clean — a follow-up pr that mirrors the githubSecrets swap (`genFakeGithubApiServer` +
`asGhSwapEnv`) per suite, with no change to this pr's code.

## .confidence — 80%, why not higher

`rule.forbid.acceptance.mocks` makes an undocumented binary stub a blocker wherever it sits, and a
reader may hold that a file this pr touched must leave clean. the counter: a mask line is a
caller of the temp-path contract, never the gh boundary, and a scope that grows to every rule a
touched file breaks would pull the whole keyrack test design into #748.

## .where

- `blackbox/cli/keyrack.vault.osSecure.githubApp.acceptance.test.ts` (`MOCK_GH_CLI_DIR`, [case2] inline gh)
- `blackbox/cli/keyrack.aws-params.githubApp.acceptance.test.ts` (`MOCK_GH_CLI_DIR`)
- `blackbox/cli/install.age.acceptance.test.ts` (`genOnePathWithStubs`)
- the dream: `.dream/v2026_11_16.dirt.keyrack-github-app-suites-stub-the-gh-binary.md`
