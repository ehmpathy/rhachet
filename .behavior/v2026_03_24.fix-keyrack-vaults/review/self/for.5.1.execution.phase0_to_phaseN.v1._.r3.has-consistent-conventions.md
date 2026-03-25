# review.self: has-consistent-conventions (r3)

## the question

does the new code follow extant name conventions?

## conventions reviewed

### 1. vault adapter names

**convention:** `vaultAdapter{VaultName}` where VaultName is PascalCase

| adapter | name | follows convention? |
|---------|------|---------------------|
| os.secure | vaultAdapterOsSecure | ✓ |
| os.direct | vaultAdapterOsDirect | ✓ |
| os.daemon | vaultAdapterOsDaemon | ✓ |
| os.envvar | vaultAdapterOsEnvvar | ✓ |
| aws.iam.sso | vaultAdapterAwsIamSso | ✓ |
| 1password | vaultAdapter1Password | ✓ |

**verdict:** all adapters follow `vaultAdapter{VaultName}` convention.

### 2. directory names

**convention:** dots for namespaces (e.g., `os.secure`, `aws.iam.sso`)

| directory | follows convention? |
|-----------|---------------------|
| os.secure | ✓ dot namespace |
| os.direct | ✓ dot namespace |
| os.daemon | ✓ dot namespace |
| os.envvar | ✓ dot namespace |
| aws.iam.sso | ✓ dot namespace |
| 1password | ✓ no dots (single-word product name) |

**note:** `1password` starts with a number — acceptable because it matches the official product name. alternative `onepassword` would deviate from the product's brand.

**verdict:** directory names follow conventions.

### 3. mech type names

**convention:** `{DURATION}_VIA_{METHOD}` where:
- DURATION = PERMANENT | EPHEMERAL
- METHOD = how the grant is obtained

| mech type | pattern | follows convention? |
|-----------|---------|---------------------|
| PERMANENT_VIA_REPLICA | ✓ duration_via_method | extant |
| PERMANENT_VIA_REFERENCE | ✓ duration_via_method | new |
| EPHEMERAL_VIA_SESSION | ✓ duration_via_method | new |
| EPHEMERAL_VIA_GITHUB_APP | ✓ duration_via_method | extant |
| EPHEMERAL_VIA_AWS_SSO | ✓ duration_via_method | extant |
| EPHEMERAL_VIA_GITHUB_OIDC | ✓ duration_via_method | extant |

**verdict:** new mech types follow `{DURATION}_VIA_{METHOD}` convention.

### 4. function names

**convention:** `is*Installed` for cli availability checks

| function | follows convention? |
|----------|---------------------|
| isAwsCliInstalled | ✓ extant |
| isOpCliInstalled | ✓ new |

**verdict:** new function follows extant pattern.

### 5. prompt utility names

**convention:** `prompt{Visibility}Input` for input prompts

| function | follows convention? |
|----------|---------------------|
| promptHiddenInput | ✓ extant (for secrets) |
| promptVisibleInput | ✓ extant (for non-secrets) |

**usage:** 1password adapter correctly uses `promptVisibleInput` for exid (not a secret).

**verdict:** correct reuse of extant utility that follows the convention.

## conclusion

all new code follows extant name conventions:

| area | convention | followed? |
|------|------------|-----------|
| adapter names | vaultAdapter{VaultName} | ✓ |
| directory names | dot namespaces | ✓ |
| mech types | {DURATION}_VIA_{METHOD} | ✓ |
| cli checks | is*Installed | ✓ |
| prompt utilities | prompt{Visibility}Input | ✓ |

no convention violations found.
