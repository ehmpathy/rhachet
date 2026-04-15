# self-review: has-questioned-questions

triage each open question in the vision.

---

## question 1: "confirm: keyrack should return profile name, not resolved credentials?"

**can be answered via logic now?** YES

**evidence:**
- wish explicitly states: "it should just set AWS_PROFILE"
- wish shows the broken behavior: `AWS_PROFILE='{"AWS_ACCESS_KEY_ID":...}'`
- wish shows desired behavior: `AWS_PROFILE=ehmpathy.demo`

**answer:** the wisher already confirmed. keyrack should return the profile name `ehmpathy.demo`, not a JSON blob of credentials.

**status:** [answered] — the wish is the answer

---

## question 2: "what about non-sso profiles?"

**can be answered via extant code?** YES

**evidence:**
- aws.config vault mechs.supported = ['EPHEMERAL_VIA_AWS_SSO']
- compatibility matrix shows aws.config ONLY supports that mech
- if user has static IAM keys, they use os.secure vault with PERMANENT_VIA_REPLICA mech

**answer:** out of scope. aws.config vault is specifically for sso profiles. users with static keys use a different vault.

**status:** [answered] — documented in vision edgecases section

---

## summary

| question | status | resolution |
|----------|--------|------------|
| confirm: return profile name? | [answered] | wish explicitly states this |
| non-sso profiles? | [answered] | out of scope; use different vault |

no questions remain for wisher. no research needed. the fix is clear.

---

## action: update vision

the "questions for wisher" section should be updated to show these are answered, not open.
