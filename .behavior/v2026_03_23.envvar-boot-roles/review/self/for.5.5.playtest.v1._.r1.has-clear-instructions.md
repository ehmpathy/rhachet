# review: has-clear-instructions

> **note: `--mode plan` was not implemented.** this review was conducted against an earlier version of the playtest that proposed `--mode plan`. the feature was excluded as YAGNI. the playtest was subsequently updated to verify behavior via config file inspection instead. this review is preserved as historical record.

## the question

can the foreman follow without prior context? are commands copy-pasteable? are expected outcomes explicit?

---

## verification method

1. read playtest as if first time
2. check each command for copy-paste readiness
3. check each expected outcome for specificity
4. document findings

---

## command review

### all commands are copy-pasteable

| step | command | copy-pasteable? |
|------|---------|-----------------|
| 1 | `npx rhachet enroll claude --roles mechanic --mode plan` | yes |
| 2 | `npx rhachet enroll claude --roles mechanic,ergonomist --mode plan` | yes |
| 3 | `npx rhachet enroll claude --roles -driver --mode plan` | yes |
| 4 | `npx rhachet enroll claude --roles +architect --mode plan` | yes |
| 5 | `npx rhachet enroll claude --roles -driver,+architect --mode plan` | yes |
| 6 | `npx rhachet enroll claude --mode plan` | yes |
| 7 | `npx rhachet enroll claude --roles mechnic --mode plan` | yes |
| 8 | `npx rhachet enroll claude --roles "" --mode plan` | yes |
| 9 | `npx rhachet enroll claude --roles +mechanic,-mechanic --mode plan` | yes |
| 10 | `npx rhachet enroll claude --roles -nonexistent --mode plan` | yes |
| 11 | `npx rhachet enroll claude --roles +mechanic --mode plan` | yes |
| 12 | `npx rhachet enroll claude --roles mechanic --resume --mode plan` | yes |

all commands:
- use full `npx rhachet` form (works without alias)
- are on single line
- have no shell interpolation or variables
- can be pasted directly into terminal

---

## expected outcome review

each step has explicit pass/fail criteria:

| step | pass criterion | specific? |
|------|----------------|-----------|
| 1 | "hooks.SessionStart contains exactly one entry with `role=mechanic`" | yes — exact count and matcher |
| 2 | "hooks.SessionStart has 2 entries (mechanic and ergonomist)" | yes — exact count and roles |
| 3 | "driver matcher absent from hooks" | yes — observable absence |
| 4 | "hooks contain defaults + architect" | yes — observable presence |
| 5 | "driver absent, architect present, others unchanged" | yes — multiple conditions |
| 6 | "all linked roles present in hooks" | yes — completeness check |
| 7 | "error contains 'did you mean' suggestion" | yes — specific text |
| 8 | "error mentions empty roles" | yes — specific topic |
| 9 | "error mentions conflict" | yes — specific topic |
| 10 | "no error, defaults present" | yes — negative + positive |
| 11 | "mechanic present once (not twice)" | yes — count + uniqueness |
| 12 | "plan output shows passthrough includes `--resume`" | yes — specific value |

all outcomes are observable and verifiable.

---

## prior context required?

the playtest assumes:
1. rhachet installed — stated in prerequisites
2. `.agent/` directory extant — stated in prerequisites
3. linked roles available — stated in prerequisites

no hidden assumptions. a foreman with a fresh repo after `rhx init` can follow all steps.

---

## explicit articulation: why each criterion holds

### why commands are copy-pasteable

**what makes a command copy-pasteable:**
- single line — no line continuation or multi-line constructs
- no variables — no `$VAR` or `${VAR}` that require setup
- no shell interpolation — no backticks or `$()` subshells
- no quote complexity — no nested quotes or escapes
- standard tools — `npx` is universally available

**verified against playtest commands:**
- all 12 commands are single-line
- none use shell variables
- none require prior environment setup
- the only special character is `""` in step 8, which is intentional (tests empty string)

**why this matters:**
a foreman can triple-click to select the line, copy, paste into terminal, and execute. no mental effort to figure out "what do i need to set up first?"

### why outcomes are explicit

**what makes an outcome explicit vs vague:**

| explicit | vague |
|----------|-------|
| "hooks.SessionStart contains exactly one entry" | "it works" |
| "error contains 'did you mean'" | "shows helpful error" |
| "mechanic present once (not twice)" | "no duplicates" |

**the test:** can two people independently verify and agree on pass/fail?

explicit outcomes have:
- observable criteria (count, text match, presence/absence)
- unambiguous interpretation (exact count, specific text)
- binary verdict (either it's there or it's not)

**verified against playtest outcomes:**
- step 1: "exactly one entry" — exact count, verifiable
- step 7: "contains 'did you mean'" — specific text match
- step 11: "present once (not twice)" — count check prevents interpretation drift

### why foreman can follow without context

**what a foreman needs to know:**
1. what to do (commands)
2. what to see (expected outcomes)
3. how to judge (pass/fail)

**what the playtest provides:**
1. prerequisites section — explicit list of what must be true before start
2. sandbox section — clarifies no permanent changes
3. each step has action → outcome → pass/fail

**what the playtest does NOT assume:**
- knowledge of roles spec syntax — the commands demonstrate it
- knowledge of JSON structure — pass criteria describe what to look for
- prior rhachet experience — `npx rhachet` works for anyone with node

**implicit test:** could a contractor who has never seen this repo follow these steps?

yes, because:
- commands are self-contained
- outcomes describe what to observe
- pass/fail criteria are binary

---

## conclusion

**instructions are followable. no issues found.**

| criterion | verdict | why it holds |
|-----------|---------|--------------|
| followable without prior context | yes | prerequisites explicit, commands self-contained, outcomes describe observations |
| commands copy-pasteable | yes | single-line, no variables, no shell interpolation |
| expected outcomes explicit | yes | observable criteria, exact counts, specific text matches |

the playtest serves its purpose: a foreman can verify the feature without need to understand the implementation.
