# review.self: has-consistent-conventions (r4)

## the question

does the new code follow extant name conventions?

## investigation method

searched codebase for extant patterns:
1. `grep 'export const \w+Adapter'` → found vault and mech adapter patterns
2. `grep 'export const is\w+Installed'` → found cli check patterns
3. `grep 'KeyrackHostVault'` → found vault type usages
4. read `KeyrackHostVault.ts` for vault type definitions
5. read `genContextKeyrackGrantUnlock.ts` for adapter mappings

## extant conventions identified

### vault type names (KeyrackHostVault.ts:17-23)

pattern: `{namespace}.{name}` for os-level, `{product}` or `{provider}.{service}` for external

| vault type | pattern |
|------------|---------|
| os.envvar | namespace.name |
| os.direct | namespace.name |
| os.secure | namespace.name |
| os.daemon | namespace.name |
| 1password | product name |
| aws.iam.sso | provider.service.auth |

### vault adapter names

pattern: `vaultAdapter{VaultNamePascalCase}` where dots become concatenated words

| vault type | adapter name | file |
|------------|--------------|------|
| os.envvar | vaultAdapterOsEnvvar | os.envvar/vaultAdapterOsEnvvar.ts |
| os.direct | vaultAdapterOsDirect | os.direct/vaultAdapterOsDirect.ts |
| os.secure | vaultAdapterOsSecure | os.secure/vaultAdapterOsSecure.ts |
| os.daemon | vaultAdapterOsDaemon | os.daemon/vaultAdapterOsDaemon.ts |
| 1password | vaultAdapter1Password | 1password/vaultAdapter1Password.ts |
| aws.iam.sso | vaultAdapterAwsIamSso | aws.iam.sso/vaultAdapterAwsIamSso.ts |

### mech adapter names

pattern: `mechAdapter{MechNamePascalCase}` strippedof prefix

| mech type | adapter name | file |
|-----------|--------------|------|
| PERMANENT_VIA_REPLICA | mechAdapterReplica | mechanisms/mechAdapterReplica.ts |
| EPHEMERAL_VIA_GITHUB_APP | mechAdapterGithubApp | mechanisms/mechAdapterGithubApp.ts |
| EPHEMERAL_VIA_AWS_SSO | mechAdapterAwsSso | mechanisms/mechAdapterAwsSso.ts |

### directory names

pattern: match vault type slug exactly (dot-separated for os.*, product name for external)

| vault type | directory |
|------------|-----------|
| os.envvar | os.envvar/ |
| os.direct | os.direct/ |
| os.secure | os.secure/ |
| os.daemon | os.daemon/ |
| 1password | 1password/ |
| aws.iam.sso | aws.iam.sso/ |

### cli check function names

pattern: `is{CliName}Installed`

| cli | function | file |
|-----|----------|------|
| aws | isAwsCliInstalled | aws.iam.sso/setupAwsSsoProfile.ts:276 |
| op | isOpCliInstalled | 1password/isOpCliInstalled.ts:12 |

## review of new code

### new vault adapter: vaultAdapterOsDaemon

| aspect | extant convention | new code | verdict |
|--------|-------------------|----------|---------|
| adapter name | vaultAdapter{VaultName} | vaultAdapterOsDaemon | ✓ follows |
| directory | match vault type slug | os.daemon/ | ✓ follows |
| file name | vaultAdapter{VaultName}.ts | vaultAdapterOsDaemon.ts | ✓ follows |

### new vault adapter: vaultAdapter1Password

| aspect | extant convention | new code | verdict |
|--------|-------------------|----------|---------|
| adapter name | vaultAdapter{VaultName} | vaultAdapter1Password | ✓ follows |
| directory | match vault type slug | 1password/ | ✓ follows |
| file name | vaultAdapter{VaultName}.ts | vaultAdapter1Password.ts | ✓ follows |

### new cli check: isOpCliInstalled

| aspect | extant convention | new code | verdict |
|--------|-------------------|----------|---------|
| function name | is{CliName}Installed | isOpCliInstalled | ✓ follows |
| location | colocated with vault adapter | 1password/isOpCliInstalled.ts | ✓ follows (parallel to aws.iam.sso/setupAwsSsoProfile.ts) |

### new mech types

| aspect | extant convention | new code | verdict |
|--------|-------------------|----------|---------|
| mech name pattern | {DURATION}_VIA_{METHOD} | EPHEMERAL_VIA_SESSION | ✓ follows |
| mech name pattern | {DURATION}_VIA_{METHOD} | PERMANENT_VIA_REFERENCE | ✓ follows |

### vault adapter map (genContextKeyrackGrantUnlock.ts:80-87)

| vault type | adapter | follows convention? |
|------------|---------|---------------------|
| 'os.daemon' | vaultAdapterOsDaemon | ✓ key matches vault type |
| '1password' | vaultAdapter1Password | ✓ key matches vault type |

## why it holds

1. **adapter names** follow `vaultAdapter{VaultName}` pattern consistently
2. **directory names** match vault type slugs exactly (os.daemon/, 1password/)
3. **cli check names** follow `is{CliName}Installed` pattern (isOpCliInstalled parallel to isAwsCliInstalled)
4. **mech type names** follow `{DURATION}_VIA_{METHOD}` pattern
5. **vault adapter map keys** use exact vault type slugs as keys

all new code aligns with patterns found in extant code. no divergence detected.

## conclusion

no convention violations. all new names follow extant patterns.
