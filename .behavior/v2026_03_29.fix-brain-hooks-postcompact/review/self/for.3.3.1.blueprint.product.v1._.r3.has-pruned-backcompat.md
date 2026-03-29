# self-review r3: has-pruned-backcompat

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

