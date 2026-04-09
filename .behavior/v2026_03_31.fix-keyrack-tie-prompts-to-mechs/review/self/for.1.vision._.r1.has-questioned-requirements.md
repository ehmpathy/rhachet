# self-review r1: has-questioned-requirements

---

## new requirement found: mech inference adapters

**wisher clarified via feedback:** when vault supports multiple mechs for same key, need to prompt which mech

**the wisher's exact words:**
> "AWS_PROFILE -> always infer as --vault aws.credentials; then, vault aws.credentials upon sight of AWS_PROFILE would not know whether the choice is EPHEMERAL_VIA_AWS_SSO or PERMANENT_VIA_AWS_KEY"
> "we need inference adapters too - that the vaults can invoke to get an stdin response of _which_ mech to use"

**action taken:** updated vision with mech inference adapter section and example treestruct output

**why this requirement holds:**
- without prompt, system must fail-fast or pick arbitrary default — both bad ux
- wisher explicitly wants guided experience even for mech selection
- reuses same stdin prompt pattern as credential prompts

---

## requirement 1: mechs drive their own prompts

**who said?** the wisher, explicitly: "keyrack vaults should use mech adapters, to enable each mechanism to prompt for exactly what it needs"

**evidence?** aws.iam.sso today has beautiful guided setup — but it's baked into the vault adapter. this couples EPHEMERAL_VIA_AWS_SSO to aws.iam.sso vault only.

**what if we didn't?** EPHEMERAL_VIA_GITHUB_APP stays unusable (manual json blob required). users would never discover the appId/installationId fields.

**scope check?** right size — just move prompt logic from vault to mech. vaults stay as storage.

**simpler?** could add guided setup to mechAdapterGithubApp without vault restructure, but the wish explicitly wants the separation of concerns.

**why it holds:**
- decouples mech from vault — enables portability
- each mech knows its own shape — prompts are mech-specific knowledge
- vaults become pure storage — don't need to know mech internals
- enables "factory/warehouse" mental model from the vision

**verdict:** holds ✓

---

## requirement 2: os.direct forbidden for ephemeral mechs

**who said?** the wisher: "explicitly forbid os.direct from ephemeral support, because it cant secure the source key"

**evidence?** os.direct stores plaintext. to store a github app privateKey in plaintext defeats the purpose of ephemeral tokens.

**what if we didn't?** users could accidentally expose private keys in plaintext files.

**scope check?** minimal — just a fail-fast check in vault/mech compat.

**simpler?** this IS the simple solution (fail-fast).

**why it holds:**
- security invariant — ephemeral mechs store sensitive source credentials (private keys, etc)
- os.direct stores plaintext — defeats the purpose of short-lived tokens
- fail-fast protects users from accidental exposure
- no workaround needed — os.secure is the correct choice for ephemeral

**verdict:** holds ✓

---

## requirement 3: aws.iam.sso vault rename to aws.credentials

**who said?** the wisher mentions: "maybe the vault is changed to just 'aws.credentials'" and "lets make it clear that only 'aws.credentials' vault supports AWS_PROFILE keys"

**evidence?** current name (aws.iam.sso) describes the auth method, not the storage. aws.credentials describes what's stored.

**what if we didn't?** name stays unclear but still works. no functional impact.

**scope check?** could skip for now — this is polish, not core.

**simpler?** yes — leave name as-is, focus on mech/vault separation first.

**verdict:** defer to wisher — marked as open question ✓

---

## requirement 4: github app guided setup flow

**who said?** the wisher, explicitly describes the flow: org selection → app selection → pem path

**evidence?** wish includes actual gh api call (`gh api --method GET /orgs/ehmpathy/installations`) and expected fields (appId, installationId)

**what if we didn't?** users must manually construct json blob — error-prone, no discoverability

**scope check?** right size — prompts are well-defined

**simpler?** the prompts ARE the simplification (vs manual json)

**feasibility check:**
- `/orgs/{org}/installations` returns apps installed on org
- each installation has appId + installationId
- user supplies privateKey path
- this works ✓

**why it holds:**
- api returns all needed data — no manual discovery needed
- user provides one input (pem path) instead of three (appId, installationId, privateKey)
- error-prone json construction eliminated
- discoverability improved — users see available orgs and apps

**verdict:** holds ✓

---

## requirement 5: mech inference continues to work

**who said?** the wisher: "mech inference should still work as expected, since we often use the vault as the biggest signal of which mech to infer"

**evidence?** extant code uses `inferMechFromVault` — os.secure → PERMANENT_VIA_REPLICA, aws.iam.sso → EPHEMERAL_VIA_AWS_SSO

**what if we didn't?** break change — users would need --mech everywhere

**scope check?** right — preserve extant behavior

**simpler?** no change needed — just maintain.

**why it holds:**
- extant users rely on inference — os.secure → PERMANENT_VIA_REPLICA
- inference is the "easy path" — explicit --mech is escape hatch
- when inference is ambiguous, mech inference adapters prompt (see new requirement above)
- preserves backwards compat for unambiguous cases

**verdict:** holds ✓

---

## requirement 6: EPHEMERAL_VIA_GITHUB_APP works with multiple vaults

**who said?** the wisher: "ephemeral via github now prompts for the inputs it needs... and can be used with any vault that supports it! (os.secure, 1password, etc)"

**evidence?** github app credentials are json — any vault that stores strings can store json

**what if we didn't?** limits portability — 1password users can't use github app tokens

**scope check?** right — mech produces json, vault stores it

**simpler?** this IS simple — vault.set(mech.prompt())

**why it holds:**
- mech produces json blob — vault stores it
- separation of concerns — mech owns format, vault owns storage
- enables 1password, os.secure, etc to all use same github app mech
- vaults only need to implement string storage
- follows the "factory/warehouse" mental model

**verdict:** holds ✓

---

## summary

| requirement | verdict |
|-------------|---------|
| mech inference adapters | holds (wisher clarified) |
| clear error messages | holds (wisher confirmed) |
| mechs drive prompts | holds |
| os.direct forbidden for ephemeral | holds |
| vault rename | defer to wisher |
| github app guided setup | holds |
| mech inference preserved | holds |
| multi-vault portability | holds |

all requirements justified. one deferred (vault rename) as non-blocker polish.

---

## fixes applied in r1

### fix 1: mech inference adapter section added to vision ✓

added section "mitigation: mech inference adapters" with treestruct example:

```
🔐 keyrack set AWS_PROFILE
   │
   ├─ which mechanism?
   │  ├─ options
   │  │  ├─ 1. aws sso (EPHEMERAL_VIA_AWS_SSO)
   │  │  └─ 2. aws access key (PERMANENT_VIA_AWS_KEY)
```

### fix 2: updated open question 3 ✓

changed from generic "mech inference priority" to specific scenarios:
- AWS_PROFILE → infer vault, but multiple mechs possible
- GITHUB_TOKEN → can't infer vault or mech

### fix 3: pit of success updated ✓

changed "infer from vault, fail-fast if ambiguous" to "mech inference adapter prompts via stdin"

### fix 4: treestruct formatting ✓

removed blank newlines between header and tree per wisher feedback

### fix 5: clear error messages promoted to requirement ✓

wisher confirmed: "possible mitigation" → "requirement"
- always guide callers to success
- example: "os.direct doesn't support EPHEMERAL_VIA_GITHUB_APP because it can't secure source keys. try os.secure or 1password."

### fix 6: two-step setup awareness resolved ✓

wisher confirmed: guided setup is the choice
- changed from "possible mitigation" to "chosen approach"
- guided setup makes two-step process seamless — users don't need to understand set vs unlock distinction
