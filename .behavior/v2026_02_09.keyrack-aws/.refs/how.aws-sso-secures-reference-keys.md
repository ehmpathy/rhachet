# how aws sso secures reference keys

## .what

when keyrack stores `AWS_PROFILE=ehmpathy.dev` as a `reference` protection key, the actual secrets never touch keyrack. this document explains the full chain from profile name to authenticated api call — and why only a profile name is needed.

## .tldr

### what is stored where

| location | what's stored | when written | lifetime | format |
|----------|---------------|--------------|----------|--------|
| **keyrack** | profile name only (e.g., `ehmpathy.dev`) | `rhx keyrack set` by human | permanent until deleted | plaintext reference |
| **~/.aws/config** | profile config: `sso_session`, `sso_account_id`, `sso_role_name` | `aws configure sso` by human | permanent until deleted | ini |
| **~/.aws/sso/cache/\<sha1\>.json** | `accessToken` (jwe), `refreshToken`, `clientId`, `clientSecret`, `expiresAt` | `aws sso login` (browser auth) | access token: 8h; refresh: up to 90 days | json with jwe bearer token |
| **process memory** | `accessKeyId` (ASIA*), `secretAccessKey`, `sessionToken` | sdk calls `GetRoleCredentials` at runtime | 1-12h (per permission set config) | never written to disk |

### the chain

```
keyrack          "ehmpathy.dev"              permanent, not a secret
                      |
                      v
~/.aws/config    [profile ehmpathy.dev]      permanent, not a secret
                 sso_session = ehmpathy       (just config pointers)
                 sso_account_id = 111122223333
                 sso_role_name = PowerUserRole
                      |
                      v
~/.aws/sso/cache jwe accessToken             disk, written by `aws sso login`
                 + refreshToken               encrypted bearer token, 8h ttl
                 + clientId/clientSecret       refreshable up to 90 days
                      |
                      v
portal.sso API   GetRoleCredentials(          bearer auth, server-side
                   accessToken,               decrypts jwe + validates
                   accountId, roleName)
                      |
                      v
process memory   ASIA* accessKeyId            in-memory only, never on disk
                 + secretAccessKey             1-12h ttl, auto-renewed
                 + sessionToken                via repeat GetRoleCredentials
                      |
                      v
aws api calls    signed via SigV4             standard aws request auth
```

no long-lived secrets exist anywhere in this chain. the only sensitive artifact on disk is the jwe bearer token in `~/.aws/sso/cache/`, managed entirely by the aws cli outside keyrack.

## .the credential resolution chain

when an aws sdk or cli encounters `AWS_PROFILE=ehmpathy.dev`, it walks the **default credential provider chain** until one succeeds:

| priority | provider | trigger |
|----------|----------|---------|
| 1 | environment variables | `AWS_ACCESS_KEY_ID` set |
| 2 | web identity token | `AWS_WEB_IDENTITY_TOKEN_FILE` set |
| 3 | **sso credentials** | **profile has `sso_session` + `sso_account_id` + `sso_role_name`** |
| 4 | assume-role | profile has `source_profile` or `credential_source` |
| 5 | process credentials | profile has `credential_process` |
| 6 | static credentials | profile has `aws_access_key_id` |
| 7 | container credentials | `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` set |
| 8 | ec2 instance metadata | imds available |

for sso-configured profiles (priority 3), the sdk reads the `[sso-session]` section and resolves credentials via the oidc token cache.

**source:** [default credentials provider chain — aws sdk for java 2.x](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html)

## .profile configuration

an sso-configured profile in `~/.aws/config` looks like:

```ini
[profile ehmpathy.dev]
sso_session = ehmpathy
sso_account_id = 111122223333
sso_role_name = PowerUserRole
region = us-east-1

[sso-session ehmpathy]
sso_region = us-east-1
sso_start_url = https://ehmpathy.awsapps.com/start
sso_registration_scopes = sso:account:access
```

key properties:
- `sso_session` points to a named `[sso-session]` section (multiple profiles can share one)
- `sso_account_id` + `sso_role_name` identify which iam role to assume
- `sso_start_url` + `sso_region` identify the identity center portal

**source:** [iam identity center token provider configuration — aws cli](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html)

## .how `aws sso login` establishes sessions

when `aws sso login --profile ehmpathy.dev` is invoked:

1. cli reads the profile's `sso_session` and loads the `[sso-session]` section
2. cli initiates an **oidc device authorization flow** against the identity center oidc endpoint
3. cli opens the default browser to the authorization url
4. human authenticates against the configured identity source (okta, azure ad, identity center directory, etc)
5. upon approval, the oidc endpoint returns tokens via the `CreateToken` api
6. tokens are cached to `~/.aws/sso/cache/<sha1-of-session-name>.json`

**cached token structure:**

```json
{
  "startUrl": "https://ehmpathy.awsapps.com/start",
  "region": "us-east-1",
  "accessToken": "eyJlbmMiOi...<jwe>...",
  "expiresAt": "2026-02-10T12:00:00Z",
  "refreshToken": "aorvJYub...",
  "clientId": "XXXXXXX",
  "clientSecret": "YYYYYYY"
}
```

the `accessToken` is a jwe (json web encryption) bearer token used to call identity center portal apis. the `eyJlbmM` prefix indicates encryption — the token is opaque to the client and decrypted server-side by identity center. it is **not** an aws credential — it cannot sign api requests directly.

**source:** [iam identity center authentication via the aws cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

## .two-session architecture

two independent sessions exist, at different layers:

| session | duration | controls | refresh mechanism |
|---------|----------|----------|-------------------|
| **identity center session** (access portal) | up to 90 days (configurable) | ability to obtain new sts credentials | refreshToken via CreateToken api |
| **permission set session** (sts credentials) | 1-12 hours (configurable per permission set) | ability to make aws api calls | re-call GetRoleCredentials |

the sdk automatically renews permission set credentials (by re-call of `GetRoleCredentials`) as long as the identity center session is active. when the identity center session expires, `aws sso login` must be re-run.

**source:** [iam identity center authentication resolution — aws sdks and tools](https://docs.aws.amazon.com/sdkref/latest/guide/understanding-sso.html)

## .the credential exchange: bearer token to sts creds

the critical step: the sdk calls `GetRoleCredentials` on the identity center portal api:

```
GET /federation/credentials?account_id=111122223333&role_name=PowerUserRole
Host: portal.sso.us-east-1.amazonaws.com
x-amz-sso_bearer_token: eyJlbmMiOi...<accessToken jwe>...
```

response:

```json
{
  "roleCredentials": {
    "accessKeyId": "ASIAXXX...",
    "secretAccessKey": "wJalrXU...",
    "sessionToken": "FwoGZXIv...",
    "expiration": 1707523200000
  }
}
```

security properties:
- **bearer auth only** — this is the only step that uses bearer auth; all subsequent aws api calls use sigv4
- **temporary credentials** — the returned `ASIA*` key + secret + session token are standard sts temporary credentials
- **role assumption** — identity center assumes the iam role that backs the permission set, which produces scoped sts credentials
- **no long-lived secrets** — at no point does the developer possess long-lived iam access keys

**source:** [GetRoleCredentials api reference — iam identity center portal api](https://docs.aws.amazon.com/singlesignon/latest/PortalAPIReference/API_GetRoleCredentials.html)

## .session validation via `get-caller-identity`

`aws sts get-caller-identity` is the standard health check. for sso-sourced credentials:

1. sdk resolves credentials via the sso provider chain (reads cached token, calls `GetRoleCredentials` if sts creds expired)
2. sdk signs the `GetCallerIdentity` request with sigv4 via the temporary credentials
3. sts validates the signature and session token cryptographically
4. returns identity information

response for sso-sourced credentials:

```json
{
  "UserId": "AROAEXAMPLE:username@company.com",
  "Account": "111122223333",
  "Arn": "arn:aws:sts::111122223333:assumed-role/AWSReservedSSO_PowerUserRole_abc123/username@company.com"
}
```

the arn reveals sso origin: `AWSReservedSSO_<PermissionSetName>_<hash>` as the role name, with the identity center username as the session name.

key fact: `GetCallerIdentity` requires **no iam permissions**. it always succeeds if the credentials are valid, even with an explicit deny policy.

**source:** [GetCallerIdentity api reference — aws sts](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html)

## .token refresh flow

```
sdk needs credentials
        |
        v
read cached accessToken from ~/.aws/sso/cache/<hash>.json
        |
        v
is accessToken valid (not expired)?
   |              |
  yes             no
   |              |
   v              v
   |         has refreshToken?
   |           |          |
   |          yes         no
   |           |          |
   |           v          v
   |    call CreateToken   FAIL: "run aws sso login"
   |    with refreshToken
   |           |
   |           v
   |    identity center
   |    session still active?
   |       |          |
   |      yes         no
   |       |          |
   |       v          v
   |    new token     FAIL: "run aws sso login"
   |       |
   v       v
call GetRoleCredentials(accessToken, accountId, roleName)
        |
        v
return STS temporary credentials
        |
        v
when sts creds expire, repeat automatically
```

**source:** [iam identity center credential provider](https://docs.aws.amazon.com/sdkref/latest/guide/feature-sso-credentials.html)

## .keyrack protection grades: what's honest

### the key distinction: identity layer vs static key

keyrack is a **broker across unrelated identity systems**, not an identity layer itself:

```
keyrack daemon
    ├── aws sso        → has its own idp, own tokens, own credential chain
    ├── gcp adc        → has its own sa resolution, own token refresh
    ├── 1password       → has its own vault, own cli resolution
    ├── openai         → static api key, no refresh, no session concept
    ├── stripe         → static secret key, rotatable but not refreshable
    └── github pat     → static token, own expiry model
```

aws sso can provide layered ephemerality because it **is** the identity layer — it controls the full chain from human authentication to api credential. keyrack can't provide ephemerality for systems that don't support it. **keyrack can only be as ephemeral as the originator allows.**

### protection grades (honest model)

| grade | what it means | originator supports ephemerality? | keyrack's role | ttl possible? |
|-------|---------------|-----------------------------------|----------------|---------------|
| **reference** | originator has its own identity layer | **yes** — originator manages ttl + refresh | pointer storage + session health check | **yes** — originator enforces it |
| **encrypted** | originator issues static keys | **no** — key is valid until manually rotated | encrypted storage + access gate + audit | **no** — grant ttl is theater; a leaked key is still valid |
| **plaintext** | originator issues static keys, stored unencrypted | **no** — key is valid until manually rotated | access gate + audit only | **no** — same as encrypted |

### why grant ttl is theater for static keys

if openai gives you `sk-abc123` and that key is valid until manually rotated, keyrack can say "this grant expires in 1 hour" — but if the key leaked within that hour, the attacker has a key that works forever. the ttl on the grant doesn't help.

real ephemerality requires the **originator** to support it:
- aws sso: sts creds expire in 1-12h, enforced server-side — real ttl
- openai: api key is valid until rotated by human — no ttl possible
- stripe: secret key is valid until rotated by human — no ttl possible

### what keyrack can honestly do per grade

| grade | encrypt at rest | gate access behind unlock | audit who accessed when | enforce ttl | auto-refresh |
|-------|----------------|--------------------------|------------------------|-------------|--------------|
| **reference** | n/a (not a secret) | yes | yes | **yes** (via originator) | **yes** (via vault adapter) |
| **encrypted** | yes | yes | yes | **no** (theater) | **no** (static key) |
| **plaintext** | no | yes | yes | **no** (theater) | **no** (static key) |

### the reference pattern: when to use it

for any system with its own credential resolution chain, keyrack should **always** prefer the reference pattern:

| system | reference stored by keyrack | who resolves to actual creds | ephemerality |
|--------|---------------------------|------------------------------|--------------|
| aws sso | `AWS_PROFILE=ehmpathy.dev` | aws sdk | real (1-12h sts creds) |
| gcp adc | `GOOGLE_APPLICATION_CREDENTIALS=path` | gcloud sdk | real (1h oauth tokens) |
| 1password | `op://vault/item/field` | op cli | real (30min session) |
| openai | n/a — must hand raw `sk-*` key | n/a | none |
| stripe | n/a — must hand raw `sk_*` key | n/a | none |

> **when the target system has its own identity layer, keyrack defers to it (reference pattern). when it doesn't, keyrack becomes the security layer by default — and must be honest that it provides access control and audit, not ephemerality.**

## .keyrack integration: the full flow

```
mechanic requests AWS_PROFILE grant
        |
        v
keyrack daemon reads stored reference: "ehmpathy.dev"
        |
        v
daemon validates session: aws sts get-caller-identity --profile ehmpathy.dev
        |
   ┌────┴────┐
  valid    expired
   |          |
   v          v
return     trigger aws.iam.sso vault unlock:
grant      aws sso login --profile ehmpathy.dev
immediately    |
               v
          human approves in browser
               |
               v
          re-validate via get-caller-identity
               |
               v
          return grant with fresh expiration
```

the mechanic receives the profile name as the grant secret. the sdk in the mechanic's process resolves it to sts credentials via the standard chain. keyrack never touches the actual credentials.

## .keyrack as broker: the security cap

keyrack's broker architecture is as secure as it gets. for any key it manages:

- **encrypted at rest** — secrets are encrypted before they touch disk
- **gated behind unlock** — no grant without an unlocked vault
- **audited per access** — every grant request is logged with mechanic identity + timestamp
- **process-scoped delivery** — grants are delivered as env vars on the mechanic's process, not written to files

there is no further improvement to make at the broker layer. keyrack cannot make a static key ephemeral. it cannot enforce ttl on a key the originator considers permanent. it cannot revoke a leaked key on the originator's behalf.

**the only work left is to increase the coverage of ephemeral mech vaults** — vault adapters that unlock reference-grade access for originators that support it. each new vault adapter is a ratchet click: once a key moves from encrypted to reference, the actual secret leaves keyrack's domain permanently and lives where it belongs — in the originator's own identity layer.

### vault adapter candidates

| originator | today | opportunity | vault adapter | reference value | ephemeral ttl |
|------------|-------|-------------|---------------|-----------------|---------------|
| **aws sso** | static keys or manual | **reference via sso profile** | `aws.iam.sso` | `AWS_PROFILE=ehmpathy.dev` | 1-12h (sts) |
| **gcp** | static sa key json | **workload identity federation** | `gcp.iam.wif` | `GOOGLE_APPLICATION_CREDENTIALS=path` | 1h (oauth) |
| **github** | static pat | **github app installation tokens** | `github.app` | app id + private key via installation token | 1h |
| **1password** | static lookup | **op cli session** | `op.session` | `op://vault/item/field` | 30min |
| **openai** | static api key | **none — genuinely static** | n/a | n/a | n/a |
| **stripe** | static secret key | **restricted keys** (narrower scope, not ephemeral) | n/a | n/a | n/a |
| **anthropic** | static api key | **none — genuinely static** | n/a | n/a | n/a |

### the ratchet

```
today:     most keys are encrypted grade (static, keyrack holds the secret)
                                    |
                                    v
each new vault adapter:    one more key class moves to reference grade
                                    |
                                    v
ideal state:    keyrack holds only pointers — never secrets
                only genuinely static keys (openai, stripe) remain encrypted
                the attack surface of a keyrack breach = profile names + static api keys
```

the roadmap is not "improve keyrack" — it's "build more vault adapters." each adapter removes a class of secrets from keyrack's domain entirely.

## .sources

- [iam identity center credential provider — aws sdks and tools](https://docs.aws.amazon.com/sdkref/latest/guide/feature-sso-credentials.html)
- [iam identity center authentication resolution — aws sdks and tools](https://docs.aws.amazon.com/sdkref/latest/guide/understanding-sso.html)
- [iam identity center authentication via aws cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [iam identity center token provider configuration — aws cli](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html)
- [default credentials provider chain — aws sdk for java 2.x](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html)
- [standardized credential providers — aws sdks and tools](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html)
- [GetRoleCredentials api reference — iam identity center portal api](https://docs.aws.amazon.com/singlesignon/latest/PortalAPIReference/API_GetRoleCredentials.html)
- [CreateToken api reference — iam identity center oidc api](https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html)
- [GetCallerIdentity api reference — aws sts](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html)
- [get-caller-identity cli reference — aws cli](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
