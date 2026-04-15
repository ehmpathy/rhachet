# self-review r8: has-consistent-mechanisms

a junior recently modified files in this repo. we need to carefully review for new mechanisms that duplicate extant functionality.

---

## codebase search: how do other vaults implement get()?

### vaultAdapterOsSecure.get() (lines 129-158)

```ts
get: async (input) => {
  // ... identity check, file read ...
  const source = await decryptWithIdentity({ ciphertext, identity });

  // if no mech supplied, return source as-is
  if (!input.mech) return source;

  // transform source → usable secret via mech
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;
},
```

**observation:** os.secure DOES call `mech.deliverForGet()` when mech is supplied.

### vaultAdapter1Password.get() (lines 250-287)

```ts
get: async (input) => {
  // ... account check, vault check ...
  const { stdout } = await execOp(['read', input.exid]);
  source = stdout.trim();

  // if no mech supplied, return source as-is
  if (!input.mech) return source;

  // transform source → usable secret via mech
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;
},
```

**observation:** 1password DOES call `mech.deliverForGet()` when mech is supplied.

### vaultAdapterAwsConfig.get() (BEFORE fix)

```ts
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;  // ← returns JSON blob instead of profile name
},
```

**observation:** aws.config ALSO calls `mech.deliverForGet()` — this is the bug.

---

## analysis: why does aws.config differ from os.secure and 1password?

### what os.secure and 1password store

| vault | stores | source | mech transform | usable secret |
|-------|--------|--------|----------------|---------------|
| os.secure | encrypted blob | PEM file, token, etc | yes | ghs_ token, etc |
| 1password | secret reference | PEM file, token, etc | yes | ghs_ token, etc |

for EPHEMERAL_VIA_GITHUB_APP:
- source = JSON blob with PEM file content
- deliverForGet = PEM → ghs_ installation token
- usable secret = ghs_ token for github api

### what aws.config stores

| vault | stores | source | mech transform | usable secret |
|-------|--------|--------|----------------|---------------|
| aws.config | profile name | profile name | **NO** | profile name |

for EPHEMERAL_VIA_AWS_SSO:
- source = profile name ("ehmpathy.demo")
- deliverForGet = would fetch JSON credentials from SSO
- usable secret = **profile name** (AWS SDK does the SSO lookup)

**the difference:** aws.config vault stores a REFERENCE, not a source that needs to be transformed.

---

## why the fix is correct (not an inconsistency)

### the mech.deliverForGet() pattern purpose

per the doc comment in `vaultAdapterOsSecure.ts`:

> .note = vault encapsulates mech transformation:
>         1. retrieve source from storage (decrypt)
>         2. call mech.deliverForGet({ source }) if mech supplied
>         3. return translated secret (or source if no mech)

this pattern is for vaults that store a SOURCE credential that requires transformation.

### aws.config is different by design

per the doc comment at `vaultAdapterAwsConfig.ts:117-124`:

> profile names are 'reference' protection (no secrets touch keyrack)

aws.config vault stores a profile name that is ALREADY the usable secret. the AWS SDK looks up credentials via the profile name. keyrack does not need to transform it.

### consistency is NOT "same code everywhere"

consistency means "same pattern for same purpose":

| purpose | pattern |
|---------|---------|
| vault stores source that requires transform | call deliverForGet() |
| vault stores usable secret directly | return directly |

aws.config falls into the second category. the fix makes it consistent with its PURPOSE, not with other vaults' implementations.

---

## duplication check

### does the fix introduce new mechanisms?

**no.** the fix is a deletion:

```ts
// deleted
if (!input.mech) return source;
const mechAdapter = getMechAdapter(input.mech);
const { secret } = await mechAdapter.deliverForGet({ source });
return secret;
```

### could we reuse an extant pattern?

**not applicable.** the fix removes the mech pattern from aws.config because it's the wrong pattern for this vault.

---

## summary

| question | answer |
|----------|--------|
| does codebase have a mechanism for this? | yes, but wrong pattern for aws.config |
| do we duplicate extant utilities? | no, we delete code |
| could we reuse extant component? | no, the fix is removal not addition |

---

## why it holds

**no duplication of extant functionality.** articulation:

1. **os.secure and 1password call deliverForGet()** — they store SOURCE credentials that require transformation (e.g., PEM → ghs_ token).

2. **aws.config stores a profile name** — the profile name IS the usable secret. AWS SDK does the credential lookup via the profile name.

3. **the fix removes the wrong pattern** — aws.config should never have called deliverForGet(). the profile name does not need transformation.

4. **consistency is purpose-based** — vaults that store sources call deliverForGet(). vaults that store usable secrets return directly. aws.config is the second type.

5. **no new mechanisms introduced** — the fix is a deletion. 6 lines → 3 lines. we cannot duplicate by deletion.

the blueprint does not duplicate extant functionality. it removes incorrect use of the mech pattern from a vault that does not need transformation.
