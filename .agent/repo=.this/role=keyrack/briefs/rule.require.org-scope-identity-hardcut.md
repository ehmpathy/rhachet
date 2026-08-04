# rule.require.org-scope-identity-hardcut

## severity: blocker

this is the **aws-identity application** of the general `rule.require.org-scope-grain-hardcut` —
which vault identity you authenticate as is one facet of which grain (grove vs tree) the `--org`
scope selects. read the general rule first; this rule pins its identity facet.

the `--org` scope, and it alone, decides which external identity a vault authenticates as. this
is a **hardcut** — a deterministic branch on the scope the human already typed — never an
inference waterfall, never a runtime picker, never a silent fallback to whatever identity
happens to sit in the environment.

- `--org @all` → the **grove's own ambient identity ONLY** (for aws.params: the EC2 instance
  role via IMDS). failfast if that ambient identity is absent.
- a **specific org** → **that org's manifest-declared identity ONLY** (for aws.params: the
  `AWS_PROFILE` the tree's `.agent/keyrack.yml` names for that org). failfast if the manifest
  declares none — it must NEVER fall back to IMDS, to an ambient SSO session, or to any other
  identity.

## .why

a grove can reach **many** identities — its own instance role, plus one profile per org whose
tree lives on it. a get-time "try this, then that" waterfall is magic: the human never sees
which identity was picked, and a wrong pick reads a secret as the wrong principal — a security
defect, not a convenience. the `--org` scope is the one explicit, visible signal, and it is
sufficient to decide, so it MUST be the sole decider.

a silent fallback (a specific-org key that quietly reads via IMDS or a cached SSO session when
its profile is absent) is the exact hazard this rule forbids: it authenticates as the wrong
principal and does not surface that to the human, and it turns an absent-config error into an
invisible-wrong-identity read.

## .the invariant, per scope

| `--org` scope | identity used | on absence |
|---------------|---------------|------------|
| `@all` | grove ambient (IMDS) ONLY — never a profile, never SSO | failfast: name that `@all` needs the grove's ambient identity |
| a specific org | that org's manifest `AWS_PROFILE` ONLY — never IMDS, never SSO | failfast + guide: declare the profile, or re-scope with `--org @all` |

## .forbidden

- a fallback from a specific-org key to IMDS or an ambient session when its `AWS_PROFILE` is
  absent — this must be a hard failfast, never a rescue.
- a fallback from an `@all` key to a profile or a cached SSO session — `@all` is IMDS only.
- any inference waterfall (a chain of "try identity A, else B, else C") or a runtime prompt/picker
  that decides identity from any signal other than the `--org` scope.
- a grabbed cached SSO session — SSO is reachable ONLY when a specific org's manifest
  `AWS_PROFILE` deliberately names an SSO profile; it is never consulted implicitly.

## .how it is enforced in code (aws.params)

the decision is a pure transformer, so the hardcut is unit-testable and cannot drift:

- `asKeyrackAwsParamIdentity({ org, profileForOrg })` — the hardcut itself. `@all` →
  `{ source: 'imds' }`; a specific org with a profile → `{ source: 'profile', profile }`; a
  specific org with no profile → a `ConstraintError` that names the fix (never a fall to IMDS).
- `asKeyrackAwsParamCredsEnv({ identity })` — imds → clears `AWS_PROFILE` (so the SDK default
  chain derives the instance role); profile → sets `AWS_PROFILE` to that profile ONLY.
- `asKeyrackAwsParamErrorGate` gate 2 — an `@all` key on a box with no IMDS surfaces as
  `aws.params found no AWS identity` (a `ConstraintError`), the `@all`-absence failfast.

## .the bound boundary cases

each row of the hardcut is bound to a test — a change that breaks the invariant trips one:

| id | condition | behavior | bound by |
|----|-----------|----------|----------|
| o1 | `@all` key, IMDS present | read via IMDS | `asKeyrackAwsParamIdentity.test.ts` c61 + gate 2 |
| o2 | `@all` key, no IMDS | failfast — `@all` needs the grove's ambient identity | `asKeyrackAwsParamErrorGate.test.ts` gate 2 |
| o3 | specific-org key, manifest names its `AWS_PROFILE` | read via that profile | `asKeyrackAwsParamIdentity.test.ts` c62 |
| o4 | specific-org key, manifest names NO profile | failfast + guide | `asKeyrackAwsParamIdentity.test.ts` c63 |
| o5 | specific-org key, only a cached SSO session in env | SSO not used → o4 failfast | `asKeyrackAwsParamIdentity.test.ts` c64 |

## .see also

- `rule.require.org-scope-grain-hardcut.md` — the GENERAL invariant this rule is an application of
- `define.keyrack-org-scope.grove-vs-tree.md` — the invariant explained (grove vs tree, the why,
  the three usecases)
- `define.aws-params-account-selection.md` — the aws.params-specific application
- `asKeyrackAwsParamIdentity.ts` / `asKeyrackAwsParamCredsEnv.ts` / `asKeyrackAwsParamErrorGate.ts`
  — the code seams that realize the hardcut
