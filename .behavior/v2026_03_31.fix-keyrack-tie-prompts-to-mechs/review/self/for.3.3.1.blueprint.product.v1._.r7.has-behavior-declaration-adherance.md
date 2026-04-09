# self-review r7: has-behavior-declaration-adherance

## fresh examination: does blueprint match spec?

check each blueprint item against vision and criteria for correctness.

---

## filediff tree adherance

### inferKeyrackVaultFromKey.ts

**blueprint:** `[~] inferKeyrackVaultFromKey.ts — extend: aws.iam.sso → aws.config`

**vision:** "add vault inference from key name (AWS_PROFILE → aws.config)"

**adherance:** ✓ blueprint matches. extends extant file, updates vault name.

---

### inferKeyrackMechForSet.ts

**blueprint:** `[+] inferKeyrackMechForSet.ts — prompt for mech selection`

**vision:** "add mech inference when vault supports multiple mechs"

**adherance:** ✓ blueprint matches. new operation for mech inference.

---

### inferMechFromVault.ts deletion

**blueprint:** `[-] inferMechFromVault.ts — delete (incompatible: assumes one mech per vault)`

**vision:** mentions mech inference for multi-mech vaults

**adherance:** ✓ correct to delete. extant code assumes one mech per vault, new architecture supports multiple.

---

### aws.iam.sso → aws.config rename

**blueprint:**
```
aws.iam.sso/ → aws.config/
  [-] aws.iam.sso/                 — delete directory
  [+] aws.config/                  — create directory
```

**vision:** "rename `aws.iam.sso` vault to `aws.config`"

**adherance:** ✓ blueprint matches. directory rename.

---

## codepath tree adherance

### set flow

**blueprint:** shows vault inference → vault lookup → mech inference → mech promptForSet → vault storage

**vision:** "mech adapters own their guided setup prompts"

**adherance:** ✓ blueprint matches. mech.promptForSet runs before vault.set.

---

### unlock flow

**blueprint:** shows vault.get → mech.translate → daemon.set

**vision:** "on unlock: vault retrieves → mech translates json → short-lived token"

**adherance:** ✓ blueprint matches. mech.translate handles transformation.

---

## interface adherance

### promptForSet method

**blueprint:**
```
promptForSet: ({ key, keyrackOrg, env }) => { source: string }
```

**criteria:** mech adapter contract says "adapter.promptForSet runs guided setup via stdin, returns source credential"

**adherance:** ✓ blueprint matches.

---

### supportedMechs property

**blueprint:**
```
supportedMechs: KeyrackGrantMechanism[]
```

**criteria:** vault adapter contract says "adapter.supportedMechs lists compatible mechs"

**adherance:** ✓ blueprint matches.

---

### checkMechCompat method

**blueprint:**
```
checkMechCompat: ({ mech }) => void (throws on incompatible)
```

**criteria:** vault adapter contract says "adapter.checkMechCompat validates mech, fails fast with alternatives"

**adherance:** ✓ blueprint matches.

---

## compatibility matrix adherance

**blueprint:**
```
                           PERMANENT_  EPHEMERAL_    EPHEMERAL_    PERMANENT_
                           VIA_REPLICA VIA_GITHUB_APP VIA_AWS_SSO   VIA_AWS_KEY

os.secure                  ✓           ✓              ✗             ✗
os.direct                  ✓           ✗              ✗             ✗
1password                  ✓           ✓              ✗             ✗
aws.config                 ✗           ✗              ✓             ✓
```

**vision requirements:**
- "EPHEMERAL_VIA_GITHUB_APP works with os.secure, 1password" — ✓ both marked ✓
- "explicitly forbid os.direct from ephemeral support" — ✓ os.direct only supports PERMANENT_VIA_REPLICA
- "os.secure + EPHEMERAL_VIA_AWS_SSO fails fast" — ✓ marked ✗
- "aws sso only works with aws.config vault" — ✓ aws.config is only vault with EPHEMERAL_VIA_AWS_SSO ✓

**adherance:** ✓ matrix aligns with all requirements.

---

## special case: aws.config

**blueprint:**
```
├─ EPHEMERAL_VIA_AWS_SSO (special case: vault orchestrates)
│  ├─ vault.set calls mech.promptForSet internally
│  ├─ [←] reuse setupAwsSsoWithGuide logic
```

**vision:** "aws sso works as it always did via stdout, only the internals change"

**adherance:** ✓ vault orchestrates to preserve extant behavior.

---

## verdict

all blueprint items adhere to vision and criteria. no deviations found.
