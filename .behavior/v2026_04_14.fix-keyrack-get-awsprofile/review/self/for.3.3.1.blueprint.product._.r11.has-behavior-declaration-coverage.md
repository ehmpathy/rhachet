# self-review r11: has-behavior-declaration-coverage

a junior recently modified files in this repo. we need to carefully review that the blueprint covers all behavior declaration requirements.

---

## source: wish (0.wish.md)

### wish line-by-line

```
wish =

  profile: '{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'

  keyrack is setting AWS_PROFILE to a JSON string containing credentials instead of the
  profile name "ehmpathy.demo".

  The keyrack should either:
  1. Set AWS_PROFILE=ehmpathy.demo (let SDK resolve credentials)
  2. Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN as separate env vars

  This is a keyrack mechanism bug - it's resolving the profile and stuffing all credentials
  into AWS_PROFILE as JSON.


----

we gotta fix that bug

it should just set AWS_PROFILE
```

### wish requirements extracted

| id | requirement | source quote |
|----|-------------|--------------|
| W1 | bug: returns JSON credentials | `'{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'` |
| W2 | expected: return profile name | `ehmpathy.demo` |
| W3 | option 1: set AWS_PROFILE to profile name | `Set AWS_PROFILE=ehmpathy.demo` |
| W4 | option 2: set individual env vars | `AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN` |
| W5 | chosen approach | `it should just set AWS_PROFILE` |

**wish analysis:**
- W1-W2: describe the bug (JSON instead of profile name)
- W3-W4: two possible fixes
- W5: user chose W3 (profile name approach)

---

## source: vision (1.vision.yield.md)

### vision requirements extracted

| id | requirement | source |
|----|-------------|--------|
| V1 | before: returns JSON blob | lines 8-14 |
| V2 | after: returns profile name | lines 18-25 |
| V3 | aws cli compatibility | lines 35-39 |
| V4 | fix in vaultAdapterAwsConfig.get() | lines 139-158 |
| V5 | remove mech.deliverForGet call | lines 143-157 |
| V6 | exid contains profile name | line 141 |
| V7 | no transformation for aws.config vault | lines 159-161 |

### vision code excerpt (lines 143-157)

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

---

## blueprint coverage verification

from `3.3.1.blueprint.product.yield.md`:

### V1: before returns JSON blob

**blueprint declares (lines 44-58):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;

  // if no mech supplied, return source as-is
  if (!input.mech) return source;

  // transform source → usable secret via mech
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;  // ← bug: returns JSON blob
},
```

**verdict:** V1 matched. blueprint shows the buggy "before" code.

### V2: after returns profile name

**blueprint declares (lines 63-67):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**verdict:** V2 matched. blueprint shows the fixed "after" code.

### V3: aws cli compatibility

**vision declares (lines 35-39):**
```
| check configured profile | `rhx keyrack get --key AWS_PROFILE --env test` | shows profile name |
| use aws cli | `export AWS_PROFILE=$(rhx keyrack get ...)` | aws cli works |
| use aws sdk | `process.env.AWS_PROFILE = ...` | sdk looks up credentials |
```

**blueprint analysis:** the fix returns profile name, which is compatible with:
- `export AWS_PROFILE=ehmpathy.demo` → aws cli works
- `process.env.AWS_PROFILE = 'ehmpathy.demo'` → sdk works

**verdict:** V3 satisfied by the fix.

### V4: fix in vaultAdapterAwsConfig.get()

**blueprint declares (lines 27-31):**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts      # remove mech.deliverForGet call in get()
```

**verdict:** V4 matched. fix is in the declared location.

### V5: remove mech.deliverForGet call

**blueprint declares (lines 39-41):**
```
vaultAdapterAwsConfig.get()
├── [○] retain: null check for exid
├── [-] delete: mech check and deliverForGet call
└── [○] retain: return source (exid) directly
```

**verdict:** V5 matched. mech call is deleted.

### V6: exid contains profile name

**vision declares (line 141):**
> for `AWS_PROFILE` specifically, `vault.get()` should return the profile name directly

**blueprint declares:**
- returns `input.exid ?? null`
- exid is the profile name (e.g., `ehmpathy.demo`)

**verdict:** V6 satisfied. exid is returned directly.

### V7: no transformation for aws.config vault

**vision declares (lines 159-161):**
> the mech.deliverForGet is conceptually for vaults like os.secure that store a source credential that requires transformation into a usable secret. for aws.config, the stored value (profile name) IS the usable secret — no transformation required.

**blueprint declares (lines 101-104):**
> the mech.deliverForGet() pattern is correct for vaults that store a SOURCE credential that requires transformation. for aws.config vault, the stored value (profile name) IS the usable secret — the aws sdk does credential lookup from the profile name.

**verdict:** V7 satisfied. rationale is documented in blueprint.

---

## wish coverage verification

### W1-W2: bug fix

| aspect | wish | blueprint |
|--------|------|-----------|
| bug | JSON credentials | before: `secret` from deliverForGet |
| fix | profile name | after: `source` (exid) directly |

**verdict:** W1-W2 covered.

### W3: chosen approach (set AWS_PROFILE)

**wish declares:** `it should just set AWS_PROFILE`

**blueprint implements:** returns profile name, not credentials.

**verdict:** W3 covered.

### W4: alternative approach (not chosen)

**wish mentions:** `Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN`

**blueprint:** does not implement this alternative (correctly, per W5).

**verdict:** W4 correctly not implemented.

### W5: user's chosen fix

**wish declares:** `it should just set AWS_PROFILE`

**blueprint implements:** returns profile name for AWS_PROFILE.

**verdict:** W5 covered.

---

## test coverage verification

**blueprint declares (lines 89-97):**
```
test tree

src/domain.operations/keyrack/adapters/vaults/aws.config/
├── vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
    └── [+] create: given '[case2] exid provided'
                    when '[t0.5] get called with exid AND mech'
                    then 'returns the exid as the profile name (ignores mech)'
```

**coverage analysis:**

| case | extant | new |
|------|--------|-----|
| no exid → null | yes | - |
| exid without mech → profile | yes | - |
| exid with mech → profile | - | yes |

the new test covers the exact bug path.

**verdict:** test coverage is complete.

---

## summary

| requirement | covered | evidence |
|-------------|---------|----------|
| W1: bug (JSON) | yes | before code in blueprint |
| W2: fix (profile name) | yes | after code in blueprint |
| W3: set AWS_PROFILE | yes | returns exid directly |
| W4: alternative (not chosen) | n/a | correctly skipped |
| W5: user's choice | yes | implements profile name approach |
| V1: before behavior | yes | code matches vision |
| V2: after behavior | yes | code matches vision |
| V3: aws cli compat | yes | profile name works |
| V4: fix location | yes | vaultAdapterAwsConfig.ts |
| V5: remove mech call | yes | deleted in codepath tree |
| V6: exid is profile | yes | returns exid |
| V7: no transform | yes | rationale documented |
| test coverage | yes | new test for mech path |

---

## why it holds

**all behavior declaration requirements are covered.** articulation:

1. **wish is satisfied line-by-line** — the user said "it should just set AWS_PROFILE". the blueprint returns the profile name (exid) directly, not JSON credentials.

2. **vision before/after is implemented exactly** — the blueprint's before code matches vision lines 143-150. the blueprint's after code matches vision lines 153-157.

3. **fix location matches vision** — vision proposed the fix in `vaultAdapterAwsConfig.get()`. the blueprint modifies exactly that file.

4. **mech call is deleted as proposed** — vision said mech.deliverForGet should not be called for aws.config. blueprint deletes those lines.

5. **rationale is preserved** — the vision explains WHY the fix is correct (profile name IS the secret). the blueprint includes this rationale.

6. **test covers the bug path** — the bug occurred when mech was supplied. the new test verifies get() with mech returns profile name.

7. **no requirement is skipped** — i traced every requirement from wish and vision to the blueprint. all are covered.

the blueprint fully covers all behavior declaration requirements.
