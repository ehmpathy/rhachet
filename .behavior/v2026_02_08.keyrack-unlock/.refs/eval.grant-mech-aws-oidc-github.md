# eval: grant mechanism — EPHEMERAL_VIA_AWS_OIDC (github actions)

> in CI, keyrack handles aws credential exchange uniformly. the keyrack action receives an OIDC config blob, exchanges the github jwt for aws temp credentials, and exports them — same pattern as github app tokens. no host manifest needed.

---

## the question

how should the `rhachet/keyrack` github action handle aws credentials in CI? can we use the same self-described json blob pattern as github app tokens?

---

## the answer: github OIDC federation + keyrack action

github actions provides an OIDC provider that mints signed jwts per job. these jwts can be exchanged for temporary aws credentials via `sts:AssumeRoleWithWebIdentity`. the keyrack action can handle this exchange via a `mechAdapterAwsOidc` — same pattern as `mechAdapterGithubApp`.

```
github.actions.oidc.flow
├─ what: github OIDC provider mints jwt for each job
├─ jwt claims: repo, branch, actor, environment, workflow, job_workflow_ref
├─ exchange: jwt → aws sts:AssumeRoleWithWebIdentity → temp credentials
├─ lifetime: temp credentials live 1h (default, configurable up to 12h)
├─ scope: constrained by IAM role trust policy (which repos, branches, envs)
├─ secrets required: zero — trust is via OIDC federation, not stored secrets
└─ cost: zero — no secrets to store, no keys to rotate
```

**key insight: the keyrack action can handle the OIDC exchange directly.** no need for `aws-actions/configure-aws-credentials` as a separate step.

---

## the self-described json blob

the github secret (or action input) stores a json blob that declares its own mechanism:

```json
{
  "mech": "EPHEMERAL_VIA_AWS_OIDC",
  "roleArn": "arn:aws:iam::123456789012:role/my-deploy-role",
  "region": "us-east-1",
  "sessionDuration": 3600
}
```

the keyrack action parses this blob, sees `mech: EPHEMERAL_VIA_AWS_OIDC`, and runs `mechAdapterAwsOidc`.

### blob fields

| field | required | what |
|-------|----------|------|
| `mech` | yes | `EPHEMERAL_VIA_AWS_OIDC` — tells keyrack which adapter to use |
| `roleArn` | yes | the IAM role to assume via OIDC federation |
| `region` | yes | aws region for sts endpoint |
| `sessionDuration` | no | temp credential lifetime in seconds (default 3600, max 43200) |

### why no secrets in the blob

unlike the github app blob (which contains `privateKey`), the aws OIDC blob contains **zero secrets**. the `roleArn` is non-sensitive — it's an identifier, not a credential. the actual auth comes from the github OIDC jwt, which the action requests from the github runtime.

```
security.comparison
├─ EPHEMERAL_VIA_GITHUB_APP blob
│  ├─ contains: privateKey (sensitive)
│  ├─ stored as: GitHub secret (encrypted)
│  └─ why: private key is needed to sign jwt for token exchange
│
└─ EPHEMERAL_VIA_AWS_OIDC blob
   ├─ contains: roleArn (non-sensitive)
   ├─ stored as: GitHub variable or secret (either works — non-sensitive)
   └─ why: trust comes from OIDC federation, not stored secrets
```

this means the aws OIDC blob could be stored as a github **variable** (not secret) — but for uniformity with other keyrack secrets, it flows through the same `secrets:` input.

---

## the token exchange flow

```
oidc.exchange.flow
├─ 1. keyrack action requests OIDC jwt from github runtime
│  ├─ calls: ACTIONS_ID_TOKEN_REQUEST_URL (available when `id-token: write` is set)
│  ├─ result: signed jwt with claims { repo, branch, actor, environment, ... }
│  └─ lifetime: single-use, seconds
│
├─ 2. keyrack action calls aws sts:AssumeRoleWithWebIdentity
│  ├─ params: { RoleArn, WebIdentityToken: jwt, RoleSessionName, DurationSeconds }
│  ├─ aws validates: jwt signature (via github OIDC provider public keys)
│  ├─ aws validates: trust policy conditions (repo, branch, env match)
│  ├─ result: { AccessKeyId, SecretAccessKey, SessionToken, Expiration }
│  └─ lifetime: 1h default (configurable up to 12h)
│
├─ 3. keyrack action exports credentials
│  ├─ core.exportVariable('AWS_ACCESS_KEY_ID', creds.AccessKeyId)
│  ├─ core.exportVariable('AWS_SECRET_ACCESS_KEY', creds.SecretAccessKey)
│  ├─ core.exportVariable('AWS_SESSION_TOKEN', creds.SessionToken)
│  ├─ core.exportVariable('AWS_DEFAULT_REGION', input.region)
│  └─ masks secret values from logs
│
└─ 4. subsequent steps use aws credentials directly
   └─ aws sdk, terraform, aws cli — all read from env
```

### prerequisite: IAM role trust policy

the IAM role must have a trust policy that allows github OIDC:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:ehmpathy/*:*"
        }
      }
    }
  ]
}
```

the trust policy is where access control lives — it constrains which repos, branches, and environments can assume the role. the keyrack action does not manage this; it only performs the exchange.

### prerequisite: workflow permissions

the workflow must request `id-token: write` permission:

```yaml
permissions:
  id-token: write
  contents: read
```

without this, the github runtime does not expose the OIDC token request endpoint.

---

## keyrack action flow

```
keyrack.ci.flow.aws.oidc
├─ keyrack.yml declares: AWS_CREDS: ephemeral
│
├─ workflow passes config as input to rhachet/keyrack action
│  └─ config value: { mech: EPHEMERAL_VIA_AWS_OIDC, roleArn, region }
│
├─ action parses JSON → sees mech: EPHEMERAL_VIA_AWS_OIDC
│
├─ action runs mechAdapterAwsOidc
│  ├─ request OIDC jwt from github runtime
│  ├─ call sts:AssumeRoleWithWebIdentity with jwt + roleArn
│  └─ result: { AccessKeyId, SecretAccessKey, SessionToken, Expiration }
│
├─ action exports credentials to env
│  ├─ AWS_ACCESS_KEY_ID=ASIA...
│  ├─ AWS_SECRET_ACCESS_KEY=...
│  ├─ AWS_SESSION_TOKEN=...
│  └─ AWS_DEFAULT_REGION=us-east-1
│
└─ no keyrack.host.yml needed — spec + config are sufficient
```

---

## workflow example

```yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: rhachet/keyrack@v1
        with:
          secrets: |
            AWS_CREDS={"mech":"EPHEMERAL_VIA_AWS_OIDC","roleArn":"arn:aws:iam::123456789012:role/deploy","region":"us-east-1"}
        # reads keyrack.yml → AWS_CREDS: ephemeral
        # parses config JSON → sees mech: EPHEMERAL_VIA_AWS_OIDC
        # requests OIDC jwt from github runtime
        # exchanges jwt for temp aws credentials via sts
        # exports AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN

      - run: terraform plan && terraform apply -auto-approve
        # aws credentials are available in env
```

---

## key design: what slug for aws credentials?

on dev machines, `AWS_PROFILE` is the key slug — it's a reference (non-sensitive pointer). in CI via OIDC, the output is raw credentials (`AWS_ACCESS_KEY_ID`, etc) — these are sensitive.

two options:

### option A: single slug with multi-export

```yaml
# keyrack.yml
keys:
  AWS_CREDS: ephemeral  # adapter exports multiple env vars from one slug
```

the adapter knows that aws credentials are a bundle (`AccessKeyId` + `SecretAccessKey` + `SessionToken` + `Region`) and exports all four. the slug `AWS_CREDS` is a logical key that maps to multiple env vars.

### option B: per-env-var slugs

```yaml
# keyrack.yml
keys:
  AWS_ACCESS_KEY_ID: ephemeral
  AWS_SECRET_ACCESS_KEY: encrypted,ephemeral
  AWS_SESSION_TOKEN: encrypted,ephemeral
  AWS_DEFAULT_REGION: ephemeral
```

each env var is a separate slug. more explicit, but verbose.

### recommendation: option A (single slug with multi-export)

aws credentials are always a bundle. they make no sense individually. a single logical key that exports multiple env vars matches the domain reality.

this also aligns with how `AWS_PROFILE` works on dev machines — one slug, the sdk resolves the rest.

---

## dev machines vs CI: aws credential comparison

| dimension | dev machine | CI (github actions) |
|-----------|-------------|---------------------|
| credential source | aws sso (browser auth) | OIDC federation (zero secrets) |
| mechanism | `EPHEMERAL_VIA_AWS_SSO` | `EPHEMERAL_VIA_AWS_OIDC` |
| key slug | `AWS_PROFILE` (reference) | `AWS_CREDS` (multi-export) |
| key value | profile name (non-sensitive) | temp credentials (sensitive) |
| grade.protection | reference | encrypted (values are secrets) |
| grade.duration | ephemeral (sso session) | ephemeral (1h default) |
| exchange performed by | aws sso login (browser) | keyrack action (OIDC → sts) |
| secrets stored | none (sso is interactive) | none (OIDC is federated) |
| manifest needed | keyrack.yml + keyrack.host.yml | keyrack.yml only |
| unlock required | yes (browser auth) | no (action inputs from config) |

**the pattern: both dev and CI produce ephemeral aws credentials. the difference is only the exchange mechanism (sso vs OIDC) and where config comes from (host manifest vs action input).**

---

## comparison with dedicated aws-actions

| dimension | `aws-actions/configure-aws-credentials` | `rhachet/keyrack` action |
|-----------|----------------------------------------|--------------------------|
| scope | aws only | any mechanism (github app, aws OIDC, etc) |
| config | action-specific inputs | self-described json blob |
| keyrack integration | none (separate step) | native (reads keyrack.yml, validates grades) |
| grade validation | none | validates spec grade requirements |
| key firewall | none | only grants keys declared in keyrack.yml |
| multiple mechanisms | one action per mechanism | one action for all mechanisms |

**the advantage: keyrack handles aws OIDC alongside github app tokens in the same action.** one step, one config format, one firewall. no need to compose multiple third-party actions.

---

## mechAdapterAwsOidc implementation sketch

```ts
/**
 * .what = exchanges github OIDC jwt for aws temp credentials
 * .why = uniform mechanism adapter for aws credentials in CI
 */
const mechAdapterAwsOidc = async (
  input: {
    config: {
      mech: 'EPHEMERAL_VIA_AWS_OIDC';
      roleArn: string;
      region: string;
      sessionDuration?: number;
    };
  },
): Promise<{
  exports: Record<string, string>;
  grade: KeyrackKeyGrade;
  expiresAt: string;
}> => {
  // request OIDC jwt from github runtime
  const jwt = await core.getIDToken('sts.amazonaws.com');

  // exchange jwt for temp credentials via sts
  const sts = new STSClient({ region: input.config.region });
  const response = await sts.send(
    new AssumeRoleWithWebIdentityCommand({
      RoleArn: input.config.roleArn,
      WebIdentityToken: jwt,
      RoleSessionName: 'keyrack',
      DurationSeconds: input.config.sessionDuration ?? 3600,
    }),
  );

  // return credentials as multi-export
  return {
    exports: {
      AWS_ACCESS_KEY_ID: response.Credentials.AccessKeyId,
      AWS_SECRET_ACCESS_KEY: response.Credentials.SecretAccessKey,
      AWS_SESSION_TOKEN: response.Credentials.SessionToken,
      AWS_DEFAULT_REGION: input.config.region,
    },
    grade: { protection: 'encrypted', duration: 'ephemeral' },
    expiresAt: response.Credentials.Expiration.toISOString(),
  };
};
```

### dependencies

| package | what | why |
|---------|------|-----|
| `@actions/core` | `core.getIDToken()` | request OIDC jwt from github runtime |
| `@aws-sdk/client-sts` | `AssumeRoleWithWebIdentityCommand` | exchange jwt for temp credentials |

these are the only two dependencies needed. `@actions/core` is already required for any github action; `@aws-sdk/client-sts` is a single-purpose sdk client.

---

## the multi-export pattern

the aws OIDC adapter introduces a pattern not present in the github app adapter: **one slug produces multiple env vars.**

```
adapter.output.patterns
├─ EPHEMERAL_VIA_GITHUB_APP
│  ├─ input slug: GITHUB_TOKEN
│  ├─ output: single env var (GITHUB_TOKEN=ghs_*)
│  └─ 1:1 slug-to-export
│
└─ EPHEMERAL_VIA_AWS_OIDC
   ├─ input slug: AWS_CREDS
   ├─ output: four env vars
   │  ├─ AWS_ACCESS_KEY_ID
   │  ├─ AWS_SECRET_ACCESS_KEY
   │  ├─ AWS_SESSION_TOKEN
   │  └─ AWS_DEFAULT_REGION
   └─ 1:N slug-to-export
```

the action entrypoint must support adapters that return `exports: Record<string, string>` instead of a single value. each entry in the record is exported as a separate env var.

this also means the keyrack.yml spec covers the logical key (`AWS_CREDS`), not the individual env vars. the adapter knows which env vars to produce — the spec just validates the grade.

---

## what this means for the keyrack action

1. **same self-described json blob pattern** — `{ mech, ...config }` tells the action which adapter to run
2. **mechAdapterAwsOidc is a new adapter** — handles OIDC jwt request + sts exchange
3. **multi-export support needed** — adapter returns `Record<string, string>` not a single value
4. **zero secrets stored in github** — OIDC config blob contains only `roleArn` + `region` (non-sensitive)
5. **prerequisite: IAM trust policy** — must be configured once per aws account; the keyrack action does not manage this
6. **prerequisite: `id-token: write` permission** — workflow must request this; keyrack action should validate and fail fast if absent
7. **no host manifest needed** — keyrack.yml spec + self-described blob are sufficient

---

## the credential chain

```
credential.chain.aws.oidc
├─ level 0: IAM trust policy (permanent, in aws account)
│  ├─ what: allows github OIDC provider to assume role
│  ├─ blast radius: constrained by trust policy conditions (repo, branch, env)
│  └─ managed by: terraform (not keyrack)
│
├─ level 1: github OIDC jwt (transient, seconds)
│  ├─ what: signed jwt with repo/branch/actor claims
│  ├─ blast radius: single-use, dies after exchange
│  └─ produced by: github runtime (automatic)
│
├─ level 2: aws temp credentials (ephemeral, 1h default)
│  ├─ what: AccessKeyId + SecretAccessKey + SessionToken
│  ├─ blast radius: scoped to IAM role permissions, 1h
│  └─ produced by: keyrack mechAdapterAwsOidc
│
└─ keyrack only touches level 2
   ├─ level 0 is managed by terraform
   ├─ level 1 is transient (dies after exchange)
   └─ level 2 is exported to env for tools to use
```

---

## open questions

1. **slug design**: should `AWS_CREDS` be the standard slug for multi-export aws credentials? or should each env var be a separate slug?
2. **keyrack.yml format for multi-export**: how does the spec declare a key that produces multiple env vars? is the slug sufficient, or does the spec need to name the child exports?
3. **multiple aws roles**: if a workflow needs credentials for two different aws accounts (e.g., deploy role + monitor role), should the keyrack action support two separate OIDC exchanges? (likely yes — two slugs, two blobs, two adapters)
4. **dev machine OIDC**: could `EPHEMERAL_VIA_AWS_OIDC` also work on dev machines (e.g., via `gh auth token` for OIDC)? or is OIDC strictly a CI mechanism?

---

## sources

- [openid connect in github actions — github docs](https://docs.github.com/en/actions/concepts/security/openid-connect) — OIDC overview
- [configure aws credentials for github actions — github](https://github.com/aws-actions/configure-aws-credentials) — reference implementation
- [aws sts AssumeRoleWithWebIdentity — aws docs](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html) — sts exchange api
- [github OIDC token claims — github docs](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud) — jwt claim structure
- [IAM role trust policies for github OIDC — aws docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html) — trust policy setup
