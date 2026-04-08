# self-review r1: has-questioned-assumptions

## technical assumptions examined

### 1. gh cli availability detection

**assumption:** we can detect if gh cli is authenticated via command execution

**question:** how do we actually detect this?

**evidence needed:** look at how extant code detects gh cli state

**what if opposite:** if we can't detect, fallback is the only path

**verdict:** assumption holds — `gh auth status` returns exit code, or api calls fail. fallback path covers both detection failure and auth failure.

---

### 2. mech adapter promptForSet returns source credential

**assumption:** promptForSet returns a single string (source credential)

**question:** is this sufficient for all mechs?

**evidence:**
- PERMANENT_VIA_REPLICA: returns secret string ✓
- EPHEMERAL_VIA_GITHUB_APP: returns json blob string ✓
- EPHEMERAL_VIA_AWS_SSO: returns profile name string ✓

**simpler approach:** could avoid string by return structured data?

**answer:** json blob is already structured as string for storage. profile name is simple string. string is the common format for vault storage. no simpler approach.

**verdict:** assumption holds — string format works for all mechs

---

### 3. vault adapters can declare supportedMechs statically

**assumption:** vault/mech compatibility is known at declaration time

**question:** could compatibility depend on runtime state?

**counterexample:** what if 1password vault only supports github app when op cli version >= X?

**answer:** runtime validation can happen in checkMechCompat, not supportedMechs list. list is for discovery (show user options), checkMechCompat is for validation (fail fast).

**verdict:** assumption holds — static list for discovery, runtime check for validation

---

### 4. vault.set accepts secret as input parameter

**assumption:** vault adapter set method receives secret from caller, does not prompt

**question:** what about vaults that need extra context (e.g., exid for 1password)?

**evidence from research:**
```ts
set: (input: { slug: string; secret: string; exid?: string | null; /* ... */ })
```

**answer:** extant interface already has exid parameter. blueprint changes secret source (from vault prompt to mech adapter), not interface shape.

**verdict:** assumption holds — interface already supports this pattern

---

### 5. mech inference prompts via stdin

**assumption:** stdin is available for interactive prompts during set

**question:** what about non-interactive contexts (CI, automation)?

**evidence from wish:** this is an interactive CLI tool. wisher shows prompted flows.

**answer:** if stdin not available (non-TTY), fail fast with error "interactive setup required, provide --mech flag". same pattern as aws sso today.

**verdict:** assumption holds — interactive context is the use case; non-interactive can use explicit flags

---

### 6. github api returns installations per org

**assumption:** `gh api /orgs/{org}/installations` returns app installations

**question:** is this the correct API endpoint?

**evidence from wish:**
```
gh api --method GET /orgs/ehmpathy/installations
{
  "total_count": 5,
  "installations": [...]
}
```

**answer:** wisher tested this endpoint directly. returns installations with app_id and id (installation id).

**verdict:** assumption holds — api confirmed by wisher

---

### 7. pem file can be read and escaped for json

**assumption:** .pem file content can be read, newlines escaped, stored in json

**question:** are there pem format edge cases?

**counterexamples:**
- encrypted pem (requires passphrase) — fail fast, show error
- pem with unusual line endings — convert to \n
- pem without proper headers — validate format before store

**answer:** validation happens in mech adapter promptForSet. fail fast with guidance if format invalid.

**verdict:** assumption holds — validate format, fail fast on issues

---

### 8. vault rename aws.iam.sso → aws.config is clean

**assumption:** renaming vault directory and adapter is straightforward

**question:** what about extant host manifests that reference aws.iam.sso?

**evidence:** per memory, "never add backwards compat, just delete"

**answer:** zero backwards compat. extant manifests with aws.iam.sso become invalid. users re-run keyrack set.

**verdict:** assumption holds — no migration, clean break

---

### 9. roundtrip validation uses same mech adapter translate

**assumption:** validation (unlock → get) uses same mech.translate as normal flow

**question:** could validation need different behavior?

**answer:** no — validation proves the normal flow works. same code path ensures what we validate is what we use.

**verdict:** assumption holds — same code path for validation

---

### 10. inferVault based on key name patterns

**assumption:** AWS_PROFILE and AWS_* keys map to aws.config vault

**question:** could the same key need different vaults?

**counterexample:** AWS_ACCESS_KEY_ID could be stored in os.secure as replica

**answer:** inference is a hint, not requirement. user can override with --vault flag. inference helps common case (AWS_PROFILE for sso), explicit flag for edge cases.

**verdict:** assumption holds — inference is convenience, override is possible

---

## hidden assumptions found

### none requiring blueprint change

all assumptions examined either:
1. hold with evidence
2. have clear fallback paths
3. are documented in criteria/vision

---

## verdict

no hidden technical assumptions that invalidate the blueprint. all assumptions traced to evidence or have explicit fallback paths.
