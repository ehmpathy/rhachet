# eval: grant mechanism — EPHEMERAL_VIA_AWS_SSO

> keyrack wraps the sso flow. the key is whatever env var the tool needs. the mechanism ensures it's usable.

---

## the pattern: declastruct-aws today

declastruct-aws uses `AWS_PROFILE` + `aws sso login` to authenticate. no raw credentials in env vars.

```
declastruct.aws.auth.today
├─ human runs: source use.demo.awsprofile.sh
│  ├─ export AWS_PROFILE=ehmpathy.demo
│  ├─ aws sts get-caller-identity → check if auth valid
│  └─ if expired → aws sso login → browser auth → sso cache populated
│
├─ aws sdk resolves credentials automatically
│  ├─ reads AWS_PROFILE → finds sso_session in ~/.aws/config
│  ├─ reads cached sso token from ~/.aws/sso/cache/{hash}.json
│  ├─ exchanges sso token for temp credentials (GetRoleCredentials)
│  └─ uses temp credentials for api calls (auto-refreshed)
│
└─ no AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY ever set
   └─ AWS_PROFILE is a pointer, not a secret
```

ref: [declastruct-aws provision/aws.auth](https://github.com/ehmpathy/declastruct-aws/tree/main/provision/aws.auth)

---

## the insight: keys are env vars, not always secrets

keyrack keys are env vars that tools need. sometimes the env var IS a secret (e.g., `XAI_API_KEY=sk-abc123`). sometimes the env var is a **reference** — a pointer that must be backed by valid auth state (e.g., `AWS_PROFILE=ehmpathy.demo`).

keyrack doesn't care about the distinction. it guarantees the env var is **usable** when `get` exports it. the grant mechanism defines what "usable" means and how to achieve it.

```
key.types
├─ secret key: env var IS the credential
│  ├─ XAI_API_KEY=sk-abc123
│  ├─ GITHUB_TOKEN=ghp_xyz
│  ├─ grade.protection = encrypted or plaintext (value is sensitive)
│  └─ usable = value is correct and not expired
│
├─ reference key: env var POINTS to auth state
│  ├─ AWS_PROFILE=ehmpathy.demo
│  ├─ grade.protection = reference (value is non-sensitive)
│  ├─ usable = sso cache is valid, profile configured, sts identity verified
│  └─ the actual credentials live in sdk memory, never in env
│
└─ keyrack treats both uniformly
   ├─ keyrack.yml declares the env var name + grade requirement
   ├─ keyrack.host.yml declares the vault + mechanism
   ├─ unlock ensures the env var is usable (via mechanism-specific flow)
   └─ get exports the env var (reference or secret, doesn't matter)
```

### grade.protection: reference

the `reference` protection level is distinct from both `plaintext` and `encrypted`:

```
grade.protection
├─ plaintext  → value IS the secret, stored in plain text
│  └─ blast radius: anyone who reads the value has the credential
│
├─ encrypted  → value IS the secret, stored encrypted
│  └─ blast radius: anyone who decrypts the value has the credential
│
└─ reference  → value POINTS to auth state managed elsewhere
   ├─ the value itself is non-sensitive (e.g., a profile name)
   ├─ the actual credentials never enter keyrack
   ├─ security is delegated to the referenced system (aws sso, etc)
   └─ blast radius: zero from keyrack compromise alone
      └─ attacker must also compromise the referenced system's auth state
```

reference sits above encrypted in the grade ladder because the actual secret never enters keyrack at all. with encrypted, the secret is in keyrack (just encrypted). with reference, it's not there.

```
grade.ladder (protection dimension)
├─ reference  ← strongest (secret never enters keyrack)
├─ encrypted  ← strong (secret in keyrack, but encrypted at rest)
└─ plaintext  ← weakest (secret in keyrack, readable)
```

---

## keyrack.yml spec

```yaml
# keyrack.yml (in repo)
keys:
  AWS_PROFILE: reference              # requires grade.protection = reference
  XAI_API_KEY: encrypted              # requires grade.protection = encrypted
  SUPER_SECRET: encrypted,ephemeral   # requires both
```

the spec declares grade requirements. `AWS_PROFILE: reference` means the key must be a reference (non-sensitive pointer backed by external auth state). `EPHEMERAL_VIA_AWS_SSO` satisfies this — it produces a reference key with ephemeral duration.

## keyrack.host.yml host

```yaml
# keyrack.host.yml (on machine)
keys:
  AWS_PROFILE:
    vault: aws.sso
    profile: ehmpathy.demo           # sso profile name in ~/.aws/config
    # mechanism: EPHEMERAL_VIA_AWS_SSO (implied by vault: aws.sso)
    # grade: { protection: reference, duration: ephemeral }
    # key.secret: "ehmpathy.demo" (the profile name IS the key value — non-sensitive)
```

the host declares how to provide the key on this machine. the `aws.sso` vault knows how to:
1. validate the sso profile exists in `~/.aws/config`
2. trigger `aws sso login --profile $profile` on unlock
3. verify auth via `aws sts get-caller-identity`
4. store the profile name as the key value in daemon

---

## unlock flow: EPHEMERAL_VIA_AWS_SSO

```
unlock.flow.aws.sso
├─ 1. keyrack reads keyrack.host.yml → vault: aws.sso, profile: ehmpathy.demo
│
├─ 2. validate profile configured
│  ├─ read ~/.aws/config → find [profile ehmpathy.demo]
│  ├─ find [sso-session ...] block with sso_start_url
│  └─ if absent → fail fast: "profile not configured. see setup guide."
│
├─ 3. check if sso cache is valid
│  ├─ aws sts get-caller-identity --profile ehmpathy.demo
│  ├─ if valid → skip sso login (already authenticated)
│  └─ if expired → proceed to step 4
│
├─ 4. trigger sso login (interactive)
│  ├─ aws sso login --profile ehmpathy.demo
│  ├─ opens browser → user authenticates via identity center
│  └─ sso token cached in ~/.aws/sso/cache/
│
├─ 5. verify auth
│  ├─ aws sts get-caller-identity --profile ehmpathy.demo
│  └─ if fail → fail fast: "sso login failed. check browser session."
│
├─ 6. store in daemon
│  ├─ slug: AWS_PROFILE
│  ├─ key.secret: "ehmpathy.demo" (the profile name — non-sensitive)
│  ├─ key.grade: { protection: reference, duration: ephemeral }
│  └─ expiresAt: sso session duration (e.g., 4h from now)
│
└─ 7. done
   └─ "AWS_PROFILE unlocked (expires in 4h)"
```

---

## get flow: AWS_PROFILE

```
get.flow.aws.profile
├─ 1. keyrack reads keyrack.yml → requires AWS_PROFILE
├─ 2. connect to daemon → request slug AWS_PROFILE
├─ 3. daemon returns: { secret: "ehmpathy.demo", grade: {...}, expiresAt: ... }
│
├─ 4. validate usability (mechanism-specific)
│  ├─ aws sts get-caller-identity --profile ehmpathy.demo
│  ├─ if valid → proceed
│  └─ if expired → fail: "sso session expired. run `rhx keyrack unlock`"
│
├─ 5. export: AWS_PROFILE=ehmpathy.demo
│  └─ aws sdk will resolve credentials automatically from this profile
│
└─ 6. done
   └─ tool uses AWS_PROFILE → sdk → sso cache → temp creds → api calls
```

note: step 4 (validate usability) is optional — the daemon already tracks TTL. but sso sessions can be revoked server-side, so a quick sts check adds confidence.

---

## comparison: secret key vs reference key

| dimension | secret key (XAI_API_KEY) | reference key (AWS_PROFILE) |
|-----------|--------------------------|---------------------------|
| key.secret value | `sk-abc123` (actual credential) | `ehmpathy.demo` (profile name — non-sensitive) |
| grade.protection | `encrypted` or `plaintext` | `reference` |
| grade.duration | permanent or ephemeral | ephemeral (sso session) |
| unlock flow | decrypt from os.secure, or prompt for value | `aws sso login --profile $name` |
| get flow | export env var with secret value | export env var with profile name |
| validation on get | TTL check in daemon | TTL check + optional sts verify |
| credential location | env var (the secret IS the env var) | sdk memory (sdk resolves from profile) |
| blast radius if leaked | full credential compromise | zero (profile name is non-sensitive) |

keyrack treats both uniformly:
- `unlock` → make the key usable (decrypt, sso login, etc)
- `get` → export the env var
- daemon stores the key.secret (whatever value the env var should have)

the key difference: for secret keys, the keyrack IS the attack surface (it holds the credential). for reference keys, the keyrack holds a non-sensitive pointer — the attack surface is the referenced system's auth state (sso cache, identity center, etc).

---

## mechanism-specific unlock logic

each grant mechanism defines its own unlock flow. the daemon stores the result uniformly.

```
grant.mechanisms
├─ PERMANENT_VIA_REPLICA
│  ├─ unlock: decrypt from os.secure (passphrase prompt)
│  ├─ key.secret: the actual credential value (sensitive)
│  ├─ key.grade: { protection: encrypted, duration: permanent }
│  └─ daemon stores: secret value + TTL
│
├─ EPHEMERAL_VIA_AWS_SSO
│  ├─ unlock: aws sso login --profile $name (browser auth)
│  ├─ key.secret: the profile name (reference — non-sensitive)
│  ├─ key.grade: { protection: reference, duration: ephemeral }
│  └─ daemon stores: profile name + TTL (matched to sso session duration)
│
├─ EPHEMERAL_VIA_GITHUB_APP
│  ├─ unlock: exchange app credentials for installation token
│  ├─ key.secret: the installation access token
│  └─ daemon stores: token value + TTL (1h github limit)
│
├─ EPHEMERAL_VIA_GITHUB_OIDC
│  ├─ unlock: exchange oidc token for github token (cicd only)
│  ├─ key.secret: the oidc-minted token
│  └─ daemon stores: token value + TTL
│
└─ EPHEMERAL_VIA_INSTANCE_ROLE
   ├─ unlock: imds call to metadata service (ec2 only)
   ├─ key.secret: the profile name or role credentials
   └─ daemon stores: credentials + TTL (auto-refreshed)
```

the unlock logic is pluggable per mechanism. the daemon doesn't know or care which mechanism produced the key — it stores `{ slug, secret, grade, expiresAt }` uniformly.

---

## what this means for the vision

1. **keyrack keys = env vars, not always secrets** — some keys are references (pointers backed by auth state)
2. **grade.protection has three levels** — `plaintext` (value is secret, in plain text), `encrypted` (value is secret, encrypted), `reference` (value is non-sensitive pointer)
3. **reference keys have zero blast radius from keyrack compromise** — the actual credentials never enter the keyrack system
4. **grant mechanisms define unlock flows** — each mechanism knows how to make the env var usable
5. **mechanism names encode duration, not protection** — `EPHEMERAL_VIA_AWS_SSO` describes the grant's duration; the protection (`reference`) is a property of the key grade
6. **daemon stores results uniformly** — `Map<slug, { secret, grade, expiresAt }>` regardless of mechanism
7. **get exports uniformly** — `export $SLUG=$SECRET` regardless of whether secret is a credential or a reference
8. **validation is mechanism-aware** — reference keys may benefit from usability checks on get (e.g., sts verify)

---

## sources

- [declastruct-aws provision/aws.auth](https://github.com/ehmpathy/declastruct-aws/tree/main/provision/aws.auth) — sso setup
- [declastruct-aws use.demo.awsprofile.sh](https://github.com/ehmpathy/declastruct-aws/blob/main/.agent/repo=.this/skills/use.demo.awsprofile.sh) — sso login skill
- [declastruct-aws getDeclastructAwsProvider.ts](https://github.com/ehmpathy/declastruct-aws/blob/main/src/domain.operations/provider/getDeclastructAwsProvider.ts) — credential resolution via SDK chain
- [aws sso credential provider chain](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html) — SDK auto-resolution from profile
