# self-review r2: has-pruned-yagni

## systematic yagni audit

for each component in the blueprint, ask:
1. was this explicitly requested in the vision or criteria?
2. is this the minimum viable way to satisfy the requirement?
3. did we add abstraction "for future flexibility"?
4. did we add features "while we're here"?
5. did we optimize before we knew it was needed?

---

## changes audit

### 1. promptForSet method on mech adapter

**requested?** yes — wish: "mech adapters, to enable each mechanism to prompt for exactly what it needs"

**minimum viable?** yes — single method addition, no extra abstraction

**verdict:** keep

---

### 2. supportedMechs and checkMechCompat on vault adapter

**requested?** yes — wish: "some vaults will want to failfast for incompatible mechs"

**minimum viable?** yes — list + validation method, no framework

**verdict:** keep

---

### 3. github app guided setup (org → app → pem)

**requested?** yes — wish explicitly describes 3-step flow:
> 1. which of the orgs to target?
> 2. which of the apps installed for this org?
> 3. the private key associated with this installation

**minimum viable?** yes — follows exact flow from wish

**verdict:** keep

---

### 4. move aws sso guided setup to mech adapter

**requested?** yes — wish: "the mech is the one that should do all that stdout emission"

**minimum viable?** yes — relocate extant logic

**verdict:** keep

---

### 5. rename aws.iam.sso to aws.config

**requested?** yes — wish: "the vault is actually aws.config"

**minimum viable?** yes — rename, no extra work

**verdict:** keep

---

### 6. vault inference from key name

**requested?** yes — wish: "there should be some inference operation which infers the mechanism and vault based on key name"

**minimum viable?** yes — single operation with pattern match

**verdict:** keep

---

### 7. mech inference when vault supports multiple mechs

**requested?** yes — wish: "we need inference adapters too - that the vaults can invoke to get an stdin response of _which_ mech to use"

**minimum viable?** yes — single operation with stdin prompt

**verdict:** keep

---

### 8. remove prompts from vault adapters

**requested?** yes — core of the refactor

**minimum viable?** yes — deletion, not addition

**verdict:** keep

---

## test coverage audit

### inferVault test cases

```
├─ [case1] AWS_PROFILE → aws.config
├─ [case2] AWS_ACCESS_KEY_ID → aws.config
├─ [case3] GITHUB_TOKEN → null (no inference)
└─ [case4] STRIPE_KEY → null (no inference)
```

**issue found:** case2 (AWS_ACCESS_KEY_ID → aws.config) was not explicitly requested.

the wish says: "lets make it clear that only 'aws.config' vault supports AWS_PROFILE keys"

this specifically mentions AWS_PROFILE, not AWS_ACCESS_KEY_ID.

**question:** is AWS_ACCESS_KEY_ID inference YAGNI?

**analysis:**
- AWS_ACCESS_KEY_ID is a long-lived access key, not a profile name
- to store it, user might prefer os.secure (encrypted secret) rather than aws.config
- the wish was specific about AWS_PROFILE → aws.config
- AWS_ACCESS_KEY_ID → aws.config is an assumption, not a requirement

**verdict:** remove case2 from blueprint. if needed, add later when explicitly requested.

---

### PERMANENT_VIA_AWS_KEY in compatibility matrix

```
aws.config                 ✗           ✗              ✓             ✓
```

the last column shows PERMANENT_VIA_AWS_KEY as supported by aws.config.

**question:** is this YAGNI?

**analysis:**
- wish mentions: "EPHEMERAL_VIA_AWS_SSO or! PERMANENT_VIA_AWS_KEY"
- this is listed as a future option users might choose
- blueprint marks it as "scaffold only" in out of scope
- presence in matrix documents design intent without implementation cost

**verdict:** keep in matrix — documents future path without implementation cost

---

### journey tests (.play.integration)

**question:** are these over-engineered beyond acceptance tests?

**analysis:**
- criteria mentions acceptance tests
- repo conventions (briefs) describe .play.integration as standard pattern
- journey tests test the exact flows described in criteria usecases
- these are unit-tested mech adapter flows, not extra work

**verdict:** keep — follows repo conventions, tests criteria usecases

---

### single org/app auto-select

**requested?** yes — criteria usecase.7 and usecase.8 explicitly cover this

**verdict:** keep

---

### gh cli unavailable fallback

**requested?** yes — criteria usecase.9 covers this

**verdict:** keep

---

## fixes applied

### fix 1: remove AWS_ACCESS_KEY_ID inference test case

**before:** blueprint included case2: AWS_ACCESS_KEY_ID → aws.config

**after:** removed case2 — only AWS_PROFILE inference is explicitly requested

**rationale:** AWS_ACCESS_KEY_ID might be stored differently (os.secure for raw secrets). this is an assumption, not a requirement.

---

## summary

one yagni violation found and fixed:
- AWS_ACCESS_KEY_ID inference — not requested, removed

all other components trace to explicit wish or criteria requirements. no premature abstractions, no "while we're here" additions.
