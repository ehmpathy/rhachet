# self-review: has-questioned-requirements

## requirement 1: AWS_PROFILE should return profile name, not credentials

**who said this?** the wisher, explicitly: "it should just set AWS_PROFILE"

**evidence?** this is standard AWS behavior. AWS_PROFILE env var is a profile name that points to ~/.aws/config. the aws sdk resolves credentials from the named profile.

**what if we didn't?** aws sdk fails to parse the JSON. broken.

**simpler way?** no — this is the only correct behavior.

**verdict:** ✅ holds

---

## requirement 2: fix should be in vaultAdapterAwsConfig.get()

**evidence?** traced the code:
- `unlockKeyrackKeys` calls `adapter.get({ mech })`
- `vaultAdapterAwsConfig.get()` calls `mechAdapter.deliverForGet()` when mech provided
- `mechAdapterAwsSso.deliverForGet()` returns `{ secret: JSON.stringify(credentials) }`
- this JSON blob gets stored in daemon
- `keyrack get` returns the JSON blob

**what if we fixed elsewhere?**

- **fix in mechAdapterAwsSso.deliverForGet?**
  - then mech would return profile name instead of credentials
  - but the mech name is EPHEMERAL_VIA_AWS_SSO — it implies credential refresh
  - other callers might expect actual credentials
  - mech shouldn't know about key semantics (AWS_PROFILE vs other)
  - ❌ wrong place

- **fix in unlockKeyrackKeys to not pass mech for aws.config?**
  - that's knowledge leakage — caller shouldn't know vault internals
  - ❌ wrong place

**verdict:** ✅ holds — vault adapter is the right place. for aws.config, the stored value (profile name) IS the usable secret. no mech transformation needed.

---

## assumption 1: users want profile names, not raw credentials

**evidence?** wish explicitly says "it should just set AWS_PROFILE"

**what if users wanted raw credentials?**
- they can use `aws configure export-credentials` directly
- out of scope for keyrack
- keyrack manages profile names; aws sdk manages credential resolution

**verdict:** ✅ holds

---

## assumption 2: sso session validity is separate from keyrack get

**evidence?**
- `unlock()` triggers sso login if session expired
- `get()` returns profile name without auth flow
- correct separation of concerns

**why?** keyrack get should be fast and not trigger interactive prompts

**verdict:** ✅ holds

---

## open question: what about non-sso profiles?

**answer:**
- aws.config vault specifically targets sso profiles
- if user has static IAM access keys, they'd use os.secure vault with PERMANENT_VIA_REPLICA mech
- aws.config only supports EPHEMERAL_VIA_AWS_SSO — this is by design

**verdict:** ✅ clarified — not a blocker, out of scope

---

## summary

all requirements questioned. all hold. no issues found.

the fix is narrow and correct:
- `vaultAdapterAwsConfig.get()` should return the profile name (exid/source) directly
- do not call `mech.deliverForGet()` — the profile name IS the usable secret for AWS_PROFILE
