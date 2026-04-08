# self-review: has-questioned-assumptions

## assumption 1: gh cli is authenticated and can fetch installations

**what we assume:** users have `gh` cli installed and authenticated with access to org installations

**evidence?** the wish uses `gh api --method GET /orgs/ehmpathy/installations` — implies gh is available

**what if opposite?**
- gh not installed → guided setup fails
- gh not authenticated → api calls fail
- user lacks org access → empty results

**did wisher say this?** implied by the gh api example, but not explicit

**exceptions?**
- cicd environments without gh
- users who use github tokens directly

**verdict:** assumption valid, but add fallback. if gh unavailable, allow manual json input as escape hatch. **update vision** to note this.

---

## assumption 2: pem file can be read from path

**what we assume:** user can provide a relative path to .pem file

**evidence?** wish says "pass in a relative path to the .pem, and we'll format it as needed"

**what if opposite?**
- pem in cloud storage (s3, etc) → path won't work
- pem in 1password already → redundant to re-store
- user wants to paste content directly

**did wisher say this?** yes, explicitly: "pass in a relative path to the .pem"

**exceptions?**
- users who already have pem in a vault
- users who want stdin input

**verdict:** assumption valid per wish. path is the primary input. **no change needed**.

---

## assumption 3: vaults are pure storage backends

**what we assume:** vaults only store/retrieve, mechs handle all transformation

**evidence?** wish says "the mech is the one that should do all that stdout emission"

**what if opposite?**
- some vaults have special storage needs (aws.config needs profile format)
- some vaults need auth before set (1password biometric)

**did wisher say this?** yes — "vault is actually aws.config and the mech is the one that should do all that stdout emission"

**exceptions?**
- aws.config vault still writes to ~/.aws/config (not raw json)
- 1password vault still needs op cli auth

**verdict:** mostly valid. vaults handle storage format and auth. mechs handle prompts and transformation. **clarify in vision** that vaults still own their storage format.

---

## assumption 4: mech adapters should have a `set` method

**what we assume:** mech adapters gain a `set` method with prompts

**evidence?** implied by "mech adapter should prompt for what it needs"

**what if opposite?**
- separate prompt function, not on adapter
- prompts in a dedicated prompt layer

**did wisher say this?** not explicitly — wish focuses on behavior, not interface

**exceptions?** none obvious

**verdict:** implementation detail. could be `mech.promptForSet()` or `mech.set()`. **no change needed** — vision describes behavior, not interface.

---

## assumption 5: all ephemeral mechs need source credentials stored

**what we assume:** ephemeral mechs store source (json blob, profile name), then translate on unlock

**evidence?** this is how EPHEMERAL_VIA_GITHUB_APP and EPHEMERAL_VIA_AWS_SSO work today

**what if opposite?**
- some ephemeral mechs might not need storage (OIDC?)
- some might derive at runtime

**did wisher say this?** implied by the verification flow (set → unlock → get → relock)

**exceptions?**
- EPHEMERAL_VIA_GITHUB_OIDC might work differently (runtime derivation)

**verdict:** valid for the mechs in scope. **no change needed** — OIDC is out of scope for this wish.

---

## assumption 6: vault/mech compat can be validated statically

**what we assume:** we can fail-fast on invalid vault/mech combos at set time

**evidence?** wish says vaults should "failfast for incompatible mechs"

**what if opposite?**
- compat depends on runtime state (vault empty vs populated)
- compat depends on user config

**did wisher say this?** yes — "os.secure should failfast on the EPHEMERAL_VIA_AWS_SSO mech"

**exceptions?** none obvious — vault type determines compat statically

**verdict:** valid. static compat check. **no change needed**.

---

## found issues

### issue 1: gh cli fallback not mentioned

**fix:** add note to vision that if gh unavailable, manual json input is fallback.

**updated vision section:** open questions & assumptions

---

### issue 2: vault storage format ownership unclear

**fix:** clarify that vaults still own their storage format (aws.config writes to ~/.aws/config, not raw json)

**updated vision section:** assumptions section — "vaults own storage format"

---

## summary

| assumption | verdict |
|------------|---------|
| gh cli available | valid, add fallback note |
| pem from path | valid per wish |
| vaults are pure storage | mostly valid, clarify format ownership |
| mech.set interface | implementation detail |
| ephemeral needs source storage | valid for scope |
| static compat validation | valid |

two clarifications added to mental model.
