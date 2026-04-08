# self-review r2: has-questioned-requirements

fresh pass after wisher clarified mech inference adapter requirement.

---

## new requirement: mech inference adapters

**who said?** wisher clarified via feedback: when vault supports multiple mechs for same key, prompt for which mech

**the wisher's exact words:**
> "AWS_PROFILE -> always infer as --vault aws.credentials; then, vault aws.credentials upon sight of AWS_PROFILE would not know whether the choice is EPHEMERAL_VIA_AWS_SSO or PERMANENT_VIA_AWS_KEY"
> "we need inference adapters too - that the vaults can invoke to get an stdin response of _which_ mech to use"

**evidence this is needed:**
- AWS_PROFILE with aws.config vault: could be sso-based or raw key-based
- GITHUB_TOKEN with os.secure: could be github app or plain pat
- without prompt, system must fail-fast or pick arbitrary default — both bad ux

**what if we didn't?**
- option a: require explicit --mech always → breaks the "just works" experience
- option b: pick arbitrary default → surprises users who wanted the other mech
- option c: fail-fast when ambiguous → frustrates users who don't know mech names

**scope check:**
- introduces new interface: mech inference adapters
- natural extension of guided setup pattern
- vault invokes inference adapter when --mech not supplied and multiple valid

**why it holds:**
- wisher explicitly requested this behavior
- aligns with the "guided setup" philosophy of the whole refactor
- reuses the same stdin prompt pattern as mech credential prompts

**verdict:** holds ✓ (wisher explicitly clarified)

---

## requirement 1: mechs drive their own prompts

**why it holds (deeper articulation):**
- decouples mech from vault — enables portability
- each mech knows its shape — prompts are mech-specific knowledge
- vaults don't need to know mech internals — just store what mech produces
- enables the "factory/warehouse" mental model

**verdict:** holds ✓

---

## requirement 2: os.direct forbidden for ephemeral

**why it holds (deeper articulation):**
- security invariant — ephemeral mechs store sensitive source credentials
- os.direct stores plaintext — defeats the purpose of ephemeral tokens
- fail-fast protects users from accidental exposure
- no workaround needed — os.secure is the correct choice for ephemeral

**verdict:** holds ✓

---

## requirement 3: vault rename (aws.iam.sso → aws.config)

**why defer:**
- functional behavior unchanged by rename
- wisher mentioned both "aws.config" and "aws.credentials" — unclear preference
- already captured as open question in vision
- can proceed with implementation via either name

**verdict:** defer to wisher ✓

---

## requirement 4: github app guided setup

**why it holds (deeper articulation):**
- api returns all needed data: appId, installationId per org
- user only needs to provide pem path — one input vs three in json
- error-prone json construction eliminated
- discoverability improved — users see available orgs and apps

**verdict:** holds ✓

---

## requirement 5: mech inference preserved

**why it holds (deeper articulation):**
- extant users rely on inference — os.secure → PERMANENT_VIA_REPLICA
- inference is the "easy path" — explicit --mech is escape hatch
- new: when inference is ambiguous, prompt (see new requirement above)
- preserves backwards compat for unambiguous cases

**verdict:** holds ✓

---

## requirement 6: multi-vault portability

**why it holds (deeper articulation):**
- mech produces json blob — vault stores it
- separation of concerns — mech owns format, vault owns storage
- enables 1password, os.secure, etc to all use same github app mech
- vaults only need to implement string storage

**verdict:** holds ✓

---

## summary

| requirement | verdict | articulation |
|-------------|---------|--------------|
| mech inference adapters | holds | wisher explicitly clarified |
| mechs drive prompts | holds | enables portability via decoupled design |
| os.direct forbidden | holds | security invariant, fail-fast protection |
| vault rename | defer | unclear preference, open question |
| github app guided setup | holds | api provides data, reduces error |
| mech inference preserved | holds | backwards compat for unambiguous cases |
| multi-vault portability | holds | separation of concerns |

all requirements articulated. one deferred (vault rename) awaits wisher input.
