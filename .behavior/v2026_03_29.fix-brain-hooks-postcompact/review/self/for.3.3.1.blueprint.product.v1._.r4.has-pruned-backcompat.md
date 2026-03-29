# self-review r4: has-pruned-backcompat

## backwards compatibility concerns in blueprint

### 1. "no filter → SessionStart (backwards compat)"

**location:** codepath tree line 37, test coverage line 106

**what it does:** when an onBoot hook has no filter.what, it registers under SessionStart event only

**was this explicitly requested?**

**evidence from criteria:**
> usecase.3 = backwards compat: no filter = SessionStart only
> ```
> given(role declares onBoot hook without filter)
>   when(role hooks are synced to claude code)
>     then(hook is registered under SessionStart event)
>       sothat(prior behavior is preserved)
> ```

**verdict: EXPLICITLY REQUESTED** — criteria usecase.3 explicitly requires this backwards compat behavior

---

### 2. reverse translation: SessionStart → onBoot (no filter)

**location:** codepath tree line 54, test coverage line 119

**what it does:** when claude code has a SessionStart hook, reverse translation produces `onBoot` without filter

**was this explicitly requested?**

**analysis:** this is the inverse of usecase.3. if we emit SessionStart for `onBoot` without filter, then to read it back should reconstruct `onBoot` without filter. this is round-trip integrity, not backwards compat.

**verdict: REQUIRED FOR CONSISTENCY** — not backwards compat per se, but required for round-trip integrity

---

### 3. ClaudeCodeSettings type retains prior event types

**location:** contracts section, lines 76-84

**what it does:** keeps SessionStart, PreToolUse, PostToolUse, Stop in the interface while we add PreCompact, PostCompact

**was this explicitly requested?**

**analysis:** this isn't backwards compat — it's just not a removal of extant functionality. to remove prior event types would break the adapter entirely.

**verdict: NOT BACKWARDS COMPAT** — just normal addition, not preservation of deprecated behavior

---

## check for assumed backwards compat

**question:** did we add any backwards compat "to be safe" that wasn't requested?

**analysis of each "backwards compat" mention:**

| mention | requested? | evidence |
|---------|------------|----------|
| no filter → SessionStart | YES | criteria usecase.3 |
| SessionStart → onBoot (no filter) | implied | round-trip integrity |
| keep prior event types | not backwards compat | normal addition |

**verdict: CLEAN** — no assumed backwards compat found

---

## open questions for wisher

**none** — all backwards compat in the blueprint traces to explicit requirements

---

## lessons

### lesson 1: backwards compat must be explicit

the criteria explicitly states usecase.3 as "backwards compat: no filter = SessionStart only". this explicit label makes review trivial — the wisher already decided this is required.

### lesson 2: round-trip integrity isn't backwards compat

reverse translation (SessionStart → onBoot) isn't backwards compat — it's consistency. if we write A, we should read A. this is a correctness requirement, not a preservation-of-deprecated-behavior concern.

### lesson 3: addition isn't backwards compat

to add PreCompact and PostCompact to ClaudeCodeSettings while we keep SessionStart isn't "backwards compat" — it's just not removal. backwards compat refers to preservation of deprecated/legacy behavior, not to avoidance of regression.

### lesson 4: the criteria made this easy

the wisher put "backwards compat" in the criteria usecase name. this explicit label left no ambiguity. future wishs should be equally explicit about which backwards compat concerns are intentional vs which should be questioned.

### lesson 5: memory feedback "zero backcompat"

the user's memory feedback states: "never add backwards compat, just delete"

**question:** does this contradict criteria usecase.3?

**analysis:** no. the memory feedback means "don't add backwards compat that wasn't requested". criteria usecase.3 explicitly requests backwards compat, so it's not an addition "to be safe" — it's an explicit requirement.

the memory feedback applies to assumed backwards compat, not to explicitly requested backwards compat.

### lesson 6: depth of review

this review required cross-reference between:
- blueprint (what we claim)
- criteria (what was requested)
- memory (user preferences)

all three sources align: backwards compat in blueprint was explicitly requested, not assumed.

---

## counterexample: what if we removed backwards compat?

**hypothetical:** what if we ignored usecase.3 and required filter.what for all onBoot hooks?

**impact analysis:**

| scenario | with backwards compat | without backwards compat |
|----------|----------------------|--------------------------|
| extant role with `onBoot` hook, no filter | works (SessionStart) | BREAKS — error or undefined behavior |
| new role with `onBoot + filter.what=PostCompact` | works | works |
| upgrade path | smooth | requires all extant roles to add filter |

**verdict:** removal would break extant roles. this justifies the criteria requirement for backwards compat.

---

## second-order question: is the backwards compat too broad?

**question:** should we emit a deprecation notice for hooks without filter?

**analysis:** the wish didn't mention deprecation. the criteria says "prior behavior is preserved" — not "prior behavior is preserved with notice".

**verdict:** no deprecation notice needed. the wisher explicitly asked for preservation, not soft-deprecation.

---

## the memory feedback deeper dive

**memory says:** "never add backwards compat, just delete"

**interpretation 1:** don't add backwards compat that wasn't requested
**interpretation 2:** actively remove all backwards compat everywhere

**which interpretation fits?**

if interpretation 2, the wisher would have said "remove the default SessionStart behavior" in the wish. instead, the wish says "they should be supportable as onBoot w/ a special filter" — this implies extant onBoot behavior continues.

**verdict:** interpretation 1 is correct. the memory feedback prohibits assumed backwards compat, not explicitly requested backwards compat.

---

## final verification

| question | answer |
|----------|--------|
| did wisher request backwards compat? | YES (criteria usecase.3) |
| did we add backwards compat "to be safe"? | NO |
| did we add backwards compat beyond what was requested? | NO |
| is the backwards compat minimal? | YES (one case: no filter → SessionStart) |

**final verdict: CLEAN** — backwards compat is explicitly requested and minimal.

