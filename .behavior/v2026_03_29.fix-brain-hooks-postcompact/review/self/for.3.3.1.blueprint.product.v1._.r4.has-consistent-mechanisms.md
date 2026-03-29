# self-review r4: has-consistent-mechanisms

## search for extant mechanisms

### mechanism 1: EVENT_MAP

**searched for:** `EVENT_MAP`

**found:**
- `translateHook.ts:12` — declares `EVENT_MAP: Record<BrainHookEvent, string>`
- `genBrainHooksAdapterForClaudeCode.ts:159` — duplicate declaration in del method

**blueprint proposes:** extend EVENT_MAP to handle filter.what for onBoot

**verdict: EXTENDS EXTANT** — we did not introduce EVENT_MAP; we extend its usage

---

### mechanism 2: BOOT_EVENTS constant

**searched for:** `BOOT_EVENTS`, `bootEvents`, `boot.*events`

**found:** none

**blueprint proposes:** implicit set `['SessionStart', 'PreCompact', 'PostCompact']` for wildcard expansion

**verdict: NEW BUT MINIMAL** — inline array, not a named constant; justified by wildcard usecase.5

---

### mechanism 3: translateHookToClaudeCode return type

**searched for:** `translateHookToClaudeCode`

**found:** returns single `{ event, entry }` object

**blueprint proposes:** return `Array<{ event, entry }>`

**verdict: EXTENDS EXTANT** — return type change, not a new function; the function already exists

---

### mechanism 4: reverse event map in translateHookFromClaudeCode

**searched for:** `translateHookFromClaudeCode`, reverse map

**found:** function exists, uses inline reverse logic

**blueprint proposes:** extend reverse map to handle PreCompact/PostCompact

**verdict: EXTENDS EXTANT** — just an update to extant reverse translation

---

## duplicate mechanism check

### duplicate 1: EVENT_MAP in del method

**location:** `genBrainHooksAdapterForClaudeCode.ts:159-163`

**what it does:** replicates EVENT_MAP for bucket lookup

**is this a new duplicate?** no — the duplicate already exists in current code

**blueprint note:** the duplicate exists. r3 YAGNI review noted: "to extract it to shared constant would be 'while we're here' DRY — not requested"

**verdict: EXTANT DUPLICATE** — we did not create it; blueprint keeps it inline per YAGNI

---

## new mechanisms analysis

| mechanism | status | justification |
|-----------|--------|---------------|
| EVENT_MAP | EXTENDS EXTANT | already exists, we add logic |
| BOOT_EVENTS array | NEW (inline) | minimal, for usecase.5 wildcard |
| return type array | EXTENDS EXTANT | same function, different return |
| reverse map extension | EXTENDS EXTANT | add cases to extant logic |

**total new mechanisms:** 1 (inline array for wildcard)

**verdict: MINIMAL** — one inline array is acceptable for explicit wildcard requirement

---

## consistency check

### pattern: filter.what interpretation

**extant pattern:** onTool uses filter.what as matcher

**proposed pattern:** onBoot uses filter.what as event selector

**verdict: CONSISTENT DIVERGENCE** — same field, different interpretation per event type; documented in blueprint

### pattern: return type

**extant pattern:** translateHookToClaudeCode returns single object

**proposed pattern:** returns array

**verdict: BREAKING CHANGE** — but necessary for wildcard; all callers updated

---

## lessons

### lesson 1: extend before create

the blueprint extends extant mechanisms rather than create new ones:
- EVENT_MAP → add logic, not new map
- translateHookToClaudeCode → change return type, not new function
- reverse translation → add cases, not new function

this minimizes surface area and maximizes familiarity.

### lesson 2: inline arrays are acceptable

the BOOT_EVENTS inline array `['SessionStart', 'PreCompact', 'PostCompact']` is new, but:
- used in one place (wildcard expansion)
- explicit requirement (usecase.5)
- not a reusable abstraction

named constants are for shared values; this is single-use.

### lesson 3: extant duplicates stay extant

the duplicate EVENT_MAP in del was not created by this blueprint. to extract it would be scope creep. the blueprint correctly leaves it as-is.

### lesson 4: breaking changes require caller updates

the return type change from single to array affects:
- `genBrainHooksAdapterForClaudeCode.upsert` (destructure → iteration)
- `genBrainHooksAdapterForClaudeCode.del` (event lookup)

blueprint notes both. breaking changes are acceptable when:
1. explicitly required (wildcard)
2. all callers are updated
3. internal to module (not public API)

---

## final verdict

| question | answer |
|----------|--------|
| did we create new mechanisms? | 1 inline array |
| did we duplicate extant mechanisms? | no (duplicate already existed) |
| did we extend extant mechanisms? | yes (EVENT_MAP, return type, reverse map) |
| is the new mechanism justified? | yes (usecase.5 wildcard requirement) |

**overall verdict: CONSISTENT** — blueprint extends extant mechanisms with minimal new code.
