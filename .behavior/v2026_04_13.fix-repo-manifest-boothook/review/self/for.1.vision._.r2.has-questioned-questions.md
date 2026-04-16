# self-review r2: has-questioned-questions

## questions from the vision

the vision listed these questions under "open questions & assumptions":

### question 1: is boot field the right signal?

> should we check for `boot: { uri }` specifically, or should we add a new field like `bootable: boolean`?

**triage:** can this be answered via logic now?

yes. the boot.yml already exists and is used by `roles boot`. a new `bootable: boolean` would add a separate concept without added value. the boot.yml IS the bootability declaration.

**verdict:** [answered]

boot field is the right signal. no need for separate `bootable` field.

---

### question 2: what about roles that only provide skills.refs?

> typed skills are available without boot. do these roles need boot.yml too?

**triage:** does only the wisher know the answer?

yes. this is a design decision. the wisher said "if they want to make their role not bootable, then it shouldn't be in the registry to begin with."

but does "not bootable" include "typed skills only"?

**analysis via logic:**
- typed skills (solid/rigid) are imported directly, not via boot
- if a role has ONLY typed skills (no briefs, no shell executables), does it need to boot?
- boot loads briefs and skills into brain context
- typed skills don't need brain context — they're code

**conclusion:** roles with only typed skills don't need boot. they shouldn't be in registry.

**verdict:** [answered]

roles with only typed skills are libraries, not registered roles. they don't need boot.yml because they don't need to be in the registry.

---

### question 3: migration path for extant packages?

> should we add a deprecation period or failfast immediately?

**triage:** does only the wisher know the answer?

partially. the wisher's wish says "failfast for now" but doesn't address migration.

**analysis:**
- immediate failfast: breaks extant packages on publish
- deprecation: warns first, breaks later

the wish's tone is "failfast for now" which suggests immediate enforcement.

**verdict:** [wisher]

need to confirm with wisher whether to:
1. failfast immediately (may break extant packages)
2. warn first, failfast in next major version

---

### question 4: blast radius of extant packages

> how many roles currently lack boot field? what's the blast radius?

**triage:** can this be answered via code/research?

yes, but requires research. need to check:
- rhachet-roles-ehmpathy
- rhachet-roles-bhuild
- rhachet-roles-bhrain

**verdict:** [research]

research phase should inventory extant roles without boot field.

---

## summary of triage

| question | triage | action |
|----------|--------|--------|
| boot field vs bootable flag | [answered] | boot field is correct |
| typed-skills-only roles | [answered] | not in registry, no boot needed |
| migration path | [wisher] | confirm immediate vs deprecation |
| blast radius | [research] | inventory extant packages |

---

## updates to vision

the vision should be updated to:
1. mark question 1 and 2 as answered
2. mark question 3 as "need wisher input"
3. mark question 4 for research phase

i'll update the vision now.
