# define: keyrack org scope — grove-wide vs tree-wide

## .what

a general keyrack invariant: **the `--org` scope decides whose identity a vault authenticates
as — for EVERY operation on a secret: read (`unlock`/`get`) AND mutation (`set`/`del`).** it is
not aws-specific — it governs every vault that authenticates against an external identity. the
scope the human already typed is the whole decision, the same way for a write as for a read —
see `.how it applies to set / del` below.

| `--org` value | scope | root of trust |
|---------------|-------|---------------|
| `@all` | **grove-wide** | the **grove's own ambient identity** |
| a specific org (the default) | **tree-wide** (manifest-wide) | **that org's identity, named in the tree's `.agent/keyrack.yml`** |

`@all` means grove-wide rather than tree-wide. a specific org means the credential belongs to
that org's tree, and its identity is the one the manifest declares for that org. this is a
**hardcut** that binds identity to scope, deterministically — never an inference waterfall,
never a runtime picker.

grove and tree are the coins:

- a **grove** is the box — the machine itself, with its own ambient identity.
- a **tree** is a repo tree on that grove — its `.agent/keyrack.yml` manifest names the identity
  for each org whose tree lives there.

## .why

a grove can reach **many** identities — its own instance role, plus one profile per org whose
tree lives on it. a get-time "try this, then that" waterfall is magic: the human never sees
which identity was picked, and a wrong pick reads a secret as the wrong principal.

so the scope the human **already typed** decides it. a blur of the two — a grove identity used
for a tree key, or a tree identity used for a grove key — is a defect. the `--org` scope is the
one explicit, visible signal, and it is sufficient:

- `@all` declares "this credential belongs to the grove itself" → the grove's own ambient
  identity is the root of trust.
- a specific org declares "this credential belongs to that org's tree" → that org's declared
  identity is the root of trust, and the manifest is where that identity is named.

no new flag, no prompt, no pin — the scope carries the whole decision.

## .how it applies to aws.params

the aws.params vault reads an SSM SecureString by proof of an AWS identity. the `--org` scope
picks which AWS identity:

- **`--org @all`** → use **IMDS only** (the EC2 instance role — the grove's own badge). never an
  ambient SSO session, never a profile. the grove's identity IS the unlock.
- **a specific org** → use **that org's `AWS_PROFILE`, sourced from the tree's
  `.agent/keyrack.yml`**. keyrack reads the profile name the manifest declares for that org and
  authenticates as it. if the manifest declares no `AWS_PROFILE` for that org, keyrack
  **failfasts** and names the fix — it never falls back to IMDS or an ambient session.

### never ambient SSO

keyrack never silently consults a cached SSO session. the identity is EITHER the grove's IMDS
role (`@all`) OR the org's manifest-named `AWS_PROFILE` (a specific org). a cached SSO session
that happens to sit in the environment is never grabbed.

## .the failfast

when a specific-org key unlocks but the manifest declares no `AWS_PROFILE` for that org:

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

## .how it applies to set / del (mutations follow the hardcut too)

the hardcut governs **every** operation, mutation as much as read. `set` (persist/verify an owned
blob, or verify a reference pointer) and `del` (destroy an owned param) authenticate as the SAME
`--org` identity `unlock`/`get` use: `@all` → the grove's IMDS role; a specific org → that org's
keyrack-declared `AWS_PROFILE`; a specific org with no declared profile → **fail loud**. a
mutation NEVER runs as the machine's ambient `AWS_PROFILE`.

why the hardcut, not an ambient-identity carve-out:

- **the human need not export `AWS_PROFILE`.** a scoped-org `set` derives the org's profile from
  the manifest, so a human who has unlocked their org keyrack just runs `set` — they do not also
  have to `export AWS_PROFILE=…`. an ambient carve-out produced the exact "found no AWS identity"
  failure that motivated this: the profile the manifest already names went unused.
- **one identity, read and write.** binding both paths to the org-scope identity means the write
  proves the SAME principal the later read will use — a write under a more-privileged ambient
  identity could pass a set-time roundtrip-verify that a least-privilege grove read later fails.
- **elevated grants belong ON the org identity, not on an ambient one.** `ssm:PutParameter` +
  `kms:Encrypt` (set) and `ssm:DeleteParameter` (del) are granted to the org's profile — the same
  identity that reads — so the scope the human typed carries the whole decision, with no ambient
  back-channel.

concretely: the vault adapter decides ONE `KeyrackAwsParamIdentity` per op via
`getOneKeyrackAwsParamIdentity({ slug, hostManifest })` and threads it to every leaf —
`getOneKeyrackAwsParamSecureValue` (read + reference-verify), `setKeyrackAwsParamReplica` and
`setKeyrackAwsParamGithubApp` (the owned write + its roundtrip-verify), and `delKeyrackAwsParam`
(the destroy). `delKeyrackKeyHost` threads `context.hostManifest` into `adapter.del`, and the
batch driver threads it into `adapter.get`, so both derive the identity at the vault's own boundary.

so the invariant reads precisely: **the `--org` hardcut governs which identity a vault
authenticates as for every operation — read and mutation alike; ambient `AWS_PROFILE` is never
consulted.**

## .the three usecases (exhaustive)

### usecase 1 — clone on a grove, key from the grove's ambient EC2 account

the key is set with `--org @all`. on the grove, the instance role (IMDS) is the grove's
identity.

```
grove unlock (--org @all key)
  ├─ scope: grove-wide → grove's ambient identity
  ├─ AWS identity: IMDS instance role
  └─ read the param with the IMDS role
```

### usecase 2 — clone on a grove, key from the current tree's repo account

the key is set with a specific `--org`. on the grove, the tree's `.agent/keyrack.yml` names that
org's `AWS_PROFILE`.

```
grove unlock (--org ehmpathy key)
  ├─ scope: tree-wide → org "ehmpathy"'s identity
  ├─ AWS identity: AWS_PROFILE from .agent/keyrack.yml for org ehmpathy
  └─ read the param with that profile
```

### usecase 3 — human on local, key from the current tree's repo account

a developer on a laptop, inside a repo tree, with a specific-org key. identical to usecase 2 at
unlock — the tree's manifest names the org's profile.

```
laptop unlock (--org ehmpathy key)
  ├─ scope: tree-wide → org "ehmpathy"'s identity
  ├─ AWS identity: AWS_PROFILE from .agent/keyrack.yml for org ehmpathy
  └─ read the param with that profile
```

usecases 2 and 3 are identical at unlock — a specific org resolves to that org's
manifest-named `AWS_PROFILE`. the only difference is the box (a grove that also carries an
unrelated instance role, vs a laptop).

## .boundary cases (each bound to a test)

| id | condition | behavior |
|----|-----------|----------|
| o1 | `--org @all` key, IMDS present | read via IMDS |
| o2 | `--org @all` key, no IMDS | failfast — name that `@all` needs the grove's ambient identity |
| o3 | specific-org key, manifest declares that org's `AWS_PROFILE` | read via that profile |
| o4 | specific-org key, manifest declares NO `AWS_PROFILE` for that org | failfast + guide (declare it, or use `--org @all`) |
| o5 | specific-org key, only a cached SSO session in env (no manifest profile) | SSO not used → o4 failfast |

## .see also

- `define.aws-params-account-selection.md` — the aws.params-specific application of this invariant
