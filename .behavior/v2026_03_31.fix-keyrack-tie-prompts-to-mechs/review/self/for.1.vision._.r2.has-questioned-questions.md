# self-review r2: has-questioned-questions

triage of open questions in the vision.

---

## questions for wisher

### question 1: vault rename [answered]

**the question:** should `aws.iam.sso` become `aws.config` or stay as-is?

**triage:**
- wisher confirmed aws.config after discussion
- named after storage location (~/.aws/config)
- not ~/.aws/credentials (which stores the actual secrets)

**verdict:** [answered] — wisher confirmed aws.config

**action taken:** vision and spec updated to use aws.config throughout

---

### question 2: pem input method

**the question:** paste vs path for pem input?

**triage:**
- wisher explicitly stated in wish: "pass in a relative path to the .pem, and we'll format it as needed"
- path is the chosen approach

**verdict:** [answered] — path is confirmed by wish

**action taken:** updated vision to remove this from open questions (it's not a question anymore)

---

### question 3: mech inference when ambiguous

**the question:** what happens when vault supports multiple mechs for same key?

**triage:**
- wisher explicitly clarified this in feedback session
- wisher said: "we need inference adapters too - that the vaults can invoke to get an stdin response of _which_ mech to use"
- solution: mech inference adapters that prompt via stdin

**verdict:** [answered] — wisher confirmed mech inference adapters as the approach

**action taken:** this was already captured in vision with treestruct example

---

## external research needed

### research 1: github api shape

**the question:** does `/orgs/{org}/installations` return what we need (appId, installationId)?

**triage:**
- can be verified by a call to the api
- wisher already showed sample output in wish
- still worth formal verification

**verdict:** [research] — to be answered in research phase

---

### research 2: pem newline escape

**the question:** does .pem file read → json escape work correctly?

**triage:**
- technical implementation detail
- needs code verification
- not a blocker for vision

**verdict:** [research] — to be answered in implementation phase

---

### research 3: 1password op cli

**the question:** can we store json blobs to arbitrary exid paths?

**triage:**
- depends on 1password cli capabilities
- needs documentation review
- not a blocker for vision

**verdict:** [research] — to be answered in research phase

---

## summary

| question | triage |
|----------|--------|
| vault rename | [answered] — aws.config confirmed |
| pem input | [answered] — path confirmed |
| mech inference | [answered] — adapters confirmed |
| github api shape | [research] |
| pem newline escape | [research] |
| 1password op cli | [research] |

3 answered, 0 await wisher, 3 await research.

---

## fixes applied

### fix 1: pem input question resolved ✓

removed from "questions for wisher" since wish explicitly states path approach.

updated vision to reflect this is not an open question.

### fix 2: vault rename question resolved ✓

wisher confirmed aws.config in session. updated:
- question 1 status from [wisher] to [answered]
- summary tally: now 3 answered, 0 await wisher
