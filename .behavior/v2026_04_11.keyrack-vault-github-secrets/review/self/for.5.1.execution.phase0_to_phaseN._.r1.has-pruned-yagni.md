# self-review: has-pruned-yagni

## verdict: holds

all components were either explicitly requested or required by the extant interface contract.

## review

### wish requirements

from `0.wish.md`:
1. add vault `github.secrets` that sets keys into github secrets
2. get should failfast (write-only)
3. support status = locked if set
4. use interactive keyrack mechanism prompts for EPHEMERAL_VIA_GITHUB_APP
5. mock gh api in tests
6. verify stdout via snaps

### components reviewed

| component | required by | verdict |
|-----------|-------------|---------|
| `vaultAdapterGithubSecrets.ts` | wish #1 | necessary — implements the vault |
| `ghSecretSet.ts` | wish #1 | necessary — communicator for `gh secret set` |
| `ghSecretDelete.ts` | interface | necessary — `del` is required by `KeyrackHostVaultAdapter` interface (not optional) |
| `getGithubRepoFromContext.ts` | wish #1 | necessary — `gh secret set` requires `--repo` flag |
| test files | wish #5,6 | necessary — explicitly requested |

### potential concerns evaluated

**Q: is `del` method YAGNI since wish only mentions "set"?**

A: no. `KeyrackHostVaultAdapter` interface defines `del` as a required method (no `?`). all vault adapters must implement it. this is interface compliance, not YAGNI.

**Q: is `parseRepoFromRepositoryField` over-engineered with multiple format support?**

A: no. the formats supported (bare shorthand, github:, full URL, object form) are all standard npm package.json repository formats. supporting them is necessary for real-world usage.

**Q: is `validateGhAuth` in ghSecretSet.ts necessary?**

A: yes. fail-fast with clear error message is better than cryptic downstream failures from unauthenticated gh cli calls.

### no extras found

- no abstractions added "for future flexibility"
- no features added "while we're here"
- no optimization before knowing it was needed
- all code paths serve the wish or required interface contract

