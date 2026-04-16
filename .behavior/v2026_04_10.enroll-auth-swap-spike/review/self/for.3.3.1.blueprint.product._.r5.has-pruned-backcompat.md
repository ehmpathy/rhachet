# self-review r6: has-pruned-backcompat

## the question

did we add backwards compatibility that was not explicitly requested? prune any unnecessary backcompat.

---

## backwards compatibility concerns reviewed

### concern 1: extant `rhx enroll` behavior

**what**: invokeEnroll.ts adds `--auth` flag
**backwards compat?**: YES — `--auth` is optional, extant behavior preserved
**explicitly requested?**: NO — not mentioned as concern in vision
**evidence needed?**: NO — additive change, not a break
**analysis**: optional flag addition is not backcompat concern — extant callers unaffected
**verdict**: NOT A BACKCOMPAT ISSUE — this is just an extension

### concern 2: keyrack SDK unchanged

**what**: blueprint uses keyrack.get() without modification
**backwards compat?**: NO — we consume keyrack, we don't change it
**explicitly requested?**: N/A
**verdict**: NOT A BACKCOMPAT ISSUE — we're consumers

### concern 3: BrainAuthAdapter contract

**what**: new adapter interface for brain auth
**backwards compat?**: NEW — no prior contract exists
**explicitly requested?**: N/A
**analysis**: this is new functionality, no prior implementors
**verdict**: NOT A BACKCOMPAT ISSUE — greenfield

### concern 4: CLI output format

**what**: `brains auth get` outputs token or error
**backwards compat?**: NEW — no prior commands exist
**explicitly requested?**: N/A
**analysis**: this is new functionality, no prior users to break
**verdict**: NOT A BACKCOMPAT ISSUE — greenfield

---

## backcompat hacks scanned

scan for patterns like:
- // backwards compat: ...
- // legacy support: ...
- // deprecated: ...
- fallback code for old formats
- re-exports for renamed things
- shims for removed features

### scan result

**none found** — blueprint is greenfield, no backcompat hacks present

---

## why it holds

this blueprint is for **new functionality**:

1. **brains auth namespace** — new CLI commands, no prior version
2. **--auth flag** — additive extension to extant command
3. **BrainAuthAdapter** — new contract, no prior implementors
4. **apiKeyHelper integration** — new configuration, no prior config

there are no users of this feature yet. there is no prior version to be compatible with.

the only "compat" is with extant keyrack, but we **consume** keyrack, we don't **change** it. the design uses keyrack.get() which is stable API.

---

## summary

| category | count |
|----------|-------|
| concerns reviewed | 4 |
| backcompat hacks | 0 |
| open questions | 0 |

**result**: zero backwards compatibility concerns. this is greenfield functionality with no prior users to break.
