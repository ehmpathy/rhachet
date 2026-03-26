# self-review r3: has-questioned-questions

## update: wrapper approach confirmed

wisher confirmed: "i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

this changes the triage:
- A2 is now [answered] — wrapper is mandatory, not optional
- A1, R1 are lower priority — wrapper bypasses hooks

## updated triage

| question | triage | action |
|----------|--------|--------|
| Q1: persistence | [wisher] | only wisher can decide |
| Q2: @file syntax | [wisher] | scope decision for wisher |
| Q3: role without hooks | [answered] | silent skip — role may contribute briefs |
| Q4: sdk support | [answered] | spawned brains only — sdk passes roles via code |
| A1: hook reads env | [research, superseded] | lower priority — wrapper bypasses |
| A2: dynamic settings | [answered] | no — wisher confirmed wrapper required |
| A3: roles discoverable | [answered] | yes after `rhx init` |
| A4: multi-brain syntax | [research] | scope to claude-code first |
| R1: env in hooks | [research, superseded] | lower priority — wrapper bypasses |
| R2: settings swap | [research, critical] | wrapper needs this mechanism |
| R3: perf cost | [research] | measure after prototype |
| R4: cleanup | [research] | what happens to dynamic config after session? |
| R5: concurrency | [research] | how to handle multiple sessions? |

## issues found and fixed

**issue**: vision did not mark questions with triage status

**fix**: updated vision to include [answered], [research], [wisher] markers for each question

**applied**: ✓ edited 1.vision.md "open questions & assumptions" section

## why the triage holds

### [answered] questions — resolved via logic

**Q3: role without hooks** — silent skip is correct because:
- a role can contribute briefs without hooks
- hooks are one mechanism, briefs are another
- error would block valid usecases

**Q4: sdk support** — spawned brains only because:
- sdk already has explicit role params via code
- env var is a shell-level mechanism for CLI spawns
- combined env var with sdk would create confusion

**A3: roles discoverable** — yes after init because:
- `rhx init` creates `.agent/` structure
- this is documented extant behavior
- feature can require initialized repo (pit of success)

### [research] questions — cannot answer without external info

**A1, A2, R1, R2** — all relate to claude-code internals:
- how does claude-code handle env vars in hooks?
- can settings.json be swapped at runtime?

these require review of claude-code docs or source. cannot answer via logic alone.

### [wisher] questions — design decisions

**Q1: persistence** — only wisher knows if ephemeral is acceptable or persistence is needed

**Q2: @file syntax** — scope decision. wisher must prioritize.

## issues found and fixed

### issue 1: A2 triage updated

**problem**: A2 was [research] but wisher confirmed the answer

**fix**: updated A2 to [answered] — wrapper is mandatory because dynamic settings is not possible

**applied**: ✓ updated in vision and r2 review

---

## non-issues confirmed

### Q1 and Q2 — wisher questions hold

these are design decisions only wisher can make:
- Q1: persistence — ephemeral vs persistent is a product decision
- Q2: @file syntax — scope decision

no change with wrapper approach.

### R2 — settings swap research still critical

the wrapper needs to generate dynamic config. options:
- `.claude/settings.local.json` (if supported)
- temporary swap of `.claude/settings.json`
- env var for config path (if claude-code supports)

this research is still needed for implementation.

---

## reflection

the vision is properly triaged for the wrapper approach:
- A2 is answered — wrapper is mandatory
- A1, R1 are lower priority — wrapper bypasses hook-based approach
- R2 is the critical research item for implementation
- [wisher] questions deferred to later iterations

---

## third pass: deeper review

pause. what questions are absent?

### absent question 1: cleanup of dynamic config

**what happens after a session ends?**

if we generate `.claude/settings.local.json` for each spawn:
- does it persist after session exits?
- should next spawn reuse it or regenerate?
- should we clean up on exit?

**options:**
1. leave it (gitignore, reuse on same-role spawn)
2. clean on exit (via trap or wrapper cleanup)
3. use unique filenames with timestamp, periodic cleanup

**triage**: [research] — needs design decision based on claude-code behavior

---

### absent question 2: concurrent sessions

**what happens with two terminals?**

```bash
# terminal 1
rhx enroll claude --roles mechanic

# terminal 2 (same repo, same time)
rhx enroll claude --roles architect
```

if both write to `.claude/settings.local.json`:
- race condition
- one overwrites the other
- sessions get wrong roles

**options:**
1. per-session config files (e.g., `.claude/settings.{pid}.local.json`)
2. per-terminal env var that points to unique config
3. accept limitation: one rhx-spawned session per repo at a time

**triage**: [research] — needs design decision

---

### issue 3: A1 and R1 should be marked superseded

**problem:** A1 and R1 are still listed as [research] but wrapper approach makes them irrelevant

**current state:**
- A1: hook reads env — [research]
- R1: env in hooks — [research]

**fix:** mark these as [research, lower priority — superseded by wrapper approach]

**action:** update vision to clarify these are not on critical path

---

## fixes applied from this review

### issue 1: added absent questions to vision

**problem:** cleanup and concurrency were not addressed

**fix:** added to "open questions & assumptions" section:
- cleanup: [research] what happens to dynamic config after session?
- concurrency: [research] how to handle multiple sessions in same repo?

**applied:** ✓ edited 1.vision.md

### issue 2: clarified A1/R1 as superseded

**problem:** A1 and R1 were unclear — marked [research] but not on critical path

**fix:** updated their notes to clarify "lower priority — superseded by wrapper approach"

**applied:** ✓ edited 1.vision.md

---

## final summary

| category | questions | status |
|----------|-----------|--------|
| [answered] | Q3, Q4, A2, A3 | resolved via logic or wisher |
| [wisher] | Q1, Q2 | design decisions for wisher |
| [research, critical] | R2 | settings swap mechanism |
| [research, new] | cleanup, concurrency | identified in this review |
| [research, superseded] | A1, R1 | not on critical path |
| [research, minor] | A4, R3 | scope/perf, measure later |

the vision now has complete question coverage for the wrapper approach.
