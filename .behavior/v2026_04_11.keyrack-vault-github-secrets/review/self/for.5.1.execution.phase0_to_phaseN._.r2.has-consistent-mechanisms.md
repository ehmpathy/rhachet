# self-review: has-consistent-mechanisms

## verdict: holds

reviewed extant patterns and confirmed new mechanisms follow established conventions or serve distinct purposes.

## detailed review

### getMechAdapter pattern

**observation:** `getMechAdapter` function appears in multiple vault adapters:
- os.secure
- os.direct
- 1password
- aws.config
- github.secrets (new)

**verdict:** consistent with established pattern

**rationale:**
- each vault defines its own local mechanism registry
- each vault may support different mechanism subsets
- 1password has `PERMANENT_VIA_REFERENCE` that others don't
- local functions avoid tight inter-vault dependencies

### validateGhAuth

**observation:** `validateGhAuth` is new and uses `gh auth status`

**search:** no extant `gh auth` patterns in codebase (only in new github.secrets files)

**verdict:** not a duplicate — first gh cli integration in keyrack

### getGithubRepoFromContext vs getOrgFromPackageJson

**observation:** `getGithubRepoFromContext` parses package.json repository field

**extant:** `getOrgFromPackageJson` parses package.json for organization name

**comparison:**
| function | returns | purpose |
|----------|---------|---------|
| `getOrgFromPackageJson` | `"ehmpathy"` | keyrack key org prefix |
| `getGithubRepoFromContext` | `"ehmpathy/rhachet"` | `gh secret set --repo` flag |

**verdict:** distinct purposes — not a duplicate

### communicator pattern (ghSecretSet, ghSecretDelete)

**observation:** new communicators for gh cli

**comparison with extant:**
- `isOpCliInstalled.ts` — checks if op cli is installed
- `execOp` in 1password — wraps op cli calls

**verdict:** follows established pattern of vault-specific cli wrappers

## conclusion

all mechanisms either:
1. follow established patterns (getMechAdapter)
2. serve distinct purposes from extant code (getGithubRepoFromContext vs getOrgFromPackageJson)
3. are first-of-kind for their domain (gh cli integration)

no duplication found.

