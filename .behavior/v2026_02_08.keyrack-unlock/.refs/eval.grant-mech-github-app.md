# eval: grant mechanism — EPHEMERAL_VIA_GITHUB_APP

> keyrack wraps the github app token exchange. the key is `GITHUB_TOKEN`. the mechanism ensures it's a valid, short-lived installation token.

---

## the pattern: declastruct-github today

declastruct-github uses `GITHUB_TOKEN` + github app installation tokens to authenticate. the token exchange follows the github app oauth2 pattern: private key → jwt → installation token.

```
declastruct.github.auth.today
├─ human runs: use.github.declastruct.test (shell alias)
│  ├─ reads app_id + app_private_key from 1password
│  ├─ get_github_app_token() creates jwt (signed with private key)
│  ├─ exchanges jwt for installation id via github api
│  ├─ exchanges installation id for installation access token (ghs_*)
│  ├─ export GITHUB_TOKEN=$token (valid for 1 hour)
│  └─ verifies identity: app slug, org, repos
│
├─ octokit client uses GITHUB_TOKEN directly
│  ├─ new Octokit({ auth: context.github.token })
│  ├─ all api calls use this token in Authorization header
│  └─ cached per token via withSimpleCache
│
└─ the token IS the credential (unlike aws sso where it's a pointer)
   ├─ GITHUB_TOKEN=ghs_abc123 (actual installation access token)
   ├─ 1h expiry (github-enforced, non-renewable)
   └─ scoped to specific repos + permissions declared on the app
```

ref: [declastruct-github provision/github.apps](https://github.com/ehmpathy/declastruct-github/tree/main/provision/github.apps)

---

## the token exchange flow

the github app authentication is a multi-step exchange that converts long-lived app credentials into short-lived installation tokens.

```
token.exchange.flow
├─ 1. app credentials (long-lived, stored in 1password)
│  ├─ app_id: "123456"
│  └─ app_private_key: "-----BEGIN RSA PRIVATE KEY-----\n..."
│
├─ 2. create jwt (short-lived, 10min expiry)
│  ├─ header: { alg: RS256, typ: JWT }
│  ├─ payload: { iat, exp: now+600, iss: app_id }
│  ├─ sign with private key via openssl dgst -sha256
│  └─ result: jwt token (valid for 10 minutes)
│
├─ 3. get installation id
│  ├─ GET /orgs/{org}/installation (auth: Bearer $jwt)
│  ├─ response: { id: 12345678, app_slug: "declastruct-github-test-auth" }
│  └─ identifies which installation of this app to use
│
├─ 4. exchange for installation token
│  ├─ POST /app/installations/{id}/access_tokens (auth: Bearer $jwt)
│  ├─ response: { token: "ghs_abc123", expires_at: "2026-02-08T10:00:00Z" }
│  └─ result: installation access token (valid for 1 hour)
│
└─ 5. use token
   ├─ export GITHUB_TOKEN=ghs_abc123
   ├─ octokit, gh cli, and github api all accept this token
   └─ scoped to the app's declared permissions + installed repos
```

the key insight: the app credentials (app_id + private_key) are **permanent and sensitive**. the installation token is **ephemeral and scoped**. the exchange converts a broad, long-lived secret into a narrow, short-lived credential.

---

## how this differs from aws sso

```
comparison.aws.vs.github
├─ aws sso (EPHEMERAL_VIA_AWS_SSO)
│  ├─ unlock: browser-based interactive auth
│  ├─ key value: AWS_PROFILE=ehmpathy.demo (reference — non-sensitive)
│  ├─ grade.protection: reference (pointer to auth state)
│  ├─ actual credentials: in sdk memory, never in env
│  └─ keyrack stores: the profile name (non-sensitive pointer)
│
└─ github app (EPHEMERAL_VIA_GITHUB_APP)
   ├─ unlock: exchange app creds (from 1password) for installation token
   ├─ key value: GITHUB_TOKEN=ghs_abc123 (actual credential)
   ├─ grade.protection: encrypted (value IS the secret)
   ├─ actual credentials: in env var, used directly by tools
   └─ keyrack stores: the installation token (sensitive, short-lived)
```

aws sso produces a **reference key** (non-sensitive pointer). github app produces a **secret key** (actual credential). both are ephemeral (short-lived), but the protection grade differs.

---

## keyrack integration

### keyrack.yml spec

```yaml
# keyrack.yml (in repo)
keys:
  GITHUB_TOKEN: encrypted,ephemeral  # requires encrypted + ephemeral
```

`encrypted,ephemeral` means the key must be stored encrypted (it's a real credential) and must be short-lived. `EPHEMERAL_VIA_GITHUB_APP` satisfies both — the token is a sensitive credential (encrypted) that expires in 1 hour (ephemeral).

### keyrack.host.yml host

```yaml
# keyrack.host.yml (on machine)
keys:
  GITHUB_TOKEN:
    vault: os.secure          # or 1password — stores app creds as JSON
    mech: GITHUB_APP
    # vault stores: { appId, privateKey, installationId } as JSON blob
    # mechanism adapter translates JSON → installation token at get time
    # grade: { protection: encrypted, duration: ephemeral }
```

the host declares:
1. vault (os.secure, 1password, etc) — where the app credentials JSON is stored
2. mechanism (`GITHUB_APP`) — tells keyrack how to translate the stored value

the `GITHUB_APP` mechanism adapter knows how to:
1. parse the stored JSON blob (`{ appId, privateKey, installationId }`)
2. create jwt signed with private key via `@octokit/auth-app`
3. exchange jwt for installation access token
4. return the token with 55-min TTL (clock drift buffer on github's 1h limit)

---

## unlock flow: EPHEMERAL_VIA_GITHUB_APP

```
unlock.flow.github.app
├─ 1. keyrack reads keyrack.host.yml → vault: os.secure (or 1password), mech: GITHUB_APP
│
├─ 2. retrieve app credentials JSON from vault
│  ├─ unlock vault (passphrase for os.secure, biometric for 1password)
│  ├─ read stored JSON: { appId, privateKey, installationId }
│  └─ if absent → fail fast: "app credentials not found in vault"
│
├─ 3. mechanism adapter translates JSON → installation token
│  ├─ @octokit/auth-app handles jwt creation + token exchange internally
│  ├─ result: { token: "ghs_*", expiresAt: now + 55min }
│  └─ if fail → fail fast: "failed to exchange for installation token"
│
├─ 4. store in daemon
│  ├─ slug: GITHUB_TOKEN
│  ├─ key.secret: "ghs_abc123" (the installation token — sensitive)
│  ├─ key.grade: { protection: encrypted, duration: ephemeral }
│  └─ expiresAt: 55 minutes from now (clock drift buffer on github's 1h limit)
│
└─ 5. done
   └─ "GITHUB_TOKEN unlocked (expires in ~1h)"
```

note: the app credentials (appId + privateKey) stay in their source vault and are fetched fresh on each unlock. only the produced installation token is cached in daemon memory.

---

## get flow: GITHUB_TOKEN

```
get.flow.github.token
├─ 1. keyrack reads keyrack.yml → requires GITHUB_TOKEN
├─ 2. connect to daemon → request slug GITHUB_TOKEN
├─ 3. daemon returns: { secret: "ghs_abc123", grade: {...}, expiresAt: ... }
│
├─ 4. validate TTL
│  ├─ check expiresAt against current time
│  ├─ if valid → proceed
│  └─ if expired → fail: "github app token expired. run `rhx keyrack unlock`"
│
├─ 5. export: GITHUB_TOKEN=ghs_abc123
│  └─ tools (octokit, gh cli, github api) use this token directly
│
└─ 6. done
   └─ tool uses GITHUB_TOKEN → api calls → scoped to app permissions
```

note: unlike aws sso reference keys, there's no usability check beyond TTL. the token either works or it doesn't — github doesn't support server-side revocation of installation tokens before expiry (they can only revoke the app itself).

---

## the credential chain

the github app flow has a credential chain with distinct security grades at each level:

```
credential.chain
├─ level 0: app_private_key (permanent, encrypted, in 1password)
│  ├─ grade: { protection: encrypted, duration: permanent }
│  ├─ blast radius: can generate tokens for ANY installation of this app
│  └─ stored in: 1password (never in keyrack, never on disk)
│
├─ level 1: jwt (transient, 10min, in memory only)
│  ├─ grade: { protection: encrypted, duration: transient }
│  ├─ blast radius: can get installation tokens for 10 minutes
│  └─ stored in: process memory at unlock time (never persisted)
│
├─ level 2: installation_token (ephemeral, 1h, in daemon)
│  ├─ grade: { protection: encrypted, duration: ephemeral }
│  ├─ blast radius: scoped to installed repos + declared permissions, 1h
│  └─ stored in: daemon memory (keyrack caches this level)
│
└─ keyrack only touches level 2
   ├─ level 0 stays in 1password (source vault)
   ├─ level 1 is transient (dies after exchange)
   └─ level 2 is cached in daemon for tools to use
```

this chain narrows blast radius at each step. the keyrack only caches the most constrained level — the installation token with scoped permissions and 1h expiry.

---

## comparison: github app vs github pat

github also supports personal access tokens (PATs). the keyrack should guide teams toward app tokens for machine-to-machine auth.

| dimension | github app token | personal access token (PAT) |
|-----------|-----------------|----------------------------|
| token format | `ghs_*` (installation) | `ghp_*` (classic) or `github_pat_*` (fine-grained) |
| lifespan | 1h (github-enforced) | indefinite or custom expiry |
| permissions | declared per-app, scoped per-installation | per-token, user-scoped |
| identity | app[bot] (machine identity) | human user identity |
| revocation | revoke app or installation | revoke individual token |
| blast radius | scoped repos + permissions, 1h | all repos user can access, long-lived |
| keyrack mechanism | EPHEMERAL_VIA_GITHUB_APP | PERMANENT_VIA_REPLICA |
| keyrack grade | { protection: encrypted, duration: ephemeral } | { protection: encrypted, duration: permanent } |

app tokens are preferred for machine-to-machine auth because:
1. shorter blast radius (1h vs indefinite)
2. machine identity (actions attributed to bot, not human)
3. permission scoped to app declaration (not user's full access)

---

## token type detection

declastruct-github detects token type by prefix to adjust api behavior:

```
token.type.detection
├─ ghs_*  → github app installation token (short-lived, scoped)
│  └─ uses: GET /installation/repositories (app-scoped endpoint)
│
├─ ghp_*  → classic personal access token (long-lived)
│  └─ uses: GET /user/installations/{id}/repositories (user-scoped endpoint)
│
└─ github_pat_* → fine-grained personal access token
   └─ uses: same as classic PAT
```

keyrack doesn't need to detect token type — it stores whatever `GITHUB_TOKEN` value the mechanism produces. the tool that consumes the token (octokit, gh cli) handles the rest.

---

## implementation status

the `GITHUB_APP` mechanism is **fully implemented today** in `mechAdapterGithubApp.ts`:

```
implementation.status
├─ token exchange via @octokit/auth-app  ✅ implemented
├─ ghs_* token validation                ✅ implemented
├─ 55-min TTL (clock drift buffer)       ✅ implemented
├─ 1password vault for app creds         ✅ implemented
├─ os.secure vault for app creds         ✅ implemented
└─ app credentials stored as JSON blob   ✅ implemented
   └─ { appId, privateKey, installationId }
```

the host manifest stores the app credentials JSON directly in whatever vault is declared (os.secure, 1password, etc). the mechanism adapter parses that JSON and exchanges it for an installation token at `get` time.

**no github-specific changes are required.** the work left is shared across all mechanisms:

```
shared.changes (not github-specific)
├─ os.daemon vault          → replaces os.direct cache for all mechanisms
├─ KeyrackKey with .grade   → adds grade to all keys
├─ grade non-degradation    → enforced for all mechanisms
├─ mechanism rename          → GITHUB_APP → EPHEMERAL_VIA_GITHUB_APP
└─ per-key daemon storage   → applies to all mechanisms
```

---

## what this means for the vision

1. **EPHEMERAL_VIA_GITHUB_APP produces a secret key** — unlike aws sso (reference key), the installation token IS the credential
2. **grade: { protection: encrypted, duration: ephemeral }** — the token is sensitive (must be encrypted at rest) and short-lived (1h github-enforced)
3. **credential chain narrows blast radius** — app creds (permanent, broad) → jwt (transient) → installation token (ephemeral, scoped)
4. **keyrack only caches the installation token** — app credentials stay in their source vault (1password), jwt is transient
5. **source vault for app credentials is configurable** — 1password, os.secure, or any vault that stores the app credentials JSON
6. **unlock is non-interactive** — unlike aws sso (browser auth), github app exchange is fully automated (no human in the loop after app creds are retrieved)
7. **no github-specific changes needed** — all work left (daemon, grades, rename) is shared across mechanisms

---

## sources

- [declastruct-github provision/github.apps](https://github.com/ehmpathy/declastruct-github/tree/main/provision/github.apps) — app provision and readme with `get_github_app_token()` function
- [declastruct-github getDeclastructGithubProvider.ts](https://github.com/ehmpathy/declastruct-github/blob/main/src/domain.operations/provider/getDeclastructGithubProvider.ts) — credential resolution via Octokit
- [declastruct-github hasContextWithAppToken.ts](https://github.com/ehmpathy/declastruct-github/blob/main/src/domain.operations/context/hasContextWithAppToken.ts) — token type detection
- [github docs: authenticate as a github app installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) — official token exchange flow
- [github docs: installation access token expiry](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app) — 1h token lifespan
