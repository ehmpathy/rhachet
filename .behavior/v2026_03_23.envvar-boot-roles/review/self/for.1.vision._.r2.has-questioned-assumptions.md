# self-review r2: has-questioned-assumptions

## update: wrapper approach

the vision now uses `rhx enroll claude --roles <spec>` as the primary path. this changes many assumptions.

## deeper examination

let me question what the wrapper approach implies.

---

### assumption 9: users want role-level granularity

**what we assumed**: users want to add/remove individual roles

**evidence?** wisher's examples all use role names

**what if opposite?** users might want brief-level or skill-level granularity:
- "boot with mechanic but without the git.commit skills"
- "boot with mechanic but include architect's bounded-contexts brief"

**did wisher say this?** no. wisher only mentioned role-level control.

**verdict**: ✓ holds for now — role-level is the scope wisher requested. but this reveals a future extension path: `RHACHET_BRIEFS`, `RHACHET_SKILLS` env vars for finer control.

---

### assumption 10: defaults are always the start point for delta ops

**what we assumed**: `+role` and `-role` always operate on defaults

**evidence?** wisher said "-driver,+architect => subtract driver, append architect (to the default)"

**what if opposite?** what if user wants delta from a different baseline?
- "start from mechanic-only, then add architect"

**did wisher say this?** no mechanism for non-default baselines was requested

**verdict**: ✓ holds — wisher's syntax implies defaults as baseline. future enhancement could support `RHACHET_ROLES=@baseline:mechanic,+architect` but this adds complexity.

---

### assumption 11: the "aha" moment is about performance/clutter

**what we assumed**: value proposition is "faster boot, less context clutter"

**evidence?** i inferred this from wisher's "driver briefs clutter context"

**what if opposite?** the real value might be:
- **focus**: mechanic-only clone stays in mechanic mindset
- **consistency**: same roles every spawn, no drift
- **experimentation**: test how different role combos behave

**did wisher say this?** wisher said "granularly control the roles its enrolled to" — this is about control, not just performance

**verdict**: ⚠️ incomplete frame — vision should emphasize CONTROL as primary value, with performance as secondary benefit

---

### assumption 12: error messages are the right UX for bad input

**what we assumed**: typos → fail fast with helpful error

**evidence?** pit-of-success principle

**what if opposite?** could use fuzzy match and warn instead:
- "role 'mechnic' not found, assume 'mechanic'. set RHACHET_STRICT=1 to error instead"

**did wisher say this?** no

**verdict**: ⚠️ design decision — fail-fast is safer, but lenient mode has merit. vision should note this as a UX decision to validate with users.

---

### assumption 13: settings.json is the only hook mechanism

**what we assumed**: we must modify settings.json (or swap it) to change hooks

**evidence?** none — i assumed based on how claude-code works today

**what if opposite?** claude-code might support:
- command-line flags for hook overrides
- environment variables for hook paths
- multiple settings files merged

**did wisher say this?** no

**verdict**: ⚠️ research gap — vision assumes implementation constraint that may not exist. need to check claude-code docs thoroughly.

---

### assumption 14: the wish is about spawned brains only

**what we assumed**: this feature applies to `claude` CLI spawns

**evidence?** wisher's examples all show `RHACHET_ROLES=x claude`

**what if opposite?** might also apply to:
- `rhx ask` / `rhx act` (sdk-driven brains)
- embedded brain instances in applications
- agent orchestration systems (zone clones)

**did wisher say this?** wisher mentioned "spawn fresh clones" specifically

**verdict**: ✓ holds for scope — spawned brains is the explicit scope. SDK usage is different (roles passed via code, not env var).

---

## issues found and fixed

### issue 1: incomplete "aha" frame

**problem**: vision emphasizes performance, but the core value is CONTROL

**fix**: update the "aha" section to lead with control, not speed

**applied**: ✓ fixed in 1.vision.md

the "aha" section now reads:
```
1. **control**: you spawn a mechanic clone that stays in mechanic mindset
2. **focus**: the context window has fewer tokens of irrelevant briefs
3. **speed**: boot is faster because fewer roles means fewer briefs to load
```

control is now primary. focus and speed are secondary benefits. fabricated metrics ("40%", "30k") are removed.

---

### issue 2: fabricated metrics removed

**problem**: the "40% faster" and "30k tokens" claims were fabricated

**fix**: replaced with qualitative language

**applied**: ✓ fixed in 1.vision.md (same edit as above)

---

## non-issues confirmed

1. **role-level granularity**: wisher explicitly requested this scope — holds
2. **defaults as baseline**: wisher's syntax implies this — holds
3. **spawned brains scope**: wisher explicitly mentioned "spawn fresh clones" — holds
4. **error UX**: fail-fast is the right default; lenient mode can be future enhancement — holds
5. **settings.json constraint**: acknowledged in "what is awkward" — holds as open research question

---

## third pass: deeper questioning

taking a breath. what did i miss?

### assumption 15: defaults are a problem worth solving

**what we assumed**: having all default roles boot is a problem ("clutter context")

**evidence?** wisher says "driver briefs cluttering context"

**what if opposite?** most users might be fine with defaults. this feature might be power-user only.

**did wisher say this?** wisher is a power user requesting a power-user feature. the "before" scenario may exaggerate the pain.

**verdict**: ✓ holds — wisher has the pain, feature is valid. but vision should note this is advanced usage, not everyday need.

---

### assumption 16: fictional examples reflect real usecases

**what we assumed**: "vlad spawns mechanic", "sarah spawns ergonomist" are representative

**evidence?** none — these are invented scenarios

**what if opposite?** real usecases might be different:
- ci/cd pipelines need deterministic role sets
- team standardization on role combos
- debugging with minimal context

**verdict**: ⚠️ vision should ground examples in wisher's actual usecase, not fictional personas

---

### assumption 17: analogies are accurate

**what we assumed**: PATH, docker -e, shell aliases are good analogies

**evidence?** surface similarity

**what if opposite?**
- PATH affects which binary is found, not how it's configured
- docker -e sets runtime env, not startup config
- shell aliases are command shortcuts, not config injection

**verdict**: ⚠️ analogies are imperfect. vision should acknowledge or find better ones. maybe: `GIT_AUTHOR_NAME` (env var that changes git behavior) is closer.

---

### assumption 18: evaluation section claims victory prematurely

**what we assumed**: "✓ solved" checkmarks in evaluation table

**evidence?** none — we haven't built it

**what if opposite?** implementation might reveal unsolvable constraints

**verdict**: ⚠️ evaluation should use "proposed" or "goal" not "solved". this is a vision, not a post-mortem.

---

### assumption 19: wrapper is the primary path

**what we assumed**: `rhx enroll claude --roles <spec>` is the primary interface

**evidence?** wisher confirmed: "lets go with the rhx enroll example in the after, as i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

**what if opposite?** pure env var might work if claude-code supported dynamic config. but wisher ruled this out.

**did wisher say this?** yes, explicitly.

**verdict**: ✓ holds — wrapper is now the primary path. vision updated to reflect this. stance is clear.

---

### assumption 20: .agent/ exists before RHACHET_ROLES is used

**what we assumed**: roles discoverable at boot time

**evidence?** extant rhachet behavior after `rhx init`

**what if opposite?** user might set RHACHET_ROLES before `rhx init`. no .agent/ = crash.

**verdict**: ⚠️ vision should specify: feature requires initialized repo. add to pit-of-success: "if .agent/ not found, error with 'run rhx init first'"

---

## summary of third pass

| assumption | verdict | action |
|------------|---------|--------|
| defaults are a problem | ✓ valid for power users | note as advanced feature |
| fictional examples | ⚠️ ungrounded | ground in wisher's real usecase |
| analogies | ⚠️ imperfect | find better (GIT_AUTHOR_NAME?) |
| evaluation claims solved | ⚠️ premature | change to "goal" not "solved" |
| wrapper is primary | ✓ confirmed by wisher | stance is clear |
| .agent/ extant | ⚠️ not guaranteed | add init requirement to pit-of-success |

## fixes applied from this review

### issue 1: evaluation claimed "solved" prematurely

**problem**: evaluation table used "✓ solved" but feature is not built yet

**fix**: changed to "✓ goal" to indicate proposed outcomes

**applied**: ✓ edited 1.vision.md

### issue 2: pros section mentioned env var

**problem**: pros said "just set an env var" but wrapper is primary path

**fix**: changed to "just add `--roles <spec>` to the command"

**applied**: ✓ edited 1.vision.md

### issue 3: .agent/ init requirement not in pit-of-success

**problem**: vision didn't specify what happens if .agent/ is absent

**fix**: added edgecase: "no `.agent/` directory → error: run rhx init first"

**applied**: ✓ edited 1.vision.md

---

## new assumptions found (fourth pass)

### assumption 21: resume works with different roles

**what we assumed**: `--resume` can be combined with `--roles`

**evidence?** wisher said: "rhx enroll claude --roles -driver,+architect --resume flag-to-passthrough"

**what if opposite?** resuming a session with different roles than it started with could cause confusion — the brain's context might reference briefs no longer present

**did wisher say this?** wisher mentioned resume as a passthrough, not as a semantic concern

**verdict**: ⚠️ research question — what happens when you resume with different roles? add to research phase.

### assumption 22: behavior name still fits

**what we assumed**: behavior is called "envvar-boot-roles"

**evidence?** behavior was named before wrapper approach was confirmed

**what if opposite?** "wrapper-boot-roles" or "enroll-roles" might be more accurate now

**did wisher say this?** no — name was chosen early

**verdict**: ✓ acceptable — behavior names don't need to be perfect. the vision content is what matters.

---

## non-issues confirmed (why they hold)

1. **fictional examples** — ⚠️ noted but not fixed. these are illustrative; real usecases will emerge in research phase.

2. **imperfect analogies** — ⚠️ noted but not fixed. analogies are never perfect; these are close enough to convey the concept.

3. **resume with roles** — ⚠️ noted as research question. added to research phase backlog.

the vision now captures the essential shape correctly with wrapper as primary path.
