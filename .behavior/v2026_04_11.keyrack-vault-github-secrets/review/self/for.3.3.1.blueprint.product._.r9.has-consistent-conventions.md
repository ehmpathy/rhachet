# self-review: has-consistent-conventions (r9)

## deeper reflection: what did r8 miss?

r8 checked name conventions. let me examine internal operation patterns and acceptance test conventions.

---

## acceptance test file name convention

### extant acceptance tests

```
keyrack.acceptance.test.ts
keyrack.vault.osSecure.acceptance.test.ts
keyrack.vault.1password.acceptance.test.ts
```

**pattern:** `keyrack.vault.{vaultName}.acceptance.test.ts`

**blueprint:** `keyrack.vault.githubSecrets.acceptance.test.ts`

**verdict:** follows extant pattern. PascalCase for multi-word vault name.

---

## internal operation name convention

### extant internal operations

```ts
// vaultAdapter1Password.ts
validateOpLoginStatus  // validate + domain + check
validateExid           // validate + target

// vaultAdapterOsSecure.ts
verifyRoundtripDecryption  // verb + domain + action
```

**blueprint internal operations:**

```ts
validateGhAuth      // validate + domain + check
validateSecretName  // validate + target
encryptSecretValue  // encrypt + target
formatRequestBody   // format + target
```

**verdict:** follows extant internal operation patterns.

---

## gh api endpoint name convention

### extant gh api calls (inline)

```ts
// mechAdapterGithubApp.ts
gh api /user/orgs
gh api /orgs/{org}/installations
```

**pattern:** resource-focused endpoints

**blueprint endpoints:**

```
PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}
DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}
GET /repos/{owner}/{repo}/actions/secrets/public-key
```

**verdict:** standard github api patterns. no custom convention needed.

---

## vault type registration

### extant registration

```ts
type KeyrackHostVault = 'os.secure' | 'os.direct' | ... | 'aws.config';
```

**pattern:** lowercase with dot separator

**blueprint:** adds `'github.secrets'`

**check dot convention:**
- `os.secure` — platform.feature
- `os.direct` — platform.feature
- `aws.config` — platform.feature
- `github.secrets` — platform.feature

**verdict:** consistent. follows platform.feature pattern.

---

## summary of r9 reflection

| convention | r8 checked? | r9 deeper check | verdict |
|------------|-------------|-----------------|---------|
| acceptance test file | no | keyrack.vault.{vaultName} | consistent |
| internal operations | no | verb + domain/target | consistent |
| gh api endpoints | no | standard github patterns | consistent |
| vault type registration | yes | confirmed platform.feature | consistent |

**r9 found no additional issues.** all conventions align with extant patterns.
