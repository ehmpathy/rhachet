# self-review: has-consistent-mechanisms (r7)

## mechanisms check

search for related codepaths in codebase. for each new mechanism in blueprint, verify no duplication.

---

## new mechanisms in blueprint

from filediff tree (lines 27-33):
1. validateSecretName.ts — name validation
2. encryptSecretValue.ts — sodium seal
3. vaultAdapterGithubSecrets.ts — vault adapter
4. ghApiSetSecret.ts — gh api PUT
5. ghApiDelSecret.ts — gh api DELETE
6. ghApiGetPublicKey.ts — public key fetch

---

## check: validateSecretName

**question:** does codebase have extant secret name validation?

**search:** `validateName`, `validate.*Name` in src/

**found:** vaultAdapterAwsConfig.ts has profile name validation for AWS config.

**distinct?** yes. github secrets have specific rules:
- alphanumeric + underscore only
- cannot start with GITHUB_ prefix
- cannot start with number

aws profile names have different constraints. no reuse possible.

**verdict:** not a duplicate.

---

## check: encryptSecretValue

**question:** does codebase have sodium sealed box encryption?

**search:** `sodium`, `nacl`, `tweetnacl`, `sealed.*box` in src/

**found:** ageRecipientCrypto.ts has age encryption (X25519/ssh-ed25519 stanzas).

**distinct?** yes. github secrets api requires libsodium sealed box encryption:
- sealed box = ephemeral key + nacl box
- age = X25519 with header format

different cipher scheme, different algorithm. no reuse possible.

**verdict:** not a duplicate.

---

## check: ghApi* communicators

**question:** does codebase have extant gh api wrapper?

**search:** `gh api`, `execGh`, `ghApi` in src/

**found:**
- vaultAdapter1Password.ts lines 26-30: `execOp` wraps `op` CLI
- mechAdapterGithubApp.ts lines 134, 159-161: inline `execSync('gh api ...')`

**pattern consistency:** the blueprint's ghApi* communicators follow the same pattern:
- wrap subprocess execution
- handle error cases
- return typed response

**distinct?** yes. the extant gh api calls are inline in mechAdapterGithubApp. the blueprint extracts secrets api endpoints into dedicated communicators.

**should we generalize?** the extant inline calls work for simple queries (`/user/orgs`, `/orgs/.../installations`). the secrets api needs more handling (request body, encryption, error parsing). extraction to communicators is appropriate.

**verdict:** consistent with extant pattern, not a duplicate.

---

## check: getMechAdapter pattern

**question:** does blueprint duplicate getMechAdapter?

**found:**
- vaultAdapter1Password.ts lines 36-52: getMechAdapter local function
- vaultAdapterOsSecure.ts lines 68-83: getMechAdapter local function

**pattern:** each vault adapter has its own getMechAdapter that maps to supported mechs.

**blueprint:** vaultAdapterGithubSecrets will have its own getMechAdapter for PERMANENT_VIA_REPLICA and EPHEMERAL_VIA_GITHUB_APP.

**verdict:** consistent with extant pattern. each vault owns its mech dispatch.

---

## check: vault adapter structure

**question:** does blueprint follow extant vault adapter interface?

**found:** KeyrackHostVaultAdapter interface defines:
- mechs.supported: KeyrackGrantMechanism[]
- unlock: () => Promise<void>
- isUnlocked: () => Promise<boolean>
- get: ((input) => Promise<string | null>) | null
- set: (input, context?) => Promise<{ mech; exid? }>
- del: (input) => Promise<void>

**blueprint:** declares all methods. `get: null` for write-only vault.

**verdict:** follows extant interface. consistent.

---

## summary

| mechanism | extant similar? | duplicate? | verdict |
|-----------|-----------------|------------|---------|
| validateSecretName | aws profile validation | no, different domain | consistent |
| encryptSecretValue | age encryption | no, different cipher | consistent |
| ghApiSetSecret | inline gh api calls | no, extracted communicator | consistent |
| ghApiDelSecret | inline gh api calls | no, extracted communicator | consistent |
| ghApiGetPublicKey | inline gh api calls | no, extracted communicator | consistent |
| getMechAdapter | per-vault pattern | no, follows pattern | consistent |
| vault adapter | KeyrackHostVaultAdapter | no, implements interface | consistent |

**all mechanisms are either new domain requirements or follow extant patterns. no duplication found.**
