# self-review: has-questioned-questions (r3)

## triage of open questions

### question 1: confirm mech name

**question:** wish says "EPHEMERAL_VIA_GITHUB_TOKEN" but codebase has "EPHEMERAL_VIA_GITHUB_APP". do you mean the github app mech?

**can answer via logic?** no — wisher's intent is unclear from the wish text

**can answer via docs/code?** checked KeyrackGrantMechanism.ts — no EPHEMERAL_VIA_GITHUB_TOKEN exists. only EPHEMERAL_VIA_GITHUB_APP and EPHEMERAL_VIA_GITHUB_OIDC.

**external research needed?** no

**only wisher knows?** yes — this is about what the wisher meant to ask for

**triage:** [wisher]

**added to vision:** yes, line 173

### question 2: status locked or remote

**question:** should `status` show `locked` or a new state like `remote`?

**can answer via logic?** partially — semantic tension between os.secure "locked" (needs unlock) and github.secrets "locked" (can never retrieve). but this is a product decision.

**can answer via docs/code?** no — this is a new design decision

**external research needed?** no

**only wisher knows?** yes — this is a UX design choice for the wisher

**triage:** [wisher]

**added to vision:** yes, line 175

### question 3: how should fill know to use github.secrets

**question:** how does `fill` know which vault to use for keys?

**can answer via logic?** partially — can propose options (manifest schema, flag, prompt), but decision is design choice

**can answer via docs/code?** checked fill implementation — it doesn't currently specify vault per key

**external research needed?** no

**only wisher knows?** yes — this is a product design decision

**triage:** [wisher]

**added to vision:** yes, lines 177-180

### question 4: gh api for secrets

**question:** confirm `gh api -X PUT` semantics for create/update

**can answer via logic?** no — need to verify api behavior

**can answer via docs/code?** no — this is external to our codebase

**external research needed?** yes — verify exact api call syntax via github docs or experimentation

**only wisher knows?** no

**triage:** [research]

**added to vision:** yes, line 184

### question 5: secret name validation

**question:** github has restrictions on secret names

**can answer via logic?** no — need to look up github's rules

**can answer via docs/code?** no — this is external to our codebase

**external research needed?** yes — github api docs on secret name constraints (e.g., no spaces, valid chars)

**only wisher knows?** no

**triage:** [research]

**added to vision:** yes, line 185

---

## verification: questions marked in vision

confirmed all questions have triage markers in `1.vision.yield.md`:

| question | marker | line |
|----------|--------|------|
| confirm mech name | [wisher] | 173 |
| status locked or remote | [wisher] | 175 |
| fill vault selection | [wisher] | 177 |
| gh api semantics | [research] | 184 |
| secret name validation | [research] | 185 |

---

## summary

| triage | count | questions |
|--------|-------|-----------|
| [wisher] | 3 | mech name, status semantics, fill behavior |
| [research] | 2 | gh api syntax, secret name rules |
| [answered] | 0 | none could be resolved now |

---

## review complete

all 5 open questions have been triaged and marked in the vision:
- 3 require wisher input before implementation can proceed
- 2 require external research in the research phase
- none could be answered immediately via logic or extant code

the vision clearly shows which questions block on whom.
