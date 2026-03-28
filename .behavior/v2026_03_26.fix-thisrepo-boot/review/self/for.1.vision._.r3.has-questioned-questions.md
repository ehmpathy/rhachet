# self-review r3: has-questioned-questions

triaged open questions from vision.

---

## question 1: which briefs are truly essential?

**original:** "need wisher input on say candidates"

**triage:** [wisher]

**reason:** this is subjective judgment about which briefs are critical for daily work. only the wisher knows their workflow well enough to decide. the vision already notes "wisher review needed" — this is correct.

---

## question 2: do we want subject mode?

**original:** "or is simple mode sufficient for this role?"

**triage:** [answered]

**answer:** simple mode is sufficient for role=any.

**reason:**
- role=any is a single role, not scoped to usecases
- simple mode covers the wish: control say vs ref
- subject mode adds complexity without clear benefit here
- can evolve to subject mode later if patterns emerge

---

## question 3: should skills also be curated?

**original:** "currently 6 skills, all small"

**triage:** [answered]

**answer:** no, skills don't need curation.

**reason:**
- skills are ~1k tokens total (small compared to ~20k briefs)
- all 6 skills fit comfortably in context
- curation overhead not justified for small payload
- the wish focused on briefs, not skills

---

## summary

| question | triage | action |
|----------|--------|--------|
| which briefs essential? | [wisher] | already flagged in vision |
| subject mode? | [answered] | simple mode sufficient |
| curate skills? | [answered] | no, skills are small |

the vision already has "wisher review needed" note. questions 2 and 3 are answered via logic. no research needed.

---

## fix applied

updated vision section "questions to validate" with triage markers:

**before:**
```
1. **which briefs are truly essential?** — need wisher input on say candidates
2. **do we want subject mode?** — or is simple mode sufficient for this role?
3. **should skills also be curated?** — currently 6 skills, all small
```

**after:**
```
1. **which briefs are truly essential?** — [wisher] need wisher input on say candidates
2. **do we want subject mode?** — [answered] simple mode sufficient for role=any
3. **should skills also be curated?** — [answered] no, skills are ~1k tokens total, not worth curation
```

---

## why each triage holds

### question 1 [wisher]

- can logic answer it? no — which briefs are "essential" is subjective to workflow
- can code answer it? no — this is about human judgment, not technical capability
- can research answer it? no — external research won't reveal which briefs the wisher uses most
- only wisher knows? yes — the wisher knows their daily patterns

**verdict:** [wisher] is correct triage

### question 2 [answered]

- can logic answer it? yes:
  - role=any is a single role without subject scopes
  - simple mode achieves the wish (control say vs ref)
  - subject mode would be premature complexity
- pattern: start simple, evolve if needed

**verdict:** [answered] via logic

### question 3 [answered]

- can logic answer it? yes:
  - skills cost ~1k tokens vs briefs at ~20k tokens
  - 6 skills fit easily in context
  - the wish said "briefs are too large" — not skills
  - curation overhead not justified
- pattern: optimize the bottleneck, not all items

**verdict:** [answered] via logic

---

## no hidden questions found

re-read vision "open questions" and "what is awkward" sections:
- all questions are now triaged
- no untriaged questions remain
- no research needed
