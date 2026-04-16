# self-review: has-consistent-mechanisms (r3)

review for new mechanisms that duplicate extant functionality.

---

## search methodology

### search 1: context generation patterns

query: `genContext*` across `src/**/*.ts`

found 74 files with context patterns. key extant patterns:
- `genContextKeyrackGrantGet` — lightweight keyrack context for get operations
- `genContextKeyrack` — full keyrack context with host manifest
- `genContextBrain` — brain context for inference
- `genContextBrainSupplier` — brain supplier context

**assessment:** the spike's `genContextBrainAuth` (in invokeBrainsAuth.ts) composes on `genContextKeyrackGrantGet`. this follows the extant composition pattern where domain contexts wrap infrastructure contexts.

### search 2: slug transformation patterns

query: `asSlug|TokenSlug|KeySlug` across `src/**/*.ts`

found 14 files. key extant patterns:
- `asKeyrackKeySlug` — transforms raw key or full slug to canonical form
- `asKeyrackKeyName` — extracts key name from slug
- `decideIsKeySlugEqual` — compares slugs

**assessment:** the spike's `asBrainAuthTokenSlugs` serves a different purpose — it expands wildcard patterns (`KEY_*`) to all matched slugs. this is not duplication; `asKeyrackKeySlug` handles single-key resolution, not pattern expansion.

### search 3: rotation/selection patterns

query: `roundRobin|round_robin|selectOne|selectNext` across `src/**/*.ts`

found 0 files.

**assessment:** no extant rotation or selection patterns. the spike introduces round-robin selection as new functionality.

### search 4: credential pool patterns

query: `pool|Pool|credentials` across `src/**/*.ts`

found 57 files. examined keyrack files (the credential domain):
- keyrack operations deal with individual credentials
- no extant "pool" concept for credential rotation
- no extant "select best from pool" mechanism

**assessment:** the spike introduces credential pools as new functionality. no duplication.

---

## new mechanisms in the spike

| mechanism | purpose | extant equivalent? | verdict |
|-----------|---------|-------------------|---------|
| `genContextBrainAuth` | compose keyrack context for brain auth | no — composes on extant `genContextKeyrackGrantGet` | reuses extant |
| `asBrainAuthTokenSlugs` | expand wildcard patterns to slugs | no — `asKeyrackKeySlug` is single-key only | new functionality |
| `asBrainAuthSpecShape` | parse auth spec DSL | no — new DSL format | new functionality |
| `genApiKeyHelperCommand` | format claude-code api_key_helper command | no — specific to claude-code | new functionality |
| round-robin selection | rotate through credential pool | no — first rotation mechanism in codebase | new functionality |
| capacity interface | report token usage metrics | no — first capacity tracker | new functionality |

---

## extant mechanisms reused

| extant mechanism | how spike uses it |
|------------------|-------------------|
| `genContextKeyrackGrantGet` | composed into brain auth context |
| `getOneKeyrackGrantByKey` | retrieves individual credentials |
| `BadRequestError` | reports user-fixable errors |
| `UnexpectedCodePathError` | reports code defects |
| `DomainLiteral` | base class for domain objects |
| commander.js patterns | CLI registration follows extant style |

---

## conclusion

no duplication.

the spike introduces new mechanisms for:
1. credential pools (no extant pattern)
2. wildcard expansion (extends single-key to multiple)
3. round-robin rotation (first in codebase)
4. capacity tracker (new concept)

extant mechanisms are reused where applicable (keyrack context, error classes, domain object patterns).

