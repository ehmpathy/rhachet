# self-review r3: has-questioned-questions

third pass. re-examine with fresh eyes.

---

## re-read the vision's questions section

the vision now has:

```
### questions (answered)

1. **confirm: keyrack should return profile name, not resolved credentials?**
   - **[answered]** — wish explicitly states "it should just set AWS_PROFILE"

2. **what about non-sso profiles?**
   - **[answered]** — out of scope; aws.config vault only supports EPHEMERAL_VIA_AWS_SSO
```

---

## question 1: is this truly answered?

**the question:** confirm: keyrack should return profile name, not resolved credentials?

**the answer provided:** wish explicitly states "it should just set AWS_PROFILE"

**is this sufficient?**
- the wish says: "it should just set AWS_PROFILE"
- the wish shows: broken behavior (JSON blob) and expected behavior (profile name)
- the wisher's intent is unambiguous

**could there be any other interpretation?**
- no — the wish is clear
- JSON in AWS_PROFILE is broken
- profile name in AWS_PROFILE is correct

**verdict:** ✅ truly answered — the wish is explicit

---

## question 2: is this truly answered?

**the question:** what about non-sso profiles?

**the answer provided:** out of scope; aws.config vault only supports EPHEMERAL_VIA_AWS_SSO

**is this sufficient?**
- the vault code confirms: `mechs: { supported: ['EPHEMERAL_VIA_AWS_SSO'] }`
- if user has static keys, they use a different vault (os.secure)
- this is by design, not a bug

**should we ask the wisher about this?**
- the wish doesn't mention non-sso profiles
- the wish specifically mentions SSO: "ehmpathy.demo" looks like an sso profile name
- the wisher asks for a bug fix, not a feature expansion

**verdict:** ✅ truly answered — out of scope for this fix

---

## are there questions we missed?

**potential question 1:** what happens if AWS_PROFILE key is stored in a different vault (e.g., os.secure)?

**answer:** aws.config vault is auto-inferred for AWS_PROFILE key. if user explicitly uses `--vault os.secure`, they store the profile name as a secret, and os.secure returns it as-is (no mech transformation). this would work correctly.

**should this be added to vision?** no — it's not a bug path, and the fix doesn't affect it.

---

**potential question 2:** what if the wish is wrong about what AWS_PROFILE should contain?

**answer:** this would question the wish itself. the wish came from the wisher who observed the broken behavior. if the wisher is wrong, they'll clarify when they review the vision.

**should this be added to vision?** no — trust the wisher.

---

## summary

| question | status | why it holds |
|----------|--------|--------------|
| confirm: return profile name? | [answered] | wish is explicit and unambiguous |
| non-sso profiles? | [answered] | out of scope; vault design, not bug |

no additional questions surfaced. all questions are genuinely answered. the vision is complete.
