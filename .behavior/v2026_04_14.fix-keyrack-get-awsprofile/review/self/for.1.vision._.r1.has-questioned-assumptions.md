# self-review: has-questioned-assumptions

## assumption 1: all aws.config keys should return profile name

**what we assume:** for aws.config vault, vault.get() should always return the profile name, not credentials.

**evidence:**
- aws.config vault stores profile names in ~/.aws/config (ini format)
- the stored value (profile name) is referenced by exid in host manifest
- for AWS_PROFILE env var, aws sdk expects profile name, not credentials

**what if the opposite were true?**
- if user wanted raw credentials, they'd need different env vars (AWS_ACCESS_KEY_ID, etc)
- but that's a different key — they'd set AWS_ACCESS_KEY_ID, not AWS_PROFILE
- for AWS_PROFILE specifically, profile name is the only correct value

**verdict:** ✅ holds — for aws.config vault, profile name IS the usable secret

---

## assumption 2: mech.deliverForGet is unnecessary for aws.config

**what we assume:** aws.config vault should NOT call mech.deliverForGet.

**did the wisher say this?** no — we inferred this from "it should just set AWS_PROFILE"

**evidence from brief:**
- brief says EPHEMERAL_VIA_AWS_SSO deliverForGet is "profile name → sso session"
- current impl interprets "sso session" as resolved credentials JSON
- but for AWS_PROFILE, the "usable secret" IS the profile name

**what would happen if we kept mech.deliverForGet?**
- vault.get() returns credentials JSON
- stored in daemon as JSON string
- keyrack get returns JSON
- user sets AWS_PROFILE=JSON
- aws sdk fails ❌

**why is mech still useful without deliverForGet?**
- acquireForSet: guided setup (select sso portal → account → role → profile)
- validate: check profile name format, verify sso session status

**verdict:** ✅ holds — mech.deliverForGet exists for vaults that need transformation (e.g., os.secure with github app pem → token). aws.config vault stores the final value directly.

---

## assumption 3: fix won't break extant daemon cache

**what we assume:** after the fix, keyrack works correctly.

**hidden issue found:**
- if daemon has cached JSON from before the fix, keyrack get still returns JSON
- keys expire (default 9h), but during that window, old behavior persists

**is this a blocker?** no — user can `keyrack relock` then `keyrack unlock` to refresh

**should we document this?** yes — vision should note "extant unlocked keys need relock+unlock"

**verdict:** ⚠️ minor issue — document in vision

---

## assumption 4: aws.config vault is only for sso profiles

**what we assume:** aws.config vault only handles sso-based profiles, not IAM access keys.

**evidence:**
- compatibility matrix shows aws.config only supports EPHEMERAL_VIA_AWS_SSO
- if user has static IAM keys, they use os.secure vault with PERMANENT_VIA_REPLICA
- the vault is named aws.config but scoped to sso workflow

**what if user wants static keys in aws.config vault?**
- that's a different feature request
- current scope is fixing AWS_PROFILE for sso profiles

**verdict:** ✅ holds — out of scope for this fix

---

## assumption 5: the fix is in vault.get(), not mech.deliverForGet

**two valid options:**

1. **fix in vaultAdapterAwsConfig.get():** don't call mech.deliverForGet
   - simple: just return the profile name
   - vault knows its own semantics

2. **fix in mechAdapterAwsSso.deliverForGet:** return profile name instead of credentials
   - but then mech becomes identity function
   - mech name "EPHEMERAL_VIA_AWS_SSO" suggests it does transformation
   - other vaults might expect the mech to return credentials

**what if we fixed in mech instead?**
- mech would return { secret: profileName, expiresAt }
- but the name "EPHEMERAL_VIA_AWS_SSO" and "deliverForGet" implies transformation
- also: what if future feature needs the credentials JSON? mech would be wrong place.

**verdict:** ✅ fix in vault is correct — vault owns the decision of what to return

---

## summary

assumptions reviewed:
1. ✅ profile name IS the usable secret for aws.config
2. ✅ mech.deliverForGet is unnecessary for aws.config vault
3. ⚠️ minor: document that extant cached keys need relock+unlock
4. ✅ aws.config vault is scoped to sso profiles
5. ✅ fix location is vault.get(), not mech.deliverForGet

one minor update needed: add note to vision about daemon cache refresh
