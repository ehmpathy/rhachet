# self-review: has-questioned-assumptions (r2)

## hidden assumptions in the vision

### assumption: gh cli is available and authenticated

**what do we assume?** that `gh` cli is installed and `gh auth login` has been run

**evidence?** none from wish. wish says "mock the gh api" which implies gh cli usage

**what if the opposite were true?** if gh cli is absent, vault.set would fail with cryptic error

**did wisher say this?** no, inferred from "mock the gh api"

**exceptions?** none — gh cli is used throughout this codebase

**action:** assumption is reasonable for this repo (rhachet uses gh cli elsewhere). add failfast check for gh auth status.

**verdict:** ✓ holds — gh cli is the standard pattern in this codebase

### assumption: current repo has github secrets access

**what do we assume?** that the user has write access to the current repo's secrets

**evidence?** none explicit. gh api would fail with 403 if not.

**what if the opposite were true?** user would get github permission error, possibly unclear

**did wisher say this?** no

**exceptions?** forks may not allow secrets — but users of forks would know this

**action:** failfast with clear error message on permission denied

**verdict:** ✓ holds — reasonable assumption with clear error path

### assumption: secret name derives from key name

**what do we assume?** that keyrack key `GITHUB_APP_CREDS` maps to github secret `GITHUB_APP_CREDS`

**evidence?** vision shows this map in examples

**what if the opposite were true?** if names differed, audit trail would be unclear

**did wisher say this?** no, but the example in vision shows direct map

**exceptions?** teams that use prefixes (e.g., `PROD_` prefix) — but v1 doesn't need this

**action:** v1 uses direct map. if teams need transformation, future enhancement.

**verdict:** ✓ holds for v1 — simplest default, extend later if needed

### assumption: no roundtrip verification is acceptable

**what do we assume?** that users will trust gh api success response without local verification

**evidence?** github secrets api returns 204 on success, errors on failure

**what if the opposite were true?** user would want to see the secret value to confirm — impossible by design

**did wisher say this?** yes, explicitly: "we know that they wont be retrievable via api"

**exceptions?** none — this is a github platform constraint

**action:** none — this is a platform constraint, not a choice

**verdict:** ✓ holds — wisher understands and accepts this

### assumption: host manifest should record github.secrets entries

**what do we assume?** that keys set via github.secrets appear in host manifest with vault=github.secrets

**evidence?** vision shows this in outputs. aligns with how other vaults work.

**what if the opposite were true?** no local record of what was set to github

**did wisher say this?** yes, explicitly: "support the knowledge that it exists"

**exceptions?** none — this is required for the "status = locked" feature

**action:** none — required by wisher

**verdict:** ✓ holds — explicit requirement

### assumption: mech.acquireForSet can be reused unchanged

**what do we assume?** that mech adapters produce the secret value which we then send to github

**evidence?** os.secure vault uses this pattern successfully

**what if the opposite were true?** we'd need to modify mech adapters to support github.secrets

**did wisher say this?** yes: "use the interactive keyrack mechanism prompts"

**exceptions?** mechs that need vault-specific behavior — but current mechs don't

**action:** none — mech adapters are already vault-agnostic

**verdict:** ✓ holds — architectural win from extant design

### assumption: env=all is the default for github secrets

**what do we assume?** that github.secrets writes to repo-level secrets, not environment-level

**evidence?** vision explicitly scopes this: "v1 writes to repo-level secrets only"

**what if the opposite were true?** would need environment parameter, different api endpoint

**did wisher say this?** no, but wisher didn't ask for environment secrets either

**exceptions?** teams that use github environments heavily — documented as future enhancement

**action:** documented as future enhancement

**verdict:** ✓ holds for v1 — explicit scope decision

### assumption: exid format is sufficient for uniqueness

**what do we assume?** that `owner/repo.SECRET_NAME` uniquely identifies a github secret

**evidence?** github secrets are unique per repo, so this should hold

**what if the opposite were true?** duplicate exids, broken audit trail

**exceptions?** org-level secrets have different namespace — out of scope for v1

**action:** v1 is repo-level only, so format holds

**verdict:** ✓ holds for v1 — revisit if org-level secrets added later

---

## summary

| assumption | evidence level | verdict |
|------------|----------------|---------|
| gh cli available | codebase pattern | ✓ holds |
| repo has secrets access | implicit, failfast handles | ✓ holds |
| secret name = key name | simplest default | ✓ holds for v1 |
| no roundtrip ok | wisher explicit | ✓ holds |
| host manifest records | wisher explicit | ✓ holds |
| mech reuse unchanged | architectural | ✓ holds |
| env=all default | scope decision | ✓ holds for v1 |
| exid uniqueness | github constraint | ✓ holds for v1 |

all 8 assumptions validated. none required changes to the vision.

---

## review complete

8 hidden assumptions identified and questioned:
- all 8 validated as reasonable for v1
- none required changes to the vision
- 3 noted as "for v1" — may need to revisit in future versions

the vision's assumptions are sound.
