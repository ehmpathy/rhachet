# eval: grant mechanism — github actions (CI)

> in CI, keyrack handles token exchange uniformly. built-in tokens pass through. app tokens are exchanged by the keyrack action — same adapter, no host manifest needed.

---

## the question

when a github app is installed for use with rhachet, does CI need the private key to exchange for installation tokens? or does github actions already handle this?

---

## the answer: github actions already provisions `GITHUB_TOKEN`

github actions auto-provisions a `GITHUB_TOKEN` for every workflow job. it is already an installation access token (`ghs_*`) — the same format that the `EPHEMERAL_VIA_GITHUB_APP` mechanism produces on dev machines.

```
github.actions.token.provision
├─ what: built-in github app installed on every repo
├─ format: ghs_* (installation access token)
├─ lifetime: dies when job ends (max 24h)
├─ scope: single repo where workflow runs
├─ permissions: configurable per-workflow via `permissions:` key
├─ identity: github-actions[bot]
└─ cost: zero — no secrets to store, no app to install
```

**key insight: keyrack does not need to exchange tokens in CI.** the token is already there.

---

## three token mechanisms in github actions

### 1. built-in `GITHUB_TOKEN` (default)

every workflow job gets a fresh installation token. no secrets, no setup.

```yaml
permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-24.04
    steps:
      - env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

| dimension | value |
|-----------|-------|
| format | `ghs_*` |
| lifetime | job duration (max 24h) |
| scope | single repo |
| identity | `github-actions[bot]` |
| secrets required | none |
| cross-repo | no |
| triggers workflows | no (anti-recursion safeguard) |

### 2. github app token via `actions/create-github-app-token`

for when the built-in token is insufficient. requires app credentials stored as secrets.

```yaml
steps:
  - uses: actions/create-github-app-token@v1
    id: app-token
    with:
      app-id: ${{ vars.APP_ID }}
      private-key: ${{ secrets.APP_PRIVATE_KEY }}
      repositories: "repo-a,repo-b"
  - env:
      GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
```

| dimension | value |
|-----------|-------|
| format | `ghs_*` |
| lifetime | 1h (standard github app token) |
| scope | configurable (specific repos, org-wide) |
| identity | `app-name[bot]` (custom machine identity) |
| secrets required | app_id (variable) + private_key (secret) |
| cross-repo | yes |
| triggers workflows | yes |

### 3. OIDC token exchange (`id-token: write`)

for cloud credentials (aws, gcp, azure). no cloud secrets stored in github.

```yaml
permissions:
  id-token: write

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/my-role
      aws-region: us-east-1
```

| dimension | value |
|-----------|-------|
| format | signed jwt from github OIDC provider |
| lifetime | per-job (ephemeral) |
| scope | claims include repo, branch, actor, environment |
| secrets required | none (trust via OIDC federation) |
| use case | exchange for cloud provider temp credentials |

---

## when each mechanism applies

```
decision.tree
├─ need GITHUB_TOKEN for same-repo operations?
│  └─ use built-in GITHUB_TOKEN (default, zero config)
│  └─ keyrack: passthrough via os.envvar
│
├─ need cross-repo access or workflow triggers?
│  └─ use rhachet/keyrack action with app-private-key input
│     └─ requires: private_key stored as GitHub secret
│     └─ keyrack: same mechAdapterGithubApp as dev machines
│
├─ need cloud credentials (aws, gcp)?
│  └─ use OIDC token exchange (id-token: write)
│     └─ requires: trust policy on cloud provider, zero secrets in github
│
└─ need custom machine identity for commits?
   └─ use rhachet/keyrack action with app-private-key input
      └─ commits attributed to app-name[bot]
```

---

## what this means for keyrack in CI

### keyrack passthrough: `os.envvar` vault

in CI, the built-in `GITHUB_TOKEN` is already in the environment. keyrack reads it via the `os.envvar` vault — a passthrough that reads from `process.env`.

```
keyrack.ci.flow
├─ github actions provisions GITHUB_TOKEN (ghs_*)
├─ keyrack.yml declares: GITHUB_TOKEN: ephemeral
├─ keyrack get → checks os.envvar → found in process.env → granted
└─ no unlock needed, no daemon needed, no exchange needed
```

**the `os.envvar` vault already handles this today.** zero changes required.

### when a github app IS needed in CI

if a workflow needs cross-repo access or workflow triggers, the team installs a github app and stores its credentials as a GitHub secret — a self-described JSON blob. the `rhachet/keyrack` action parses the blob, sees the mechanism, and runs the same adapter as dev machines. no host manifest needed.

#### the secret shape: self-described JSON blob

the GitHub secret stores a JSON blob that declares its own mechanism:

```json
{
  "mech": "EPHEMERAL_VIA_GITHUB_APP",
  "appId": "123456",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "installationId": "12345678"
}
```

this is the same shape that os.secure and 1password store on dev machines. the mechanism field tells keyrack which adapter to use — no guesswork, no host manifest.

#### the flow

```
keyrack.ci.flow.with.app
├─ keyrack.yml declares: GITHUB_TOKEN: ephemeral
├─ workflow passes secret as input to rhachet/keyrack action
│  └─ secret value: { mech: EPHEMERAL_VIA_GITHUB_APP, appId, privateKey, installationId }
├─ action parses JSON → sees mech: EPHEMERAL_VIA_GITHUB_APP
├─ action runs mechAdapterGithubApp (same adapter as dev machines)
│  └─ privateKey → jwt → installation access token (ghs_*)
├─ action exports GITHUB_TOKEN=ghs_* to env
└─ no keyrack.host.yml needed — spec + secret are sufficient
```

```yaml
# workflow example
steps:
  - uses: rhachet/keyrack@v1
    with:
      secrets: |
        GITHUB_TOKEN=${{ secrets.RHACHET_GITHUB_APP_TOKEN }}
    # reads keyrack.yml → sees GITHUB_TOKEN: ephemeral
    # parses secret JSON → sees mech: EPHEMERAL_VIA_GITHUB_APP
    # runs mechAdapterGithubApp → exchanges for ghs_* token
    # exports GITHUB_TOKEN to env
```

**the secret self-describes its mechanism.** the keyrack action parses the JSON, finds `mech`, runs the adapter. same pattern as dev machines — the vault stores a JSON blob, the mechanism adapter parses it. only `keyrack.yml` is needed; no host manifest in CI.

#### why no host manifest in CI

on dev machines, `keyrack.host.yml` tells keyrack which vault stores each key and which mechanism to use. in CI, the secret JSON blob already contains the mechanism — `mech: EPHEMERAL_VIA_GITHUB_APP`. the action doesn't need to know where the secret came from, only what mechanism it declares.

```
dev machine: keyrack.host.yml → vault: os.secure, mech: GITHUB_APP → read vault → parse JSON → adapter
ci:          action input      → parse JSON → mech: EPHEMERAL_VIA_GITHUB_APP → adapter
```

the host manifest is just a lookup table that resolves to the same JSON blob. in CI, the blob is provided directly — so the lookup table is redundant.

### OIDC for cloud credentials

for aws credentials in CI, OIDC federation replaces sso:

```
keyrack.ci.flow.aws
├─ github OIDC provider mints jwt for this job
├─ aws-actions/configure-aws-credentials exchanges jwt → temp creds
├─ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN in env
├─ keyrack get → checks os.envvar → found → granted
└─ no secrets stored in github, no sso login needed
```

this aligns with `EPHEMERAL_VIA_GITHUB_OIDC` in the vision — but in practice, the current github actions handle the exchange. keyrack just passes through.

---

## dev machines vs CI: mechanism comparison

| dimension | dev machine | CI (github actions) |
|-----------|-------------|---------------------|
| GITHUB_TOKEN source | github app creds in vault | built-in or app creds in GitHub secrets |
| GITHUB_TOKEN mechanism | `EPHEMERAL_VIA_GITHUB_APP` | passthrough (built-in) or same adapter (app) |
| exchange performed by | keyrack `mechAdapterGithubApp` | keyrack action (same adapter) or github runtime |
| manifest needed | keyrack.yml + keyrack.host.yml | keyrack.yml only |
| unlock required | yes (vault passphrase, etc) | no (action inputs from secrets) |
| daemon needed | yes (session cache) | no (job-scoped, dies with job) |
| AWS credentials source | aws sso (browser auth) | OIDC federation (zero secrets) |
| AWS mechanism | `EPHEMERAL_VIA_AWS_SSO` | `os.envvar` passthrough (after OIDC exchange) |

**the pattern: keyrack uses the same mechanism adapters in CI and on dev machines. the difference is only where app credentials come from (GitHub secrets vs source vault) and that no host manifest is needed in CI — the spec is sufficient.**

---

## the built-in token's one limitation: no recursive triggers

events from `GITHUB_TOKEN` do not trigger new workflow runs (anti-recursion safeguard). this means:

```
limitation.no.recursive.triggers
├─ workflow A pushes a commit via GITHUB_TOKEN
│  └─ no push-triggered workflow fires
│
├─ workflow A creates a PR via GITHUB_TOKEN
│  └─ no pull_request-triggered workflow fires
│
└─ fix: use a github app token instead
   ├─ rhachet/keyrack action with app-private-key input
   ├─ produces a token that CAN trigger workflows
   └─ requires: private_key stored as GitHub secret
```

this is the primary reason teams install github apps for CI — not for auth, but for workflow composition.

---

## summary

1. **built-in `GITHUB_TOKEN` suffices for most CI needs** — auto-provisioned `ghs_*` token, zero config, passthrough via `os.envvar`
2. **github app tokens use the same adapter in CI** — `rhachet/keyrack` action receives private key from GitHub secrets, runs `mechAdapterGithubApp`, exports `ghs_*` token
3. **only `keyrack.yml` is needed in CI** — no host manifest required; the spec declares keys and grades, the action infers the mechanism from inputs
4. **no need for `actions/create-github-app-token`** — keyrack handles the exchange uniformly across dev and ci via the same mechanism adapter
5. **OIDC federation replaces AWS SSO in CI** — zero cloud secrets stored in github
6. **same firewall in CI** — keyrack action reads keyrack.yml, only grants declared keys at declared grades

---

## sources

- [automatic token authentication — github docs](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) — built-in GITHUB_TOKEN
- [actions/create-github-app-token — github](https://github.com/actions/create-github-app-token) — app token action
- [openid connect in github actions — github docs](https://docs.github.com/en/actions/concepts/security/openid-connect) — OIDC federation
- [the GITHUB_TOKEN in github actions — dev.to](https://dev.to/github/the-githubtoken-in-github-actions-how-it-works-change-permissions-customizations-3cgp) — permissions guide
- [ultimate guide to github actions authentication — michaelheap.com](https://michaelheap.com/ultimate-guide-github-actions-authentication/) — mechanism comparison
