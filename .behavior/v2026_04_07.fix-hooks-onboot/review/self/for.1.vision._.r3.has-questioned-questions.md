# self-review r3: has-questioned-questions (verification)

## verification of triage decisions

each question and assumption was triaged in r2. this review verifies each triage decision is correct.

---

### assumption 1: UserPromptSubmit behavior → [research]

**triage:** [research]

**is this the right triage?** yes

**why:**
- claude code behavior is external to rhachet
- the research doc mentions the event but doesn't confirm stdin behavior
- only external docs or a test can confirm this
- cannot be answered via logic alone

**verdict:** triage correct ✓

---

### assumption 2: timeout semantics → [answered]

**triage:** [answered]

**is this the right triage?** yes

**why:**
- `translateHook.ts` applies `toMilliseconds(hook.timeout)` uniformly to ALL events
- no event-specific timeout handler exists
- the code is deterministic and verifiable now
- no external research needed

**verdict:** triage correct ✓

---

### assumption 3: matcher semantics → [research]

**triage:** [research]

**is this the right triage?** yes

**why:**
- rhachet code uses `*` wildcard, but does claude code accept it for UserPromptSubmit?
- the answer depends on claude code's implementation
- a test would confirm whether `*` works or if a specific matcher is required

**verdict:** triage correct ✓

---

### question 1: filter support → [wisher]

**triage:** [wisher]

**is this the right triage?** yes

**why:**
- filter support is a scope decision
- only the wisher knows if they want filter.what for UserPromptSubmit sub-events
- the research doc says UserPromptSubmit is a single event, but scope decisions belong to wisher
- cannot be answered via code or research — it's a design choice

**verdict:** triage correct ✓

---

### question 2: PostUserPromptSubmit → [research] + [wisher]

**triage:** [research] for existence, [wisher] for scope

**is this the right triage?** yes

**why:**
- existence is a fact question → research can answer
- whether to add onTalkAfter is a scope decision → wisher decides
- the split triage is appropriate because the question has two parts

**verdict:** triage correct ✓

---

### question 3: opencode scope → [wisher]

**triage:** [wisher]

**is this the right triage?** yes

**why:**
- this is purely a scope decision
- if opencode lacks the event, onTalk is claude-only — acceptable or not?
- if opencode has the event, the work is larger — worth it or defer?
- only the wisher can decide the scope of this feature

**verdict:** triage correct ✓

---

### research item 1: stdin receives prompt → [research]

**triage:** [research]

**is this the right triage?** yes

**why:**
- stdin behavior is claude code's implementation detail
- rhachet cannot determine this via code inspection
- external docs or test required

**verdict:** triage correct ✓

---

### research item 2: non-zero exit blocks prompt → [research]

**triage:** [research]

**is this the right triage?** yes

**why:**
- exit code behavior is claude code's implementation detail
- rhachet cannot determine this via code inspection
- external docs or test required

**verdict:** triage correct ✓

---

### research item 3: PostUserPromptSubmit exists → [research]

**triage:** [research]

**is this the right triage?** yes

**why:**
- event existence is a fact question about claude code
- only external docs or API inspection can confirm
- cannot be inferred from rhachet code

**verdict:** triage correct ✓

---

## summary

| question | triage | verification |
|----------|--------|--------------|
| UserPromptSubmit behavior | [research] | ✓ correct — external behavior |
| timeout semantics | [answered] | ✓ correct — verified via code |
| matcher semantics | [research] | ✓ correct — external behavior |
| filter support | [wisher] | ✓ correct — scope decision |
| PostUserPromptSubmit existence | [research] | ✓ correct — external fact |
| PostUserPromptSubmit scope | [wisher] | ✓ correct — scope decision |
| opencode scope | [wisher] | ✓ correct — scope decision |
| stdin receives prompt | [research] | ✓ correct — external behavior |
| non-zero blocks prompt | [research] | ✓ correct — external behavior |

**all 9 triage decisions verified as correct.**

the triage system correctly separates:
- [answered]: questions resolved via code inspection (1)
- [research]: questions about external systems (6)
- [wisher]: scope decisions for the feature owner (3)

no triage needs adjustment.
