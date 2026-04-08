# self-review r3: has-questioned-questions

fresh eyes pass on open questions.

---

## review of questions for wisher

### question 1: vault rename [answered]

**current state:** resolved

**why it's answered:**
- wisher confirmed aws.config in session
- rationale: named after storage location (~/.aws/config)
- vision and spec updated throughout

**no fix needed** — already resolved

---

### question 2: mech inference when ambiguous [answered]

**current state:** answered in r2

**why it's answered:**
- wisher explicitly clarified via session feedback
- direct quote: "we need inference adapters too"
- solution captured in vision with treestruct example
- mech inference adapters prompt via stdin when ambiguous

**no fix needed** — correctly resolved

---

## review of external research items

### research 1: github api shape [research]

**why it awaits research:**
- api shape verification is technical work
- wisher showed sample output but formal verification needed
- can be done in research phase before implementation

**no fix needed** — correctly triaged

---

### research 2: pem newline escape [research]

**why it awaits research:**
- implementation detail
- needs code verification
- standard json escape should work but worth a test

**no fix needed** — correctly triaged

---

### research 3: 1password op cli [research]

**why it awaits research:**
- depends on external tool capabilities
- needs documentation review
- not core to vision, needed for implementation

**no fix needed** — correctly triaged

---

## vision alignment check

### are questions enumerated in vision?

checked "open questions & assumptions" section:
- vault rename: ✓ listed under "questions for wisher"
- mech inference: ✓ listed but should note it's answered
- research items: ✓ listed under "external research needed"

### fix required: mark mech inference as resolved

the mech inference question is listed as an open question but wisher already answered it.

**action taken:** vision already has the answer (mech inference adapters section) but question #2 still appears as open. let me check and fix.

---

## summary

| question | triage | status |
|----------|--------|--------|
| vault rename | [answered] | wisher confirmed aws.config |
| mech inference | [answered] | wisher confirmed adapters |
| github api shape | [research] | awaits research phase |
| pem newline escape | [research] | awaits research phase |
| 1password op cli | [research] | awaits research phase |

all questions properly triaged. 2 answered by wisher, 3 await research.

---

## fixes applied in r3

### fix 1: marked mech inference question as [answered] in vision ✓

the mech inference question was listed under "questions for wisher" but wisher already confirmed the approach.

**before:**
```
2. **mech inference when ambiguous:** vaults may support multiple mechs...
   - **proposed solution:** mech inference adapters
```

**after:**
```
2. **mech inference when ambiguous: [answered]** — wisher confirmed mech inference adapters
   - **solution:** mech inference adapters
```

this ensures the vision reflects that this question is resolved, not open.

### fix 2: marked vault rename question as [answered] ✓

wisher confirmed aws.config in session. updated question 1 status from [wisher] to [answered].

all wisher questions now resolved. only research items remain open.
