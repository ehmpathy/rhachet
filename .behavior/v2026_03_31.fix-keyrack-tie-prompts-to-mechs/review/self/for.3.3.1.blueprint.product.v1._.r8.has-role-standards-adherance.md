# self-review r8: has-role-standards-adherance

## fresh examination: mechanic role standards

check if blueprint follows mechanic role practices.

---

## issue 1: gerund in summary

**blueprint line 9:**
> "refactor keyrack so that mech adapters own their guided setup prompts, making mechs portable across compatible vaults."

**problem:** "making" is a gerund.

**fix needed:** split into two sentences or rephrase.

**suggested:**
> "refactor keyrack so that mech adapters own their guided setup prompts. this makes mechs portable across compatible vaults."

**status:** blocker — must fix before execution.

---

## check: input-context pattern

**blueprint shows:**
```
promptForSet: ({ key, keyrackOrg, env }) => { source: string }
checkMechCompat: ({ mech }) => void (throws on incompatible)
```

**verification:** follows (input, context?) pattern. input is destructured object. correct.

---

## check: get/set/gen verbs

**blueprint proposes:**
- `inferKeyrackVaultFromKey` — uses `infer` verb
- `inferKeyrackMechForSet` — uses `infer` verb

**question:** should these use `get` instead?

**analysis:** extant codebase uses `infer` for these operations. the verb `infer` implies deduction from context, which matches the behavior. `getOneVaultFromKey` would imply lookup, not deduction.

**verdict:** acceptable — `infer` is the extant pattern for these operations.

---

## check: domain operation verbs

**blueprint shows codepath:**
```
setKeyrackKey
├─ inferVault
├─ vault adapter lookup
├─ inferKeyrackMechForSet
├─ checkMechCompat
├─ mech adapter promptForSet
├─ setKeyrackKeyHost
└─ roundtrip validation
```

**verification:**
- `setKeyrackKey` — uses `set` verb ✓
- `setKeyrackKeyHost` — uses `set` verb ✓
- `inferVault` — uses `infer` (extant pattern) ✓
- `inferKeyrackMechForSet` — uses `infer` (extant pattern) ✓
- `checkMechCompat` — uses `check` verb (validation operation) ✓
- `promptForSet` — uses `prompt` verb (interactive operation) ✓

all verbs are acceptable.

---

## check: single responsibility

**blueprint proposes:**
- each mech adapter: owns its own prompts and transformation
- each vault adapter: owns its own storage format
- `inferKeyrackMechForSet`: single operation for mech selection

**verification:** each file does one thing. correct.

---

## check: test coverage pattern

**blueprint shows:**
- unit tests per adapter method
- integration tests for full flows
- journey tests with given/when/then structure

**verification:** follows test-fns pattern with given/when/then. correct.

---

## summary

| standard | adherance |
|----------|-----------|
| input-context pattern | ✓ |
| get/set/gen verbs | ✓ (infer is extant pattern) |
| single responsibility | ✓ |
| test coverage pattern | ✓ |
| gerund prohibition | ✗ line 9 has "making" |

---

## verdict

one blocker: gerund "making" in blueprint summary (line 9). fix before execution.

all other standards followed.
