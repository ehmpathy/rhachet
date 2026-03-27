# self-review: has-questioned-questions

## open questions triaged

### Q1: should we support multiple owners?

| triage | answer |
|--------|--------|
| can answer via logic? | no — depends on use patterns |
| can answer via docs/code? | no — policy decision |
| needs research? | no |
| wisher knows? | yes — wisher knows the typical users |

**status**: [wisher]

---

### Q2: what about non-ehmpath contributors?

| triage | answer |
|--------|--------|
| can answer via logic? | no — policy decision |
| can answer via docs/code? | no |
| needs research? | no |
| wisher knows? | yes — wisher knows contributor profile |

**status**: [wisher]

---

### Q3: what about CI environments without vault access?

| triage | answer |
|--------|--------|
| can answer via logic? | no — depends on CI setup |
| can answer via docs/code? | partial — can check CI config |
| needs research? | no |
| wisher knows? | yes — wisher knows CI constraints |

**status**: [wisher]

---

### Q4: verify keyrack get returns all keys for a repo

| triage | answer |
|--------|--------|
| can answer via logic? | no |
| can answer via docs/code? | yes — I tested it |
| needs research? | no — already done |
| wisher knows? | n/a |

**status**: [answered] — tested via `rhx keyrack get --for repo --env test --json`, returns all keys.

---

### Q5: verify keyrack daemon session persistence model

| triage | answer |
|--------|--------|
| can answer via logic? | no |
| can answer via docs/code? | partial — need to test across terminals |
| needs research? | yes — need to unlock and test |
| wisher knows? | no |

**status**: [research]

---

### Q6: verify keyrack get --json returns secrets when unlocked

| triage | answer |
|--------|--------|
| can answer via logic? | no |
| can answer via docs/code? | yes — need to unlock and call keyrack get |
| needs research? | yes — need to unlock first |
| wisher knows? | no |

**status**: [research]

---

### Q7: verify ci/cd keyrack init pattern works for this repo

| triage | answer |
|--------|--------|
| can answer via logic? | no |
| can answer via docs/code? | partial — depends on CI config |
| needs research? | yes — need to check CI setup |
| wisher knows? | partial |

**status**: [research]

---

## summary

| question | status |
|----------|--------|
| Q1: multiple owners | [wisher] |
| Q2: non-ehmpath contributors | [wisher] |
| Q3: CI without vault | [wisher] |
| Q4: keyrack get all keys | [answered] ✓ |
| Q5: daemon persistence | [research] |
| Q6: unlocked secrets | [research] |
| Q7: ci/cd init | [research] |

**counts**: 1 answered, 3 wisher, 3 research

## fixes applied to vision

updated "open questions & assumptions" section to clearly mark each question:
- questions to validate with wisher: all marked [wisher]
- research needed: marked with [answered] or [research]

## lessons learned

1. **triage questions early** — mark questions with [answered]/[research]/[wisher] clarifies what to do next
2. **distinguish research from wisher** — some questions only the wisher can answer; others we can research ourselves
