# self-review r3: has-questioned-deletables

## the question

try hard to delete before you optimize. for each feature and component, question whether it traces to requirements.

---

## features questioned

### feature 1: brains auth namespace (invokeBrainsAuth.ts)

**traces to criteria?** YES — exchange boundaries require `brains auth get` command (criteria lines 229-246)
**traced to vision?** YES — vision says "enable brains to automatically swap to best auth"
**assumed?** NO — explicitly asked
**verdict**: KEEP

### feature 2: enrollment extension (--auth flag)

**traces to criteria?** YES — usecase.1 "rhx enroll with --auth spec" (criteria line 16)
**traced to vision?** YES — vision asks "when we rhx enroll, could we wrap on that auth swap?"
**assumed?** NO — explicitly asked
**verdict**: KEEP

### feature 3: stateless parallel probe

**traces to criteria?** YES — usecase.4 capacity-based token selection (criteria lines 122-163)
**traced to vision?** YES — "automatically rotate when hits limit"
**assumed?** NO — probe mechanism is the solution to the stated problem
**verdict**: KEEP

### feature 4: brains auth get operation

**traces to criteria?** YES — exchange boundaries "brains auth get" command (criteria lines 229-246)
**traced to vision?** YES — core to the wish "best auth to use based on current usage stats"
**assumed?** NO — explicitly asked
**verdict**: KEEP

---

## components questioned

### component: BrainAuthSpec.ts (domain object)

**can be removed?** NO — defines Words/Shape types for spec parse
**if deleted, add back?** YES — type safety for spec transformations
**verdict**: KEEP — minimal type definition

### component: BrainAuthCapacity.ts (domain object)

**can be removed?** NO — defines capacity status shape
**if deleted, add back?** YES — needed for adapter contract
**verdict**: KEEP — follows DomainLiteral pattern

### component: BrainAuthCapacityDao.ts (interface)

**can be removed?** NO — defines readonly capacity queries
**if deleted, add back?** YES — core adapter contract
**verdict**: KEEP — symmetric with BrainHooksAdapterDao pattern

### component: BrainAuthAdapterDao.ts (interface)

**can be removed?** NO — defines spec CRUD operations
**if deleted, add back?** YES — from vision, adapter must have dao
**verdict**: KEEP — symmetric with BrainHooksAdapterDao

### component: BrainAuthAdapter.ts (adapter contract)

**can be removed?** NO — core abstraction from vision
**if deleted, add back?** YES — enables brain supplier implementations
**verdict**: KEEP — explicitly in vision

### component: asBrainAuthSpecShape.ts (transformer)

**can be removed?** NO — must parse spec words to shape
**if deleted, add back?** YES — core parse logic
**verdict**: KEEP — minimal transformer

### component: asBrainAuthTokenSlugs.ts (transformer)

**can be removed?** NO — must extract token slugs from spec
**if deleted, add back?** YES — core keyrack lookup
**verdict**: KEEP — minimal transformer

### component: getOneBrainAuthCredentialBySpec.ts (orchestrator)

**can be removed?** NO — core rotation orchestration
**if deleted, add back?** YES — this IS the feature
**verdict**: KEEP — explicitly required

### component: genApiKeyHelperCommand.ts (transformer)

**can be removed?** NO — must generate the helper command for claude settings
**if deleted, add back?** YES — enrollment integration required
**verdict**: KEEP — explicitly in vision "how does claude-cli pull auth creds"

### component: invokeBrainsAuth.ts (CLI contract)

**can be removed?** NO — entry point for CLI
**if deleted, add back?** YES — external contract
**verdict**: KEEP — explicitly in criteria exchange boundaries

### component: invokeEnroll.ts extension

**can be removed?** NO — must add --auth flag
**if deleted, add back?** YES — vision asks for enrollment integration
**verdict**: KEEP — explicitly asked

### component: enrollBrainCli.ts extension

**can be removed?** NO — must configure apiKeyHelper in enrollment
**if deleted, add back?** YES — core integration point
**verdict**: KEEP — required for enrollment flow

---

## deletions identified

### BrainAuthConfig.ts → NOT ADDED

**reason**: spec words contain all info, no separate config object needed
**how avoided**: operations receive `{ spec: BrainAuthSpecWords }` directly
**why it holds**: config was never proposed in vision or criteria — would be premature abstraction

### BrainAuthState.ts → NOT ADDED

**reason**: stateless design — capacity queried from adapter, not persisted locally
**how avoided**: blueprint explicitly says "no local state file, capacity queried via BrainAuthAdapter"
**why it holds**: vision wanted "automatically rotate when hits limit" — stateless probe achieves this without local state

### state file operations → NOT ADDED

**reason**: stateless design eliminates need for getBrainAuthState/setBrainAuthState
**how avoided**: capacity is queried from brain adapter on each call
**why it holds**: adapter inversion of control — brain suppliers know their own capacity

---

## why it holds

| component | traces to | justified |
|-----------|-----------|-----------|
| BrainAuthSpec | vision BrainAuthAdapterDao | type for spec |
| BrainAuthCapacity | criteria usecase.4 | capacity status |
| BrainAuthCapacityDao | criteria usecase.4 line 133 | adapter contract |
| BrainAuthAdapterDao | vision BrainAuthAdapter | adapter contract |
| BrainAuthAdapter | vision lines 525-528 | core abstraction |
| asBrainAuthSpecShape | criteria spec parse | transformer |
| asBrainAuthTokenSlugs | criteria token lookup | transformer |
| getOneBrainAuthCredentialBySpec | criteria usecase.4 | orchestrator |
| genApiKeyHelperCommand | vision apiKeyHelper | transformer |
| invokeBrainsAuth | criteria exchange | CLI contract |
| invokeEnroll extension | criteria usecase.1 | CLI contract |
| enrollBrainCli extension | vision enrollment | enrollment |

every component traces to vision or criteria. no assumed components.

---

## summary

| category | count |
|----------|-------|
| features questioned | 4 |
| features kept | 4 |
| features deleted | 0 |
| components questioned | 12 |
| components kept | 12 |
| components avoided | 3 (BrainAuthConfig, BrainAuthState, state ops) |

**result**: all components trace to requirements. three components were avoided by the stateless design decision. no unnecessary components added.
