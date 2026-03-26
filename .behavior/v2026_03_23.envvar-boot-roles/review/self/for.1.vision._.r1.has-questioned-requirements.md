# self-review r1: has-questioned-requirements

## update: wrapper approach confirmed

wisher confirmed: "lets go with the rhx enroll example in the after, as i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

all requirements verified below hold with wrapper as primary path.

## requirements examined

### 1. role customization syntax as the contract

**who said?** wisher, explicitly in wish lines 17-22

**evidence?** direct quote: "RHACHET_ROLES=-driver => subtract the driver role hooks from the brain"

**what if we didn't?** no way to customize roles at spawn time without manual config edits

**simpler way?** the syntax (`-driver`, `+architect`, `mechanic,ergonomist`) is minimal. wrapper (`rhx enroll`) is necessary because claude-code reads settings.json at startup — we can't inject dynamically.

**verdict**: ✓ holds — syntax explicitly requested. wrapper is wisher-approved fallback.

---

### 2. syntax: bare names replace, +/- for delta

**who said?** wisher, explicitly in wish lines 17-22

**evidence?**
- "RHACHET_ROLES=ergonomist = replace the role hooks to only have ergonomist"
- "RHACHET_ROLES=-driver,+architect => subtract driver, append architect (to the default)"

**what if we didn't?** users could only replace OR only delta, not both. less flexible.

**simpler way?** could drop one mode. but wisher explicitly requested both.

**verdict**: ✓ holds — explicitly requested

---

### 3. wrapper approach (`rhx enroll`) as primary

**who said?** wisher allowed this explicitly: "but if the cleanest way to solve this is via adhoc config files... then thats fine too"

**evidence?** wisher also said: "rhx enroll $brainCli --roles -driver,+architect"

**why wrapper?** claude-code reads settings.json at startup. we cannot dynamically inject via env var without wrapper. wrapper generates dynamic config before spawn.

**verdict**: ✓ holds — wrapper is the realistic path. wisher explicitly approved this approach.

---

### 4. wrapper mechanism (not sessionstart hook)

**who said?** wisher allowed wrapper: "rhx enroll $brainCli --roles -driver,+architect"

**evidence?** wish explicitly mentions wrapper as acceptable path

**mechanism**: wrapper generates dynamic config → spawns claude with that config

**verdict**: ✓ holds — wrapper is cleaner than hook-based approach. timeline now reflects wrapper flow.

---

### 5. fail-fast on typos

**who said?** i added this as pit-of-success principle

**evidence?** not explicitly requested

**what if we didn't?** silent failures would frustrate users

**simpler way?** could gracefully degrade. but fail-fast is safer.

**verdict**: ✓ holds — good pit-of-success design, even if not explicitly requested

---

### 6. idempotent +/- operations

**who said?** i added this

**evidence?** not explicitly requested

**what if we didn't?** `+foo` on already-present `foo` could error or duplicate

**simpler way?** could error. but idempotent is safer for scripted usage.

**verdict**: ✓ holds — good robustness principle

---

## summary

| requirement | source | verdict |
|-------------|--------|---------|
| role customization syntax | wisher | ✓ holds |
| +/- syntax for delta ops | wisher | ✓ holds |
| wrapper approach as primary | wisher confirmed | ✓ holds |
| wrapper mechanism (not hook) | wisher confirmed | ✓ holds |
| fail-fast on typos | added | ✓ holds |
| idempotent +/- | added | ✓ holds |

## key insight

the vision correctly captures WHAT users want (dynamic role customization at spawn time) and HOW it will work (wrapper approach). wisher confirmed: "i dont think it'd be possible to update claude to dynamic config without us as the wrapper"

the wrapper approach (`rhx enroll claude --roles <spec>`) is now the primary path. no further research needed on hook-based approach — it was ruled out by wisher.
