# self-review: has-vision-coverage (r2)

> 5.5.playtest

---

## deeper investigation

### re-read 0.wish.md line by line

```
wish =

  profile: '{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'

  keyrack is [setting] AWS_PROFILE to a JSON string containing credentials instead of the
  profile name "ehmpathy.demo".

  The keyrack should either:
  1. Set AWS_PROFILE=ehmpathy.demo (let SDK expand credentials)
  2. Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN as separate env vars

  This is a keyrack mechanism bug - it's expanding the profile and stuffing all credentials
  into AWS_PROFILE as JSON.
```

extracting requirements:
1. **the bug**: AWS_PROFILE contains JSON blob with credentials
2. **option 1**: AWS_PROFILE should equal profile name (e.g., "ehmpathy.demo")
3. **option 2**: separate env vars for credentials
4. **chosen path** (from "we gotta fix that bug, it should just set AWS_PROFILE"): option 1

### requirement-by-requirement coverage

| requirement | playtest step | how it verifies |
|-------------|---------------|-----------------|
| AWS_PROFILE not JSON | happy path 1 | expects simple string `ehmpathy.demo`, not `{...}` |
| AWS_PROFILE = profile name | happy path 1 | expected outcome explicitly shows `ehmpathy.demo` |
| profile name usable with aws cli | happy path 2 | `aws sts get-caller-identity --profile "$(rhx keyrack get...)"` |
| adapter returns exid, not credentials | happy path 3 | unit test `[case2][t0.5] get called with exid and mech` |

### what about option 2?

the wish mentioned option 2 (separate env vars), but the chosen path was option 1. the playtest does not cover option 2 because it was not the chosen implementation.

**why this is correct**: the wish explicitly chose option 1 ("it should just set AWS_PROFILE"). option 2 is an alternative that was not implemented.

### edge cases from wish

the wish did not explicitly mention edge cases, but the playtest covers:
1. **invalid profile**: verifies error when profile not in aws config
2. **no exid**: verifies null return when no exid provided

these edge cases protect against regressions and validate error handling.

### are any requirements left untested?

| wish requirement | covered? | evidence |
|------------------|----------|----------|
| AWS_PROFILE not JSON | yes | happy path 1 pass criterion |
| AWS_PROFILE = profile name | yes | happy path 1 expected outcome |
| profile name works with aws cli | yes | happy path 2 subshell test |
| adapter returns exid not credentials | yes | happy path 3 unit test reference |

**no requirements left untested.**

---

## what i learned

the wish had two options (profile name OR separate env vars). the chosen path was option 1. playtest correctly covers only the chosen path, not the unchosen alternative.

---

## verdict

**pass** — playtest covers all wish behaviors:
- bug condition verified fixed (no JSON blob)
- chosen solution verified (profile name returned)
- integration verified (aws cli accepts value)
- edge cases documented for robustness
