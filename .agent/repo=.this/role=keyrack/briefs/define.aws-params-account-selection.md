# define: aws.params account selection

## .what

how the `aws.params` vault decides **which AWS identity** to authenticate as when it reads a
parameter. this is the aws.params-specific application of the general keyrack invariant in
`define.keyrack-org-scope.grove-vs-tree.md`.

the rule is a **hardcut on the `--org` scope** — no inference waterfall, no runtime picker, no
`--account` flag, no `meta.account` pin:

| `--org` scope | AWS identity used |
|---------------|-------------------|
| `@all` (grove-wide) | **IMDS only** — the EC2 instance role, the grove's own badge |
| a specific org (tree-wide) | **that org's `AWS_PROFILE`, sourced from the tree's `.agent/keyrack.yml`** |

## .why

a grove can reach **many** AWS identities: its own instance role, plus one profile per org whose
tree lives on it. a get-time "try IMDS, then a profile, then another" waterfall is magic — the
human never sees which identity was picked, and a wrong pick reads a secret from the wrong
account.

so the identity is decided by the scope the human **already typed**, deterministically:

- `@all` = "this credential belongs to the grove itself" → the grove's own ambient identity
  (IMDS) is the root of trust.
- a specific org = "this credential belongs to that org's tree" → that org's declared identity
  (the manifest's `AWS_PROFILE`) is the root of trust.

no account is pinned into `meta`; the vault holds only the `region` (captured at set) and the
`exid` (the SSM path). the identity comes from the scope + the manifest at unlock.

## .how the identity is obtained at unlock/get

at unlock, the vault reads the SSM SecureString by proof of an AWS identity chosen by scope:

### `--org @all` → IMDS only

keyrack builds the AWS client with **no profile** and lets the default chain derive the EC2
instance role over IMDS. it does NOT consult an ambient SSO session or any profile. if IMDS is
absent (not on an EC2 box), it failfasts naming that `@all` needs the grove's ambient identity.

### a specific org → the org's `AWS_PROFILE` from the manifest

keyrack reads the tree's `.agent/keyrack.yml`, looks up the `AWS_PROFILE` the manifest declares
for that org, and authenticates as that profile (matching the repo precedent — shell out to
`aws configure export-credentials --profile <name>`). if the manifest declares no `AWS_PROFILE`
for that org, keyrack **failfasts** and names the fix — it never falls back to IMDS or an
ambient session.

### never ambient SSO

the identity is EITHER the grove's IMDS role (`@all`) OR the org's manifest-named `AWS_PROFILE`
(a specific org). keyrack never silently grabs a cached SSO session that happens to sit in the
environment. SSO is reachable only when the org's manifest `AWS_PROFILE` names an SSO profile —
a deliberate designation, not an ambient grab.

## .where identity config lives

- **region** — captured at set into `meta.region` (region is NOT ambient; see the vision's q5).
- **account/identity** — NOT persisted. it is derived at unlock from the `--org` scope + (for a
  specific org) the tree's `.agent/keyrack.yml` `AWS_PROFILE`.

## .the three usecases (exhaustive)

### usecase 1 — clone on a grove, key from the grove's ambient EC2 account

set with `--org @all`. on the grove, the instance role (IMDS) is the identity.

```
grove unlock (--org @all key)
  ├─ scope: grove-wide → IMDS
  └─ read the param with the IMDS instance role
```

### usecase 2 — clone on a grove, key from the current tree's repo account

set with a specific `--org`. on the grove, the tree's manifest names that org's `AWS_PROFILE`.

```
grove unlock (--org ehmpathy key)
  ├─ scope: tree-wide → AWS_PROFILE from .agent/keyrack.yml for org ehmpathy
  └─ read the param with that profile
```

### usecase 3 — human on local, key from the current tree's repo account

a laptop dev inside a repo tree, with a specific-org key. identical to usecase 2 at unlock — the
tree's manifest names the org's profile.

```
laptop unlock (--org ehmpathy key)
  ├─ scope: tree-wide → AWS_PROFILE from .agent/keyrack.yml for org ehmpathy
  └─ read the param with that profile
```

usecases 2 and 3 are identical at unlock — a specific org maps to that org's manifest-named
`AWS_PROFILE`. the only difference is the box.

## .the experience matrix

| # | phase | condition | outcome |
|---|-------|-----------|---------|
| m1 | unlock | `--org @all`, IMDS present | read via IMDS |
| m2 | unlock | `--org @all`, no IMDS | failfast — name that `@all` needs the grove's ambient identity |
| m3 | unlock | specific org, manifest declares that org's `AWS_PROFILE` | read via that profile |
| m4 | unlock | specific org, manifest declares NO `AWS_PROFILE` for that org | failfast + guide |
| m5 | unlock | specific org, only a cached SSO session in env (no manifest profile) | SSO not used → m4 failfast |
| m6 | unlock | `--org @all`, a cached SSO session in env | SSO not used → IMDS only |

## .failfast + guide (what / where / why)

on a specific-org key with no manifest `AWS_PROFILE`:

```
✋ aws.params: no AWS_PROFILE declared for org "ehmpathy"

  this key (ANTHROPIC_API_KEY, env=prod, org=ehmpathy) is tree-scoped, so it authenticates as
  org "ehmpathy"'s identity — the AWS_PROFILE named in this tree's .agent/keyrack.yml.

  fix — declare the profile for this org in .agent/keyrack.yml, e.g.:
    orgs:
      ehmpathy:
        aws:
          profile: ehmpathy-prod

  (to instead use the grove's own identity, set the key with --org @all)
```

on an `@all` key with no IMDS:

```
✋ aws.params: no ambient grove identity found

  this key is grove-scoped (--org @all), so it authenticates as the grove's own ambient
  identity — the EC2 instance role over IMDS.

  fix — run on a box whose instance role can read this param, or re-set the key under a
  specific --org so it uses that org's AWS_PROFILE from .agent/keyrack.yml.
```

## .boundary cases (each bound to a test)

| id | condition | behavior |
|----|-----------|----------|
| b1 | `--org @all`, IMDS present, param readable | read (uc1) |
| b2 | `--org @all`, no IMDS | failfast — grove identity absent |
| b3 | specific org, manifest `AWS_PROFILE` present, param readable | read (uc2/uc3) |
| b4 | specific org, no manifest `AWS_PROFILE` for that org | failfast + guide |
| b5 | specific org, only a cached SSO session (no manifest profile) | SSO not used → b4 failfast |
| b6 | identity derived but grant denies `ssm:GetParameter` | failfast naming the read grant |
| b7 | identity derived but grant denies `kms:Decrypt` | distinct failfast naming the KMS grant |
| b8 | region absent | extant region gate — failfast naming the region source |
| b9 | param absent (`ParameterNotFound`) | failfast — absent, name create/place fix |
| b10 | param is a plain `String`, not `SecureString` | failfast — never emit a plaintext value |

## .mechanics notes (for the implementation)

- **the scope→identity decision is a pure transformer** — `(org) → { source: 'imds' } | { source:
  'profile', profile }`. `@all` → imds; a specific org → look up the manifest `AWS_PROFILE`,
  failfast if absent.
- **the manifest profile lookup** — read the tree's `.agent/keyrack.yml` for the org's
  `AWS_PROFILE` (the same manifest keyrack already parses).
- **shell out to the `aws` CLI**, matching `aws.config`: for a profile, `aws configure
  export-credentials --profile <name> --format env-no-export`; for IMDS, let the default chain
  derive with no profile. declastruct's `SSMClient` is built with `{ region }` only, so keyrack
  supplies the derived credentials/profile via the environment, not an explicit provider.
- **no `meta.account`, no `--account`, no picker** — the scope + manifest carry the whole
  decision.

## .see also

- `define.keyrack-org-scope.grove-vs-tree.md` — the general invariant this applies
