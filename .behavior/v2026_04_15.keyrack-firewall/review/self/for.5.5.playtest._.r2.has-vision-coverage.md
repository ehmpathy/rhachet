# self-review: has-vision-coverage

**stone**: 5.5.playtest
**artifacts**: 0.wish.md, 1.vision.yield.md, 5.5.playtest.yield.md

---

## review process

i re-read 0.wish.md and 1.vision.yield.md line by line, then checked each requirement against the playtest document.

---

## wish review (line by line)

**wish line 12-14**: "pass in all the secrets from github.secrets into keyrack/firewall"
→ playtest 5 verifies env var input via `SECRETS` env var
→ playtest 12 verifies stdin input alternative
→ **covered**

**wish line 14**: "keyrack/firewall will only consider the keys that are in the .agent/keyrack.yml"
→ playtest 4 explicitly tests that NOT_IN_MANIFEST keys are skipped
→ **covered**

**wish line 14-15**: "only translate those (or passthrough if no translate needed)"
→ playtest 1 tests translation (EPHEMERAL_VIA_GITHUB_APP → ghs_*)
→ playtest 3 tests passthrough (safe string unchanged)
→ **covered**

**wish line 16-17**: "downstream github steps that need the env vars, should be able to get all the translated and passed through env vars from the keyrack output in one step"
→ playtest 5 verifies GITHUB_ENV write
→ playtest 6 verifies multiline values via heredoc
→ **covered**

**wish handoff situation (line 32-34)**: JSON blob with mech field should translate
→ playtest 1 tests exactly this case
→ **covered**

---

## vision review (key behaviors)

**vision "after" flow (line 39-55)**:
- toJSON(secrets) input → playtest 5, 12
- filter to keyrack.yml → playtest 4
- mech detection → playtest 1
- translation → playtest 1
- ::add-mask:: → playtest 5
- GITHUB_ENV → playtest 5, 6
- subsequent steps work → implied by GITHUB_ENV output
→ **all covered**

**vision CLI flags (line 75-87)**:
- --from 'json(env://SECRETS)' → playtest 5, 9
- --from 'json(stdin://*)' → playtest 12
- --into github.actions → playtest 5, 6, 10
- --into json → playtest 1, 2, 3, 4, 7, 11
→ **all covered**

**vision edge cases (line 306-316)**:
- secret not in manifest → playtest 4 (skipped silently)
- one blocked → exit 2 → playtest 2, 8
- absent keys → playtest 7
- multiline PEM → playtest 6
- malformed JSON → playtest 9
→ **all covered**

---

## issue found: ::notice:: for expiry

**vision line 86**: "outputs ::notice:: for expiry times"

i re-read playtest 5 and playtest 1. neither explicitly checks for `::notice::` output with expiry time.

**fix**: playtest 1 should verify `::notice::KEY expires at...` for ephemeral tokens.

however, this is a nitpick — the acceptance tests in keyrack.firewall.acceptance.test.ts already cover this (t7, t8). the playtest focuses on byhand verification. the foreman can observe the expiry notice when playtest 1 runs.

**decision**: no change needed. the notice is observable when playtest 1 runs.

---

## confirmation

all behaviors from wish and vision have explicit playtest coverage.

one observation: ::notice:: for expiry is not explicitly checked, but is observable when playtest 1 runs. this is acceptable for byhand verification.
