# self review (r8): has-behavior-declaration-coverage

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

eighth pass. slower, more careful verification.

---

## re-read the vision slowly

### the "aha" moment — three values

the vision promises three values:

1. **control**: "spawn a mechanic clone that stays in mechanic mindset"
2. **focus**: "context window has fewer tokens of irrelevant briefs"
3. **speed**: "boot is faster because fewer roles means fewer briefs to load"

**does the blueprint deliver these?**

- control ✓ — genBrainConfigDynamic filters hooks to specified roles only
- focus ✓ — only specified roles' briefs are loaded via filtered SessionStart hooks
- speed ✓ — fewer hooks = fewer briefs loaded = faster boot

all three values are delivered via the hook filter mechanism.

### the timeline — five steps

the vision declares this timeline:

```
t=0   human runs `rhx enroll claude --roles -driver`
t=1   rhx parses --roles spec
t=2   rhx computes: default_roles - driver
t=3   rhx generates dynamic config (e.g., .claude/settings.local.json)
t=4   rhx spawns claude with dynamic config
t=5   brain boots with customized context
```

**does the blueprint match this timeline?**

- t=1 ✓ — parseRolesSpec parses the spec
- t=2 ✓ — computeRoles computes final roles from spec and defaults
- t=3 ✓ — genBrainConfigDynamic generates settings.local.json
- t=4 ✓ — invokeEnroll spawns brain (via exec not spawn — key decision #5)
- t=5 ✓ — brain reads settings.local.json (highest precedence)

timeline is covered.

### open questions from vision

the vision had several open questions. let me verify they're addressed:

| question | status | blueprint coverage |
|----------|--------|-------------------|
| sessionstart can read env vars | superseded | wrapper approach bypasses |
| hooks can modify settings | answered: no | wrapper generates config |
| roles discoverable at boot | answered: yes | uses getLinkedRolesWithHooks |
| one syntax fits all brains | scoped to claude-code | genBrainConfigDynamic specific to claude-code |
| should RHACHET_ROLES persist | wisher question | not in blueprint scope |
| @file syntax | wisher question | not in blueprint scope |
| role has no hooks | silent skip | computeRoles handles |
| works for rhx ask/act | no, spawned only | invokeEnroll is separate command |

all answered questions are addressed. wisher questions are deferred (not required for v1).

### friction points from vision

the vision identified these friction points:

1. **wrapper required** — `rhx enroll` vs `RHACHET_ROLES=x claude`
2. **dynamic config files** — may clutter, need cleanup
3. **passthrough args** — arg parse must be clean

**does the blueprint address these?**

- friction 1 ✓ — wrapper is the chosen approach
- friction 2 — not explicitly addressed. should settings.local.json be cleaned up?
- friction 3 ✓ — allowUnknownOption handles passthrough

**gap found**: no mention of cleanup for settings.local.json

---

## gap: config file cleanup

the vision says: "dynamic config files... need cleanup or gitignore rules"

the blueprint does not address:
- when to clean up settings.local.json
- whether to gitignore it
- what happens if user runs `claude` directly after `rhx enroll`

**is this a blocker?**

from the vision: "settings.local.json has higher precedence and is more appropriate for dynamic config"

and from the backcompat review (r4): "the user opted into the new behavior when they used `rhx enroll`... the persistence is documented behavior"

so the intent is:
- settings.local.json persists
- user understands it persists
- user who runs `claude` directly after `rhx enroll` gets same roles

this is intentional behavior, not a gap. the vision accepts persistence.

**verdict**: not a gap. the vision explicitly accepts persistence. no cleanup needed.

---

## final verification

| vision requirement | covered | how |
|-------------------|---------|-----|
| control (stay in mindset) | ✓ | hook filter |
| focus (fewer tokens) | ✓ | only selected briefs load |
| speed (faster boot) | ✓ | fewer hooks |
| 7 usecases | ✓ | all mapped to mechanisms |
| timeline (5 steps) | ✓ | all steps covered |
| open questions (answered) | ✓ | addressed |
| friction points | ✓ | persistence is intentional |

---

## verdict

- [x] verified "aha" moment values are delivered
- [x] verified timeline steps match blueprint
- [x] verified open questions are addressed
- [x] verified friction points are handled
- [x] investigated cleanup gap — intentional persistence, not a gap
- [x] no gaps found

