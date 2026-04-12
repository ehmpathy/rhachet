# self-review: has-questioned-questions (r2)

## triage of open questions

### question 1: confirm mech name

**question:** wish says "EPHEMERAL_VIA_GITHUB_TOKEN" but codebase has "EPHEMERAL_VIA_GITHUB_APP". do you mean the github app mech?

**can answer via logic?** no — wisher's intent is unclear

**can answer via docs/code?** no — codebase confirms mech name, but not wisher's intent

**external research needed?** no

**only wisher knows?** yes — this is about what the wisher meant to ask for

**triage:** [wisher]

### question 2: status locked or remote

**question:** should `status` show `locked` or a new state like `remote`?

**can answer via logic?** partially — both have tradeoffs (reuse vs precision)

**can answer via docs/code?** no — this is a new design decision

**external research needed?** no

**only wisher knows?** yes — this is a UX design choice for the wisher

**triage:** [wisher]

### question 3: how should fill know to use github.secrets

**question:** how does `fill` know which vault to use for keys?

**can answer via logic?** partially — we can propose options, but decision is design choice

**can answer via docs/code?** no — fill currently doesn't specify vault

**external research needed?** no

**only wisher knows?** yes — this is a product design decision

**triage:** [wisher]

### question 4: gh api for secrets

**question:** confirm `gh api -X PUT` semantics for create/update

**can answer via logic?** no — need to verify api behavior

**can answer via docs/code?** partially — gh cli docs or github api docs

**external research needed?** yes — verify exact api call syntax

**only wisher knows?** no

**triage:** [research]

### question 5: secret name validation

**question:** github has restrictions on secret names

**can answer via logic?** no — need to look up github's rules

**can answer via docs/code?** no — this is external to our codebase

**external research needed?** yes — github api docs on secret name constraints

**only wisher knows?** no

**triage:** [research]

---

## summary

| question | triage | reason |
|----------|--------|--------|
| confirm mech name | [wisher] | only wisher knows their intent |
| status locked or remote | [wisher] | UX design decision |
| fill vault selection | [wisher] | product design decision |
| gh api semantics | [research] | need to verify api behavior |
| secret name validation | [research] | need github api docs |

---

## action taken

updated vision to add triage markers to all open questions:
- 3 questions marked as [wisher]
- 2 questions marked as [research]
- 0 questions marked as [answered] (none could be resolved now)

---

## review complete

all 5 open questions have been triaged:
- 3 require wisher input
- 2 require external research
- none could be answered immediately

the vision now clearly marks which questions block on whom.
