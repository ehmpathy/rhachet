# self-review r12: has-behavior-declaration-adherance

a junior recently modified files in this repo. we need to carefully review that the blueprint adheres to the behavior declaration (vision + criteria).

---

## methodology

for each requirement from vision and criteria:
1. extract the exact declaration text
2. find the exact blueprint implementation
3. verify they match semantically and structurally
4. articulate why they match (or fix if they do not)

---

## vision line-by-line adherence

### vision requirement 1: before/after behavior

**vision lines 7-14 (before):**
```bash
$ rhx keyrack get --key AWS_PROFILE --env test
# returns: '{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4","AWS_SECRET_ACCESS_KEY":"...","AWS_SESSION_TOKEN":"..."}'
```

**vision lines 18-25 (after):**
```bash
$ rhx keyrack get --key AWS_PROFILE --env test
# returns: ehmpathy.demo
```

**blueprint lines 44-58 (before):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;  // ← bug: returns JSON blob
},
```

**blueprint lines 63-67 (after):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**analysis:**
- vision.before: returns JSON blob
- blueprint.before: `return secret` from `mechAdapter.deliverForGet()` → returns JSON blob
- vision.after: returns `ehmpathy.demo` (profile name)
- blueprint.after: `return source` where `source = input.exid` → returns profile name

**verdict:** adheres. the before/after code produces the exact behaviors described in vision.

---

### vision requirement 2: proposed fix location

**vision lines 138-140:**
> `vaultAdapterAwsConfig.get()` — for aws.config vault, always return the profile name (exid). the mech.deliverForGet call exists for other vaults that store source credentials that require transformation.

**blueprint lines 27-30:**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts      # remove mech.deliverForGet call in get()
```

**analysis:**
- vision specifies: `vaultAdapterAwsConfig.get()`
- blueprint targets: `vaultAdapterAwsConfig.ts` with note "remove mech.deliverForGet call in get()"

**verdict:** adheres. fix location matches exactly.

---

### vision requirement 3: exact code change

**vision lines 143-157 (proposed code):**
```ts
// current (buggy)
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;  // ← this path is correct
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;  // ← this returns JSON blob
},

// proposed (fixed)
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← always return profile name for aws.config
},
```

**blueprint lines 44-67 (implemented code):**

before:
```ts
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;  // ← bug: returns JSON blob
},
```

after:
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**line-by-line comparison:**

| vision proposed | blueprint after | match? |
|-----------------|-----------------|--------|
| `get: async (input) => {` | `get: async (input) => {` | yes |
| `const source = input.exid ?? null;` | `const source = input.exid ?? null;` | yes |
| `return source;` | `return source;` | yes |
| `},` | `},` | yes |

**verdict:** adheres. blueprint implements vision's proposed code character-for-character.

---

### vision requirement 4: rationale

**vision lines 159-160:**
> the mech.deliverForGet is conceptually for vaults like os.secure that store a source credential (like a github app private key) that requires transformation into a usable secret (like an installation token). for aws.config, the stored value (profile name) IS the usable secret — no transformation required.

**blueprint lines 101-103:**
> the mech.deliverForGet() pattern is correct for vaults that store a SOURCE credential that requires transformation (e.g., github app pem → installation token). for aws.config vault, the stored value (profile name) IS the usable secret — the aws sdk does credential lookup from the profile name. no keyrack transformation is needed.

**semantic comparison:**

| concept | vision says | blueprint says |
|---------|-------------|----------------|
| mech.deliverForGet purpose | "transform source credential into usable secret" | "transform SOURCE credential" |
| example | "github app private key → installation token" | "github app pem → installation token" |
| aws.config case | "profile name IS the usable secret" | "profile name IS the usable secret" |
| conclusion | "no transformation required" | "no keyrack transformation is needed" |

**verdict:** adheres. rationale is semantically equivalent.

---

## criteria line-by-line adherence

### criteria usecase.1: keyrack get returns profile name

**criteria lines 5-12:**
```
given(aws.config vault key is set for AWS_PROFILE)
  given(key is unlocked)
    when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
      then(returns the profile name, not JSON)
        sothat(user can export directly to AWS_PROFILE env var)
      then(output is a single string like `ehmpathy.demo`)
        sothat(no json parse is required)
```

**blueprint implementation:**
- `get()` returns `input.exid` which is the profile name string (e.g., `ehmpathy.demo`)
- no JSON involved — just the string

**verification:**
- "returns the profile name, not JSON" → blueprint returns `source = input.exid` (string, not JSON)
- "output is a single string like `ehmpathy.demo`" → exid IS the profile name string

**verdict:** adheres.

---

### criteria usecase.2: exported value works with aws cli

**criteria lines 17-23:**
```
given(keyrack returns profile name for AWS_PROFILE)
  when(user runs `export AWS_PROFILE=$(rhx keyrack get --key AWS_PROFILE --env test --silent)`)
    then(AWS_PROFILE contains the profile name)
      sothat(aws cli can lookup credentials from ~/.aws/config)
    then(aws cli commands succeed with the profile)
      sothat(user workflow is unbroken)
```

**blueprint implementation:**
- get() returns profile name
- user exports: `export AWS_PROFILE=ehmpathy.demo`
- aws cli looks up credentials from `~/.aws/config` under `[profile ehmpathy.demo]`

**verification:**
- this is the standard aws cli workflow
- blueprint enables it by the profile name return

**verdict:** adheres.

---

### criteria usecase.3: exported value works with aws sdk

**criteria lines 28-32:**
```
given(keyrack returns profile name for AWS_PROFILE)
  when(user sets `process.env.AWS_PROFILE` to the returned value)
    then(aws sdk looks up credentials from the profile)
      sothat(sdk-based tools work without modification)
```

**blueprint implementation:**
- get() returns profile name
- `process.env.AWS_PROFILE = 'ehmpathy.demo'`
- aws sdk reads `AWS_PROFILE` env var and fetches credentials

**verification:**
- aws sdk behavior: reads `AWS_PROFILE` and looks up credentials from shared config
- blueprint enables it by the profile name return

**verdict:** adheres.

---

### criteria usecase.4: silent mode returns raw value

**criteria lines 37-42:**
```
given(aws.config vault key is set for AWS_PROFILE)
  given(key is unlocked)
    when(user runs `rhx keyrack get --key AWS_PROFILE --env test --silent`)
      then(outputs only the profile name with no decorations)
        sothat(value can be captured in shell variable)
```

**blueprint implementation:**
- get() returns profile name
- silent mode (handled elsewhere) outputs raw value without decorations

**verification:**
- blueprint's fix does not change silent mode behavior
- silent mode already outputs whatever get() returns
- get() now returns profile name → silent outputs profile name

**verdict:** adheres.

---

### criteria usecase.5: daemon cache refresh after fix

**criteria lines 47-51:**
```
given(daemon has old cached JSON from before the fix)
  when(user runs `rhx keyrack relock --env test` then `rhx keyrack unlock --env test`)
    then(daemon now has the profile name, not JSON)
      sothat(subsequent get returns correct value)
```

**blueprint implementation:**
- relock clears daemon cache
- unlock calls vault.get() → now returns profile name
- daemon caches the profile name

**verification:**
- the fix is in vault.get()
- unlock invokes vault.get() to populate daemon
- after fix, vault.get() returns profile name
- daemon receives and caches profile name

**verdict:** adheres.

---

### criteria edgecase.1: sso session expired

**criteria lines 58-65:**
```
given(aws.config vault key is set for AWS_PROFILE)
  given(sso session has expired)
    when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
      then(still returns the profile name)
        sothat(user can export the value)
      then(aws cli will prompt for sso re-login when invoked)
        sothat(session refresh is handled by aws cli, not keyrack)
```

**blueprint implementation:**
- get() returns `input.exid` regardless of sso session state
- sso session is not consulted in get()

**verification:**
- vision line 98: "sso session expired → `keyrack get` still returns profile name"
- blueprint's get() has no sso logic — just returns exid
- sso session validity is checked only in unlock, not in get

**verdict:** adheres.

---

### criteria edgecase.2: key not unlocked

**criteria lines 70-75:**
```
given(aws.config vault key is set for AWS_PROFILE)
  given(key is NOT unlocked)
    when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
      then(returns locked status)
        sothat(user knows to run unlock first)
```

**blueprint implementation:**
- this is handled by the keyrack orchestrator, not vault.get()
- vault.get() is only called after the orchestrator checks lock status

**verification:**
- out of scope for this fix
- blueprint only modifies vault.get() internals
- locked status check is upstream

**verdict:** adheres (out of scope).

---

### criteria edgecase.3: key not set

**criteria lines 80-84:**
```
given(no aws.config vault key for AWS_PROFILE)
  when(user runs `rhx keyrack get --key AWS_PROFILE --env test`)
    then(returns absent status)
      sothat(user knows to run set first)
```

**blueprint implementation:**
- if exid is null, `const source = input.exid ?? null` yields null
- `return source` returns null
- upstream handles null → absent status

**verification:**
- blueprint preserves null return for absent key
- absent status display is upstream

**verdict:** adheres (out of scope).

---

## test coverage adherence

**vision (implicit):** fix should be tested

**criteria (implicit):** behavior should be verified

**blueprint lines 89-97:**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
    └── [+] create: given '[case2] exid provided'
                    when '[t0.5] get called with exid AND mech'
                    then 'returns the exid as the profile name (ignores mech)'
```

**analysis:**
- new test covers the exact bug path: get() with mech supplied
- before fix: this path returns JSON blob
- after fix: this path returns exid (profile name)
- test verifies the fix works

**verdict:** adheres. test coverage includes the bug path.

---

## summary table

| requirement | vision/criteria | blueprint | adheres? |
|-------------|-----------------|-----------|----------|
| before behavior | returns JSON blob | mech.deliverForGet returns JSON | yes |
| after behavior | returns profile name | returns input.exid | yes |
| fix location | vaultAdapterAwsConfig.get() | vaultAdapterAwsConfig.ts | yes |
| code change | 3-line get() | exact 3-line match | yes |
| rationale | profile name IS usable secret | same rationale | yes |
| usecase.1 | returns profile name | returns exid | yes |
| usecase.2 | aws cli works | profile name enables | yes |
| usecase.3 | aws sdk works | profile name enables | yes |
| usecase.4 | silent mode raw | unchanged behavior | yes |
| usecase.5 | daemon refresh | unlock uses new get() | yes |
| edgecase.1 | sso expired ok | no sso logic in get() | yes |
| edgecase.2 | locked status | out of scope | yes |
| edgecase.3 | absent status | null returned | yes |
| test coverage | covers bug path | [t0.5] test added | yes |

---

## why it holds

**the blueprint adheres to the behavior declaration.** articulation:

1. **code is character-for-character identical** — i compared vision lines 154-157 with blueprint lines 63-67. the proposed `get: async (input) => { const source = input.exid ?? null; return source; }` is implemented exactly.

2. **all usecases are satisfied** — i traced each usecase from criteria to blueprint:
   - usecase.1: blueprint returns exid (profile name string)
   - usecase.2: profile name works with aws cli
   - usecase.3: profile name works with aws sdk
   - usecase.4: silent mode unchanged
   - usecase.5: unlock uses new get() for daemon refresh

3. **all edgecases are handled** — i verified:
   - edgecase.1: get() has no sso logic, returns exid regardless
   - edgecase.2: locked check is upstream, unchanged
   - edgecase.3: null exid returns null, upstream shows absent

4. **rationale is preserved** — blueprint explains the same conceptual distinction: mech.deliverForGet is for credentials that require transformation, but aws.config's profile name IS the usable secret.

5. **test coverage includes bug path** — the new `[t0.5]` test verifies get() with mech supplied returns the profile name (exid), not JSON.

6. **no deviation detected** — the junior implemented exactly what the vision specified. no misinterpretation. no deviation. no additional changes beyond the declared scope.

the blueprint faithfully adheres to the behavior declaration in vision and criteria.
