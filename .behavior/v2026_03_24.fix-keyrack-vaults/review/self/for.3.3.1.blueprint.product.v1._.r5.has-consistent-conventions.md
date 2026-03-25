# self-review: has-consistent-conventions

## stone
3.3.1.blueprint.product.v1

## question
does the blueprint diverge from extant name conventions?

## review

### KeyrackGrantMechanism names

extant convention (from KeyrackGrantMechanism.ts):
```
name convention: {DURATION}_VIA_{METHOD}
- PERMANENT_VIA_*: credential lives indefinitely
- EPHEMERAL_VIA_*: credential lives for bounded time
```

extant mech values:
- PERMANENT_VIA_REPLICA
- EPHEMERAL_VIA_GITHUB_APP
- EPHEMERAL_VIA_AWS_SSO
- EPHEMERAL_VIA_GITHUB_OIDC

**blueprint proposes:**
- `EPHEMERAL_SESSION` — **does NOT follow convention** (absent `_VIA_` pattern)
- `PERMANENT_VIA_EXID` — follows convention

**issue found:** `EPHEMERAL_SESSION` breaks the `{DURATION}_VIA_{METHOD}` convention.

**fix:** rename to `EPHEMERAL_VIA_SESSION` to follow extant convention.

### isOpCliInstalled

extant convention (from setupAwsSsoProfile.ts):
- `isAwsCliInstalled`

**blueprint proposes:** `isOpCliInstalled`

**verdict:** follows convention. `is{Tool}Installed` pattern matches extant `isAwsCliInstalled`.

### vault adapter file names

extant convention:
- `vaultAdapterOsDirect.ts`
- `vaultAdapterOsSecure.ts`
- `vaultAdapterOsDaemon.ts`
- `vaultAdapter1Password.ts`
- `vaultAdapterAwsIamSso.ts`

**blueprint proposes:** update extant `vaultAdapterOsDaemon.ts` and `vaultAdapter1Password.ts`

**verdict:** follows convention — updates extant files, no new files with different convention.

### domain objects

extant convention for keyrack objects:
- `KeyrackGrantMechanism.ts`
- `KeyrackHostVaultAdapter.ts`
- `KeyrackKeyGrant.ts`

**blueprint proposes:** update `KeyrackGrantMechanism.ts`

**verdict:** follows convention.

## issues found

1. **EPHEMERAL_SESSION** — breaks `{DURATION}_VIA_{METHOD}` convention. should be `EPHEMERAL_VIA_SESSION`.

## fix required

update blueprint to use `EPHEMERAL_VIA_SESSION` instead of `EPHEMERAL_SESSION`.

## verdict

one convention violation found: mech name must follow `{DURATION}_VIA_{METHOD}` pattern. fix required before execution.
