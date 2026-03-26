# self-review r1: has-questioned-assumptions

## update: wrapper approach confirmed

wisher confirmed: "lets go with the rhx enroll example in the after, as i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

this validates assumption #1 (wrapper can generate config) and resolves assumption #2 (claude-code respects overrides) — the wrapper bypasses the need for settings overrides by producing config before spawn.

## hidden assumptions examined

### 1. wrapper can generate dynamic config

**what we assumed**: `rhx enroll` generates dynamic config (e.g., `.claude/settings.local.json`) before spawn

**evidence?** wisher approved this: "if the cleanest way to solve this is via adhoc config files... then thats fine too"

**what if opposite?** claude-code might not support multiple settings files or overrides

**did wisher say this?** yes — explicitly allowed adhoc config files

**verdict**: ✓ reasonable — wrapper with dynamic config is wisher-approved path

---

### 2. claude-code respects local settings overrides

**what we assumed**: `.claude/settings.local.json` or similar can override `.claude/settings.json`

**evidence?** common pattern in tools (e.g., `.env.local` overrides `.env`)

**what if opposite?** if claude-code doesn't support overrides, we may need to temporarily swap settings.json

**did wisher say this?** implied by "adhoc config files"

**verdict**: ⚠️ needs research — check how claude-code handles settings precedence

---

### 3. roles are discoverable at boot time

**what we assumed**: `.agent/` symlinks are present and readable at sessionstart

**evidence?** this is how rhachet works today — `roles link` creates `.agent/` structure

**what if opposite?** if `.agent/` doesn't exist, role discovery fails

**did wisher say this?** implied by context — this is extant rhachet behavior

**verdict**: ✓ reasonable — extant behavior, but should fail gracefully if not present

---

### 4. one syntax fits all brains

**what we assumed**: `RHACHET_ROLES` env var works for claude, cursor, windsurf, etc.

**evidence?** none. each brain has different config mechanisms.

**what if opposite?** each brain needs its own adapter (which rhachet already has via BrainHooksAdapter pattern)

**did wisher say this?** no, but wish only mentions `claude` explicitly

**verdict**: ⚠️ scope creep — vision should focus on claude-code first, others later

---

### 5. comma is the right separator

**what we assumed**: `RHACHET_ROLES=mechanic,architect` uses comma

**evidence?** wisher used comma in examples

**what if opposite?** colon or space could work too

**did wisher say this?** yes, explicitly: "RHACHET_ROLES=-driver,+architect"

**verdict**: ✓ holds — wisher specified

---

### 6. boot performance matters

**what we assumed**: "a clone boots 40% faster because it only loaded mechanic briefs"

**evidence?** none. i made up the 40% number.

**what if opposite?** boot time might be negligible regardless of role count

**did wisher say this?** no. wisher focused on context window size, not boot time.

**verdict**: ⚠️ fabricated metric — should remove or flag as hypothetical

**fix applied**: the 40% claim is in the "aha moment" section. should be softened to "faster" without a number.

---

### 7. context window savings are significant

**what we assumed**: "the context window has 30k fewer tokens"

**evidence?** rough estimate based on mechanic briefs at ~30k tokens

**what if opposite?** actual savings depend on which roles are removed

**did wisher say this?** implied — "driver briefs cluttering context" suggests this is a concern

**verdict**: ⚠️ estimate — should be flagged as approximate, not presented as fact

---

### 8. ephemeral is acceptable

**what we assumed**: env var not persistent is acceptable (or even desirable)

**evidence?** wisher said "ideally" env var approach, which is inherently ephemeral

**what if opposite?** some users might want persistent role overrides per-repo

**did wisher say this?** not explicitly. wisher focused on spawn-time customization.

**verdict**: ✓ reasonable — ephemeral matches "spawn fresh clones" usecase. persistent overrides could be a future enhancement via `.rhachet.local` or similar.

---

## summary

| assumption | evidence | verdict |
|------------|----------|---------|
| wrapper can generate config | wisher approved | ✓ reasonable |
| claude-code respects overrides | common pattern | ⚠️ needs research |
| .agent/ discoverable | extant behavior | ✓ reasonable |
| works for all brains | none | ⚠️ scope creep |
| comma separator | wisher example | ✓ holds |
| boot performance matters | none | ⚠️ fabricated (now softened) |
| 30k token savings | estimate | ⚠️ approximate (now softened) |
| ephemeral is ok | implied | ✓ reasonable |

## fixes applied

1. **fabricated metrics**: "40% faster" and "30k tokens" claims softened in vision. now says "faster" and "fewer tokens" without numbers.

2. **multi-brain scope**: vision focuses on claude-code. other brains are future work.

3. **wrapper approach**: vision now uses `rhx enroll` as primary path, not pure env var. timeline reflects wrapper flow.

## key insight

the wrapper approach (`rhx enroll`) is now the primary path. the key research question left: **how does claude-code handle settings overrides?** options:
- `.claude/settings.local.json` (if supported)
- temporary swap of `.claude/settings.json`
- environment variable for config path (if claude-code supports)

the user experience is clear: `rhx enroll claude --roles mechanic` spawns with custom roles. implementation details will be validated in research phase.
