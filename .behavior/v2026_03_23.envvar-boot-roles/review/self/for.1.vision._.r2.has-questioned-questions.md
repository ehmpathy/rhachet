# self-review r2: has-questioned-questions

## update: wrapper approach

the vision now uses `rhx enroll claude --roles <spec>` as the primary path. wisher confirmed: "i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

this changes research priorities:
- hook-related research (A1, A2, R1) is now lower priority — wrapper bypasses hooks
- settings swap research (R2) is still critical — wrapper must generate config
- [answered] and [wisher] questions are unchanged

## triage of open questions

the vision lists questions under "open questions & assumptions". let me triage each.

---

### questions for wisher

**Q1: should `RHACHET_ROLES` persist in any way, or purely ephemeral?**

- can answer via logic? no — this is a design decision
- can answer via docs/code? no
- external research needed? no
- wisher input needed? **yes**

**triage**: [wisher] — only the wisher can decide if persistence is desired

---

**Q2: should we support `RHACHET_ROLES=@file` to read from a file?**

- can answer via logic? partially — this is a feature request, not a question
- can answer via docs/code? no
- external research needed? no
- wisher input needed? **yes** — is this in scope or future enhancement?

**triage**: [wisher] — scope decision

---

**Q3: what's the expected behavior if a role has no hooks? (silent skip vs error)**

- can answer via logic? **yes** — silent skip is more robust (role might have briefs but no hooks)
- can answer via docs/code? no
- external research needed? no
- wisher input needed? no

**triage**: [answered] — silent skip. a role without hooks still contributes briefs. no error.

---

**Q4: should this work for `rhx ask`/`rhx act` too, or only spawned brains?**

- can answer via logic? **yes** — `rhx ask`/`rhx act` pass roles via code, not env var
- can answer via docs/code? yes — sdk already supports explicit role params
- external research needed? no
- wisher input needed? no

**triage**: [answered] — spawned brains only. sdk usage passes roles via code. env var is for cli-spawned brains.

---

### assumptions that need verification

**A1: sessionstart hook can read env vars**

- can answer via logic? no
- can answer via docs/code? **maybe** — check claude-code docs
- external research needed? **yes**
- wisher input needed? no

**triage**: [research] — read claude-code hook documentation

---

**A2: hooks can modify settings dynamically**

- can answer via logic? **yes, answer is no** — settings.json is read at startup
- can answer via docs/code? wisher confirmed
- external research needed? **no longer needed**
- wisher input needed? no

**triage**: [answered] — wisher confirmed this is not possible, which is why wrapper approach is mandatory. answer: no, hooks cannot modify settings dynamically.

---

**A3: roles are discoverable at boot time**

- can answer via logic? **yes** — `.agent/` extant after `rhx init`
- can answer via docs/code? yes — rhachet behavior
- external research needed? no
- wisher input needed? no

**triage**: [answered] — yes, after `rhx init`. feature requires initialized repo.

---

**A4: one syntax fits all brains**

- can answer via logic? **no** — each brain has different config mechanisms
- can answer via docs/code? partially — BrainHooksAdapter pattern exists
- external research needed? **yes** — for non-claude brains
- wisher input needed? no

**triage**: [research] — but scope to claude-code first. other brains are future.

---

### external research needed (from vision)

**R1: how does claude-code expose env vars to sessionstart hooks?**

**triage**: [research] — critical path question

---

**R2: can we dynamically generate/swap settings.json at boot time?**

**triage**: [research] — determines if wrapper is mandatory

---

**R3: what's the performance cost of role computation at every boot?**

**triage**: [research] — minor concern, measure after prototype works

---

## summary of triage

| question | triage | action |
|----------|--------|--------|
| Q1: persistence | [wisher] | ask wisher |
| Q2: @file syntax | [wisher] | ask wisher if in scope |
| Q3: role without hooks | [answered] | silent skip |
| Q4: sdk support | [answered] | spawned brains only |
| A1: hook reads env | [research] | check claude-code docs |
| A2: dynamic settings | [answered] | no — wrapper required |
| A3: roles discoverable | [answered] | yes after init |
| A4: multi-brain syntax | [research] | scope to claude first |
| R1: env in hooks | [research] | critical path |
| R2: settings swap | [research] | determines approach |
| R3: perf cost | [research] | measure later |

## action: update vision

the vision should be updated to mark questions with their triage status. let me do that now.

---

## issues found and fixed

### issue 1: A2 is now answered

**problem**: A2 was marked [research] but wisher confirmed the answer is "no"

**fix**: updated A2 to [answered] in both this review and the vision

**applied**: ✓ edited 1.vision.md

---

## reflection

the wrapper approach simplifies the research phase:
- A2 is now [answered] — wrapper is mandatory, not optional
- hook-related research (A1, R1) is lower priority — wrapper bypasses hooks
- R2 (settings swap mechanism) is still the critical research item

the vision is properly triaged for the wrapper approach.
