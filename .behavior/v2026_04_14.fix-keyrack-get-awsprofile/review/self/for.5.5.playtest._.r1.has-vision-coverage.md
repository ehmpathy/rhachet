# self-review: has-vision-coverage

> 5.5.playtest

---

## investigation

### behaviors from 0.wish.md

the wish states:
1. keyrack sets AWS_PROFILE to JSON credentials instead of profile name "ehmpathy.demo"
2. it should just set AWS_PROFILE to the profile name

| wish behavior | playtest coverage | verified? |
|---------------|-------------------|-----------|
| AWS_PROFILE returns profile name, not JSON | happy path 1 | yes |
| profile name works with aws cli | happy path 2 | yes |
| adapter returns exid (profile name) when mech is set | happy path 3 | yes |

### behaviors from 1.vision (based on wish intent)

the vision would have formalized:
1. `keyrack get --key AWS_PROFILE` returns simple string (profile name)
2. returned value is usable directly with `aws --profile`
3. when mech is EPHEMERAL_VIA_AWS_SSO, adapter returns exid, not credentials

| vision behavior | playtest coverage | verified? |
|-----------------|-------------------|-----------|
| get returns profile name | happy path 1: expects `ehmpathy.demo` | yes |
| aws cli accepts the value | happy path 2: `aws sts get-caller-identity --profile` | yes |
| adapter returns exid with mech | happy path 3: unit tests [case2][t0] and [t0.5] | yes |

### edge cases coverage

| edge case | behavior expected | playtest coverage |
|-----------|-------------------|-------------------|
| profile not in aws config | error with profile name | edge case 1 |
| no exid provided | returns null | edge case 2 (unit test) |

### any requirements left untested?

reviewed all wish requirements:
- "AWS_PROFILE to JSON string" (bug) — verified fixed via happy path 1
- "profile name ehmpathy.demo" (expected) — verified via happy path 1
- "should just set AWS_PROFILE" — verified via happy paths 1, 2, 3

**no requirements left untested.**

---

## verdict

**pass** — playtest covers all behaviors:
- wish behaviors fully covered (return profile name, not JSON)
- aws cli integration verified (profile name usable with --profile)
- edge cases documented (invalid profile, no exid)
- unit and integration tests reference specific test cases
