# self-review r2: has-questioned-assumptions

re-read the vision with fresh eyes. question each assumption more carefully.

---

## assumption: "AWS_PROFILE env var expects profile name"

**what evidence?**
- aws sdk documentation states AWS_PROFILE specifies which profile to use
- the profile name points to a section in ~/.aws/config or ~/.aws/credentials
- this is standard aws behavior for decades

**what if opposite were true?**
- if AWS_PROFILE accepted JSON credentials, aws sdk would need to parse JSON
- no aws documentation supports this
- the wish explicitly shows this doesn't work: `AWS_PROFILE='{"AWS_ACCESS_KEY_ID":...}'` breaks

**verdict:** ✅ this is factual, not an assumption

---

## assumption: "the fix should be in vaultAdapterAwsConfig.get()"

**what evidence?**
- traced code flow: vault.get() calls mech.deliverForGet() which returns JSON
- the JSON gets stored in daemon and returned by keyrack get

**what if we fixed elsewhere?**

1. **fix in unlockKeyrackKeys.ts** — don't pass mech to vault.get()?
   - but the code already passes mech; to change that requires knowledge of why mech was passed in the first place
   - mech is needed for validation and expiry calculation
   - ❌ fragile — caller shouldn't know vault internals

2. **fix in mechAdapterAwsSso.deliverForGet** — return profile name instead of credentials?
   - but the mech name implies transformation: "EPHEMERAL_VIA_AWS_SSO"
   - the deliverForGet is supposed to "deliver" a derived value from the source
   - other callers might expect credentials (though none extant today)
   - ❌ changes mech semantics

3. **fix in daemon** — detect JSON and extract profile?
   - complex; daemon shouldn't have key semantics
   - ❌ wrong layer

**verdict:** ✅ vault.get() is correct location — vault knows its own semantics

---

## assumption: "we can just remove the mech.deliverForGet call"

**what evidence?**
- for aws.config vault, exid contains the profile name
- to return exid directly gives the correct value

**what if mech.deliverForGet did a critical operation?**
- examined mechAdapterAwsSso.deliverForGet:
  - it exports credentials via `aws configure export-credentials`
  - it returns JSON with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc
  - it calculates expiresAt from AWS_CREDENTIAL_EXPIRATION

**wait — what about expiresAt?**
- current: mech.deliverForGet returns `{ secret, expiresAt }`
- if we skip deliverForGet, we lose expiresAt calculation
- examined vaultAdapterAwsConfig.get() signature... it only returns secret, not expiresAt
- expiresAt is calculated by unlockKeyrackKeys.ts via computeExpiresAt()

**verdict:** ✅ holds — expiresAt is calculated separately; vault.get() only returns secret

---

## assumption: "profile name IS the usable secret"

**did wisher say this?** yes — "it should just set AWS_PROFILE"

**what evidence?**
- AWS_PROFILE=ehmpathy.demo works with aws cli
- AWS_PROFILE='{"AWS_ACCESS_KEY_ID":...}' does NOT work

**what if user wanted the resolved credentials instead?**
- they'd set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN separately
- keyrack would need different keys for each
- that's a different feature, not covered by this fix

**verdict:** ✅ holds — for AWS_PROFILE key, profile name is the usable secret

---

## assumption: "aws.config vault is only for sso profiles"

**what evidence?**
- vault mechs.supported = ['EPHEMERAL_VIA_AWS_SSO']
- compatibility matrix shows aws.config only supports that mech
- vault.set() guided setup assumes sso flow

**what if user wanted non-sso profile in aws.config vault?**
- they have a profile in ~/.aws/config with static credentials
- current vault would fail — no match for mech
- they'd use os.secure vault with PERMANENT_VIA_REPLICA instead

**is this a problem?**
- no — the vault is explicitly for sso profiles
- name is slightly deceptive (aws.config suggests any aws config)
- but that's a name issue, not a bug in this fix

**verdict:** ✅ holds — out of scope; aws.config vault is designed for sso

---

## hidden assumption found: "keyrack get for AWS_PROFILE should work the same as other keys"

**what we assume:** the general keyrack get flow applies to AWS_PROFILE

**what if AWS_PROFILE needs special behavior?**
- currently: keyrack get reads from daemon, returns whatever was stored
- for AWS_PROFILE after fix: daemon stores profile name, keyrack get returns profile name
- this matches other keys — no special behavior needed

**verdict:** ✅ holds — AWS_PROFILE is not special; the vault is what's different

---

## summary

assumptions reviewed in second pass:
1. ✅ AWS_PROFILE expects profile name — factual (aws sdk docs)
2. ✅ fix in vault.get() is correct — alternatives examined and rejected
3. ✅ can remove mech.deliverForGet — expiresAt calculated elsewhere
4. ✅ profile name is the usable secret — matches wish
5. ✅ aws.config vault is for sso — by design
6. ✅ no special behavior for AWS_PROFILE — vault handles it

the vision fix is sound. found minor issue in r1 (daemon cache) which was addressed.
