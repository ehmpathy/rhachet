# self-review r5: has-pruned-yagni

## the question

did we add components "for future flexibility" or "while we're here"? prune any YAGNI violations.

---

## components traced to requirements

| component | requirement source | minimum viable? |
|-----------|-------------------|-----------------|
| invokeBrainsAuth.ts | exchange boundaries | yes — dispatches get |
| invokeEnroll.ts (--auth) | usecase.1 | yes — one flag |
| BrainAuthSpec.ts | spec type | yes — Words/Shape types |
| BrainAuthCapacity.ts | usecase.4 | yes — 5 fields needed |
| BrainAuthCapacityDao.ts | usecase.4 line 133 | yes — get.one/all only |
| BrainAuthAdapterDao.ts | vision BrainAuthAdapter | yes — get/set/del |
| BrainAuthAdapter.ts | vision lines 525-528 | yes — slug/dao/capacity |
| asBrainAuthSpecShape.ts | spec parse | yes — input words, output shape |
| asBrainAuthTokenSlugs.ts | token extract | yes — parse source |
| getOneBrainAuthCredentialBySpec.ts | core rotation | yes — stateless query |
| genApiKeyHelperCommand.ts | enrollment | yes — format string |
| enrollBrainCli.ts extension | vision enrollment | yes — add apiKeyHelper |

---

## YAGNI violations found

none

---

## why it holds

### BrainAuthCapacity.left field

`left` field could be computed as `limit - used` on demand. kept because:
- criteria usecase.4 says "token B has 50 calls left"
- explicit field aids readability of orchestrator flow
- domain object encapsulates computation
- not premature optimization — it's domain model

### capacity DAO readonly (no set/del)

BrainAuthCapacityDao has only get methods. this is correct because:
- capacity is owned by brain supplier, not rhachet
- rhachet queries capacity, never mutates it
- inversion of control — brain knows its own limits

### adapter pattern (not simpler direct approach)

could skip adapter and hardcode claude-code capacity logic. adapter is correct because:
- vision explicitly requires BrainAuthAdapter contract
- enables multiple brain suppliers (generic solution)
- follows BrainHooksAdapter pattern in codebase

### no status command in blueprint

blueprint does not include status command. this is correct because:
- criteria exchange boundaries have `get` and exhaustion error
- status was flagged in earlier review for possible deferral
- get + exhaustion error is sufficient for spike

---

## summary

| category | count |
|----------|-------|
| components reviewed | 12 |
| YAGNI violations | 0 |
| kept with note | 0 |

**result**: zero YAGNI violations. all components trace to requirements. adapter pattern is required by vision, not premature abstraction.
