# self-review: has-consistent-conventions (r8)

## convention check

search for extant name conventions and patterns. verify blueprint aligns.

---

## directory structure convention

### extant vault directories

```
adapters/vaults/
├── 1password/
├── aws.config/
├── os.daemon/
├── os.direct/
├── os.envvar/
└── os.secure/
```

**pattern:** platform.feature for multi-word names, brand name for single-word.

**blueprint:** `github.secrets/` — follows platform.feature pattern.

**verdict:** consistent.

---

## vault adapter name convention

### extant

| directory | export |
|-----------|--------|
| 1password | vaultAdapter1Password |
| aws.config | vaultAdapterAwsConfig |
| os.daemon | vaultAdapterOsDaemon |
| os.secure | vaultAdapterOsSecure |

**pattern:** `vaultAdapter` + PascalCase(directory)

**blueprint:** `vaultAdapterGithubSecrets`

**verdict:** consistent.

---

## test file name convention

### extant

```
vaultAdapter1Password.test.ts           # unit
vaultAdapter1Password.integration.test.ts   # integration
```

**blueprint:**

```
vaultAdapterGithubSecrets.integration.test.ts
validateSecretName.test.ts              # unit
encryptSecretValue.test.ts              # unit
ghApiSetSecret.integration.test.ts
ghApiDelSecret.integration.test.ts
ghApiGetPublicKey.integration.test.ts
```

**verdict:** follows extant .test.ts / .integration.test.ts convention.

---

## transformer name convention

### extant transformers

```ts
asKeyrackKeyEnv
asKeyrackKeySlug
asKeyrackKeyName
asKeyrackKeyOrg
asVaultNameFromExid
asVaultErrorMessage
asAccountErrorMessage
asShellEscapedSecret
encryptToRecipients
```

**pattern:**
- `as*` for cast/parse (input → typed output)
- `encrypt*` for encryption

**blueprint:**
- `validateSecretName` — validation transformer
- `encryptSecretValue` — encryption transformer

**check `validate*` convention:**

search: `validate` in src/domain.operations/

no extant `validate*` transformers found. but:
- `validate*` is standard convention for validation functions
- follows verb-first rule from rule.require.treestruct
- does not conflict with `as*` pattern (as* casts, validate* guards)

**verdict:** consistent. `validate*` is appropriate for guard/validation functions.

---

## communicator name convention

### extant communicators

```ts
// 1password — private function
execOp

// mechanism adapter — inline calls
execSync('gh api /user/orgs...')
```

**pattern:** no extant gh api communicator exports. blueprint introduces:
- `ghApiSetSecret`
- `ghApiDelSecret`
- `ghApiGetPublicKey`

**check convention:**
- `ghApi` prefix — identifies the external system
- `Set/Del/Get` — verb follows treestruct rule (verb + noun hierarchy)
- `Secret/PublicKey` — noun target

**verdict:** consistent with treestruct rule and external-system prefix pattern.

---

## vault type name convention

### extant vault types (KeyrackHostVault union)

```ts
type KeyrackHostVault =
  | 'os.secure'
  | 'os.direct'
  | 'os.daemon'
  | 'os.envvar'
  | '1password'
  | 'aws.config';
```

**pattern:** lowercase, dot-separated for compound.

**blueprint:** adds `'github.secrets'`

**verdict:** consistent.

---

## summary

| convention | extant pattern | blueprint | verdict |
|------------|----------------|-----------|---------|
| directory | platform.feature | github.secrets/ | consistent |
| adapter name | vaultAdapter + PascalCase | vaultAdapterGithubSecrets | consistent |
| test files | .test.ts / .integration.test.ts | follows pattern | consistent |
| transformers | as*, encrypt* | validate*, encrypt* | consistent |
| communicators | external-prefix + verb + noun | ghApi + Set/Del/Get + noun | consistent |
| vault type | lowercase dot-separated | github.secrets | consistent |

**all name conventions align with extant patterns.**
