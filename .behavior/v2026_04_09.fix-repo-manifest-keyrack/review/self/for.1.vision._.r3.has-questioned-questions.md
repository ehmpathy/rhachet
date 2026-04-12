# self-review r3: has-questioned-questions

## verification of question triage

### confirmed: all questions have clear status

| question | status | rationale |
|----------|--------|-----------|
| --from/--into defaults | [answered] | logic: explicit safer for build commands |
| --mode plan | [answered] | logic: dist/ gitignored, preview not critical |
| validate role structure | [answered] | logic: minimal validation, keep simple |

### confirmed: research items are appropriate

| research item | why research needed |
|---------------|---------------------|
| audit rsync patterns | cannot answer via logic — need to inspect real packages |
| confirm artifact types | cannot answer via logic — need to inspect real packages |
| case-insensitive readme | depends on platform behavior — needs test |

### confirmed: no wisher questions remain

all questions were answerable via logic. no [wisher] items needed.

### confirmed: vision document updated

checked vision document:
- questions section renamed to "questions — triaged"
- each question shows [answered] status with rationale
- research items properly enumerated
- new edgecases added from self-review (package.json check, dist/ preservation, prune empty dirs)

## why this holds

the triage is complete because:
1. every question has a clear status ([answered] or [research])
2. answered questions have rationale documented in vision
3. research items are things that cannot be known without external investigation
4. no questions require wisher input — all were decidable via logic

## what i learned

to triage questions forces clarity. "can this be answered via logic now?" is a powerful filter. most questions about defaults and validation could be answered immediately — no need to defer to research or wisher.
