# self-review r2: has-questioned-deletables

## features questioned

### feature: brains auth namespace (invokeBrainsAuth.ts)
- **traces to criteria?** YES — exchange boundaries require `get` and `status` commands
- **explicitly asked?** YES — vision says "enable brains to automatically swap to best auth"
- **assumed?** NO
- **verdict**: KEEP

### feature: enrollment extension (--auth flag)
- **traces to criteria?** YES — usecase.1 "rhx enroll with --auth spec"
- **explicitly asked?** YES — vision asks "when we rhx enroll, could we wrap on that auth swap?"
- **assumed?** NO
- **verdict**: KEEP

### feature: rotation state (state file)
- **traces to criteria?** YES — usecase.2 requires "state file records rate-limited"
- **explicitly asked?** YES — vision says "automatically rotate when hits limit"
- **assumed?** NO
- **verdict**: KEEP

### feature: get operation (getBrainAuthBest)
- **traces to criteria?** YES — exchange boundaries require `get` command
- **explicitly asked?** YES — core to the wish
- **assumed?** NO
- **verdict**: KEEP

### feature: status command
- **traces to criteria?** YES — exchange boundaries list it
- **explicitly asked?** NO — not in vision, added in criteria phase
- **assumed?** PARTIALLY — useful for debug of pool state
- **question**: is status command necessary for spike?
- **verdict**: FLAG for wisher — status may be deferred to post-spike if not needed for core flow

---

## components questioned

### component: asBrainAuthSpecShape.ts (transformer)
- **can be removed?** NO — must parse spec words to shape
- **if deleted, add back?** YES — core parse logic
- **simplest version?** already simple: input words, output shape
- **verdict**: KEEP

### component: asBrainAuthSpecWords.ts (transformer)
- **can be removed?** NO — must format shape to words for settings.json
- **if deleted, add back?** YES — needed for apiKeyHelper command
- **simplest version?** already simple: input shape, output words
- **verdict**: KEEP

### component: asBrainAuthTokenSlugs.ts (transformer)
- **can be removed?** NO — must extract token slugs from spec source
- **if deleted, add back?** YES — core keyrack lookup
- **simplest version?** already simple: parse source, output slugs
- **verdict**: KEEP

### component: isBrainAuthTokenRateLimited.ts (transformer)
- **can be removed?** NO — must check if token is in cooldown
- **if deleted, add back?** YES — core rotation logic
- **simplest version?** already simple: compare timestamps
- **verdict**: KEEP

### component: getBrainAuthState.ts (communicator)
- **can be removed?** NO — must read state file
- **if deleted, add back?** YES — state persistence required
- **simplest version?** already simple: read JSON file
- **verdict**: KEEP

### component: setBrainAuthState.ts (communicator)
- **can be removed?** NO — must write state file
- **if deleted, add back?** YES — state persistence required
- **simplest version?** already simple: write JSON file
- **verdict**: KEEP

### component: getBrainAuthBest.ts (orchestrator)
- **can be removed?** NO — core rotation orchestration
- **if deleted, add back?** YES — this IS the feature
- **simplest version?** could simplify: skip round-robin, just iterate from 0 each time?
- **question**: is round-robin continuation from activeTokenKey necessary?
- **analysis**: round-robin minimizes unnecessary rotations — if token 2 is active and healthy, we should return it first, not scan from 1. this is correct behavior.
- **verdict**: KEEP as designed

### component: genApiKeyHelperCommand.ts (transformer)
- **can be removed?** NO — must generate the helper command for claude settings
- **if deleted, add back?** YES — enrollment integration required
- **simplest version?** already simple: format string with URI
- **verdict**: KEEP

### component: BrainAuthState.ts (domain object)
- **can be removed?** NO — defines state shape
- **if deleted, add back?** YES — state shape needed for type safety
- **simplest version?** could inline in communicators?
- **analysis**: separate domain object follows arch:domain-driven-design
- **verdict**: KEEP

### component: BrainAuthSpec.ts (domain object)
- **can be removed?** NO — defines Words/Shape union type
- **if deleted, add back?** YES — type safety for spec transformations
- **simplest version?** already minimal: Words, Shape, union
- **verdict**: KEEP

---

## deletions applied

### BrainAuthConfig.ts → NOT NEEDED
- **reason**: specHash can be computed on demand from auth spec hash
- **how fixed**: never added to blueprint — operations receive `{ spec: BrainAuthSpecWords }` directly
- **what we questioned**: is a separate config object needed?
- **answer**: NO — spec words contain all info, specHash computed on demand

---

## simplifications applied

none beyond AuthPoolConfig deletion

---

## open questions for wisher

### question: status command in spike?
- **feature**: `npx rhachet brains auth status` command
- **traces to**: exchange boundaries (criteria-level)
- **analysis**: useful for debug, but not required for core rotation flow
- **recommendation**: keep in spike — debug aid is valuable
- **deferred?**: NO — keep as is, low cost

---

## summary

| category | count |
|----------|-------|
| features reviewed | 5 |
| features kept | 5 |
| features flagged | 1 (status — kept with note) |
| components reviewed | 9 |
| components kept | 9 |
| components avoided | 1 (BrainAuthConfig — never added) |

**result**: all components trace to requirements. no unnecessary components added. status command flagged but kept for debug value.
