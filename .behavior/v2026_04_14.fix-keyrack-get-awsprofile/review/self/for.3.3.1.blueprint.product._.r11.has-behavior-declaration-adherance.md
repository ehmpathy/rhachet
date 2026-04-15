# self-review r11: has-behavior-declaration-adherance

a junior recently modified files in this repo. we need to carefully review that the blueprint adheres to the behavior declaration (vision + criteria).

---

## vision adherence check

### V1: after state returns profile name

**vision declares (lines 18-25):**
```bash
$ rhx keyrack get --key AWS_PROFILE --env test
# returns: ehmpathy.demo
```

**blueprint implements (lines 63-67):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**verdict:** adheres. `source` is `input.exid` which is the profile name (e.g., `ehmpathy.demo`).

### V2: proposed fix location

**vision declares (lines 138-140):**
> `vaultAdapterAwsConfig.get()` — for aws.config vault, always return the profile name (exid)

**blueprint implements (lines 27-30):**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts      # remove mech.deliverForGet call in get()
```

**verdict:** adheres. fix is in the declared location.

### V3: remove mech.deliverForGet call

**vision declares (lines 143-157):**
```ts
// current (buggy)
const { secret } = await mechAdapter.deliverForGet({ source });
return secret;  // ← this returns JSON blob

// proposed (fixed)
return source;  // ← always return profile name for aws.config
```

**blueprint implements (lines 35-42):**
```
vaultAdapterAwsConfig.get()
├── [○] retain: null check for exid
├── [-] delete: mech check and deliverForGet call
└── [○] retain: return source (exid) directly
```

**verdict:** adheres. blueprint explicitly deletes the mech call.

### V4: rationale for the fix

**vision declares (lines 159-160):**
> the mech.deliverForGet is conceptually for vaults like os.secure that store a source credential (like a github app private key) that requires transformation into a usable secret (like an installation token). for aws.config, the stored value (profile name) IS the usable secret — no transformation required.

**blueprint declares (lines 101-103):**
> the mech.deliverForGet() pattern is correct for vaults that store a SOURCE credential that requires transformation (e.g., github app pem → installation token). for aws.config vault, the stored value (profile name) IS the usable secret — the aws sdk does credential lookup from the profile name. no keyrack transformation is needed.

**verdict:** adheres. rationale preserved and explained correctly.

---

## criteria adherence check

### usecase.1: keyrack get returns profile name

**criteria declares:**
```
given(aws.config vault key is set for AWS_PROFILE)
  given(key is unlocked)
    when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
      then(returns the profile name, not JSON)
      then(output is a single string like `ehmpathy.demo`)
```

**blueprint satisfies:** returns `input.exid` which is the profile name string.

**verdict:** adheres.

### usecase.2: exported value works with aws cli

**criteria declares:**
```
when(user runs `export AWS_PROFILE=$(rhx keyrack get ... --silent)`)
  then(AWS_PROFILE contains the profile name)
  then(aws cli commands succeed with the profile)
```

**blueprint satisfies:** the profile name return makes this work.

**verdict:** adheres.

### usecase.3: exported value works with aws sdk

**criteria declares:**
```
when(user sets `process.env.AWS_PROFILE` to the returned value)
  then(aws sdk looks up credentials from the profile)
```

**blueprint satisfies:** profile name is what sdk expects.

**verdict:** adheres.

### usecase.4: silent mode returns raw value

**criteria declares:**
```
when(user runs `rhx keyrack get ... --silent`)
  then(outputs only the profile name with no decorations)
```

**blueprint satisfies:** get() returns the profile name; silent flag behavior is unchanged.

**verdict:** adheres.

### usecase.5: daemon cache refresh after fix

**criteria declares:**
```
given(daemon has old cached JSON from before the fix)
  when(user runs `rhx keyrack relock` then `rhx keyrack unlock`)
    then(daemon now has the profile name, not JSON)
```

**blueprint satisfies:** unlock calls get() → get() now returns profile name → daemon caches profile name.

**verdict:** adheres.

### edgecase.1: sso session expired

**criteria declares:**
```
given(sso session has expired)
  when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
    then(still returns the profile name)
```

**blueprint satisfies:** get() returns exid regardless of sso session state.

**verdict:** adheres.

### edgecase.2: key not unlocked

**criteria declares:**
```
given(key is NOT unlocked)
  then(returns locked status)
```

**blueprint satisfies:** this is handled upstream, not in vault.get(). unchanged.

**verdict:** adheres (out of scope for this fix).

### edgecase.3: key not set

**criteria declares:**
```
given(no aws.config vault key for AWS_PROFILE)
  then(returns absent status)
```

**blueprint satisfies:** if exid is null, get() returns null. upstream handles absent status.

**verdict:** adheres (out of scope for this fix).

---

## code comparison

### vision proposed code (lines 154-157)

```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← always return profile name for aws.config
},
```

### blueprint after code (lines 63-67)

```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**verdict:** exact match. blueprint implements vision precisely.

---

## summary

| requirement | adheres | evidence |
|-------------|---------|----------|
| V1: returns profile name | yes | returns input.exid |
| V2: fix location | yes | vaultAdapterAwsConfig.ts |
| V3: remove mech call | yes | [-] delete in codepath tree |
| V4: rationale | yes | documented in blueprint |
| usecase.1: profile name | yes | returns exid |
| usecase.2: aws cli | yes | profile name works |
| usecase.3: aws sdk | yes | profile name works |
| usecase.4: silent mode | yes | unchanged |
| usecase.5: daemon refresh | yes | new code used on unlock |
| edgecase.1: sso expired | yes | exid returned regardless |
| edgecase.2: not unlocked | yes | out of scope |
| edgecase.3: not set | yes | returns null |

---

## why it holds

**the blueprint adheres to the behavior declaration.** articulation:

1. **code matches vision exactly** — the blueprint's after code is character-for-character identical to the vision's proposed code. both show `const source = input.exid ?? null; return source;`.

2. **fix location is honored** — vision proposed the fix in `vaultAdapterAwsConfig.get()`. blueprint modifies exactly that file.

3. **mech call deletion is explicit** — vision said to remove `mech.deliverForGet()`. blueprint's codepath tree explicitly marks `[-] delete: mech check and deliverForGet call`.

4. **all usecases are satisfied** — the fix returns the profile name, which satisfies all five usecases (get returns profile name, aws cli works, aws sdk works, silent mode works, daemon refresh works).

5. **all edgecases are handled** — sso expired still returns profile name. not-unlocked and not-set are handled upstream (out of scope for this fix).

6. **rationale is preserved** — blueprint explains why mech.deliverForGet is not needed for aws.config (profile name IS the usable secret).

7. **no deviation from spec** — i compared line by line. the junior did not misinterpret or deviate from the vision or criteria.

the blueprint faithfully adheres to the behavior declaration.
