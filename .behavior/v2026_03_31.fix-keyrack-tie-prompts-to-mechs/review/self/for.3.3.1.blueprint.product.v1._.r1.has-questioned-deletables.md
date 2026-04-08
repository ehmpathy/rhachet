# self-review r1: has-questioned-deletables

## features examined

### 1. inferVault operation

**traces to:**
- wish: "lets make it clear that only 'aws.config' vault supports AWS_PROFILE keys; also, there should be some inference operation which infers the mechanism and vault based on key name"
- blackbox criteria usecase.13: vault infers from key name

**verdict:** keep — explicitly requested by wisher

### 2. inferMech operation

**traces to:**
- wish: "if --mech was not a supplied input, it must ask"
- wish: "we need inference adapters too - that the vaults can invoke to get an stdin response of _which_ mech to use"
- blackbox criteria usecase.3: aws sso set with mech inference

**verdict:** keep — explicitly requested by wisher

### 3. vault/mech compatibility matrix

**traces to:**
- wish: "some vaults will want to failfast for incompatible mechs"
- wish: "os.secure should failfast on the EPHEMERAL_VIA_AWS_SSO mech probably"
- wish: "explicitly forbid os.direct from ephemeral support"
- blackbox criteria usecase.5, 6: incompatible combo fails fast

**verdict:** keep — explicitly requested by wisher

### 4. github app guided setup (org → app → pem)

**traces to:**
- wish: "hopefully the prompt will start with 1. which of the orgs to target? ... 2. which of the apps installed for this org? ... 3. the private key"
- blackbox criteria usecase.1: github app set with os.secure

**verdict:** keep — explicitly requested by wisher

### 5. single org/app auto-select

**traces to:**
- blackbox criteria usecase.7, 8: single org/app auto-selects

**question:** was this in the wish?

**answer:** not explicitly, but flows from pit of success principle — skip prompts when no choice exists. vision mentions this as edge case handler.

**verdict:** keep — follows pit of success, documented in vision

### 6. gh cli fallback to per-field prompts

**traces to:**
- blackbox criteria usecase.9: gh cli unavailable fallback
- self-review r2 in experience reproductions: changed from raw json to per-field prompts

**verdict:** keep — addresses edge case, improved from raw json paste

### 7. vault rename aws.iam.sso → aws.config

**traces to:**
- wish: "and probably for EPHEMERAL_VIA_AWS_SSO the vault is actually aws.config"
- vision: "wisher confirmed in wish: 'lets make it clear that only 'aws.config' vault supports AWS_PROFILE keys'"

**verdict:** keep — explicitly requested by wisher

### 8. roundtrip validation (unlock → get → relock)

**traces to:**
- blackbox criteria usecase.1: "verifies via unlock → get → relock cycle"
- vision: "on unlock: vault decrypts → mech translates json → short-lived ghs_ token"

**question:** is roundtrip validation new or extant?

**answer:** per the research, roundtrip validation is likely extant behavior. vision mentions "verifies via unlock → get → relock cycle" in usecase 1.

**verdict:** keep — validates credentials work before success message

---

## components examined

### 1. promptForSet on mech adapters

**question:** could we avoid this method?

**answer:** no — this is the core of the refactor. mechs must own their prompts to be portable across vaults.

**verdict:** keep — core requirement

### 2. supportedMechs list on vault adapters

**question:** could we derive this instead of declare it?

**answer:** no — vault/mech compatibility is explicit design choice, not derivable from code. e.g., os.direct cannot store source keys securely is a security policy, not derivable.

**verdict:** keep — explicit declaration prevents implicit assumptions

### 3. checkMechCompat method on vault adapters

**question:** could this be a shared function instead of adapter method?

**answer:** it could be, but the adapter method keeps error messages vault-specific and allows vaults to provide custom alternatives. e.g., "os.direct cannot secure source keys, try os.secure or 1password" is vault-specific guidance.

**verdict:** keep as adapter method — vault-specific error messages

### 4. PERMANENT_VIA_AWS_KEY mechanism

**question:** is this needed? was it requested?

**answer:** wish mentions "EPHEMERAL_VIA_AWS_SSO or! PERMANENT_VIA_AWS_KEY" as options for aws.config vault. blueprint marks this as scaffold only.

**verdict:** keep scaffold — mentioned in wish, but actual implementation out of scope

---

## what could be deleted?

### reviewed and kept:

1. **inferVault** — wisher requested
2. **inferMech** — wisher requested
3. **vault/mech compatibility** — wisher requested
4. **github app guided setup** — wisher requested
5. **single org/app auto-select** — pit of success
6. **gh cli fallback** — edge case handle
7. **vault rename** — wisher requested
8. **roundtrip validation** — likely extant, validates behavior

### no deletables found

all features trace to wish or criteria. no assumed features without traceability.

---

## simplification opportunities

### 1. PERMANENT_VIA_AWS_KEY

currently marked as "scaffold only" in out of scope. could remove from compatibility matrix entirely if not implemented.

**decision:** keep in matrix for documentation — shows future path, but no code change needed

### 2. 1password adapter changes

marked as "beyond supportedMechs" in out of scope. could defer entirely.

**decision:** minimal change required (add supportedMechs list) — keep as documented

---

## verdict

no features or components to delete. all trace to wish or criteria.

blueprint is minimal for the scope — no extra features, no premature optimization.
