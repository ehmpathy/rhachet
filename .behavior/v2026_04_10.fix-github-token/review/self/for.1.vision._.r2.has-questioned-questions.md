# self-review: has-questioned-questions

## triage of open questions

### question 1: should keyrack.yml support mech declaration per key?

**from vision:** "future: could add `KEY_NAME: { mech: EPHEMERAL_VIA_GITHUB_APP }`"

**triage:**
- can we answer via logic now? yes
- this is a future enhancement, not required for this fix
- the current fix (prompt when mech is null) covers the immediate need
- mech-per-key in manifest would be additive, not a blocker

**status:** [answered] — out of scope for this fix. can add later if needed.

### question 2: does the fix break tests that construct KeyrackKeySpec?

**from assumptions review:** tests may hardcode `mech: 'PERMANENT_VIA_REPLICA'`

**triage:**
- can we answer via code now? yes, run tests
- types pass, so any test that accesses `.mech` handles the nullable case

**status:** [answered] — types enforce safety. tests that hardcode mech are fine.

### question 3: what about runtime behavior verification?

**from assumptions review:** "should run integration tests before release"

**triage:**
- this is standard release practice, not a question to block
- the user can test locally before they commit

**status:** [answered] — standard verification, not a design question.

## conclusion

all questions either:
- answered now (out of scope, type-safe, standard practice)
- or already validated with wisher (no inference, prompt like set)

no questions require external research or wisher input.
