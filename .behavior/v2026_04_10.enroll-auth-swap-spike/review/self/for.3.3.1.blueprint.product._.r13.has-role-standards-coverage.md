# self-review r13: has-role-standards-coverage

## review findings

### artifacts reviewed

1. **blueprint yield** (3.3.1.blueprint.product.yield.md) — the implementation plan
2. **mechanic briefs** (role=mechanic/briefs/) — the role standards
3. **r12 adherance review** (r12.has-role-standards-adherance.md) — prior adherance check

### methodology

coverage review differs from adherance review:
- **adherance** asks: does the blueprint follow each standard correctly?
- **coverage** asks: are any standards that should be present, absent?

for each briefs category:
1. enumerate standards in that category
2. check whether blueprint has a mechanism that addresses that standard
3. mark as covered, not applicable, or gap
4. if gap found, fix before continue

---

## issues found and fixed

### issue 1: state-file terminology in prior review

**found**: prior review referenced old design (`BrainAuthState`, `getBrainAuthState`, `setBrainAuthState`, `activeTokenKey`, etc.)

**problem**: blueprint evolved to stateless adapter-based design; old terminology was inaccurate

**fix**: updated all terminology to match stateless design:
- `BrainAuthState` → `BrainAuthCapacity`
- `getBrainAuthState`, `setBrainAuthState` → capacity queries via adapter
- `activeTokenKey` → capacity-based selection
- `isBrainAuthTokenRateLimited` → `left === 0` check

### issue 2: insufficient mechanism-to-standard tracing

**found**: prior review had coverage tables but lacked explicit mechanism tracing

**problem**: "covered? yes" without showing which blueprint mechanism addresses the standard is not verifiable

**fix**: each coverage check now includes:
- specific blueprint mechanism that addresses the standard
- why that mechanism satisfies the standard's intent

---

## the question

does the blueprint cover all relevant mechanic role standards? not "are they done correctly" — but "are any patterns that should be present, absent?"

---

## design evolution note

the vision described a state file approach. the blueprint evolved to **stateless adapter-based design**:

| component | role |
|-----------|------|
| `BrainAuthAdapter` | adapter contract with `{ slug, dao, capacity }` |
| `BrainAuthCapacityDao` | readonly capacity queries (`get.one`, `get.all`) |
| `BrainAuthCapacity` | domain object with `{ authSlug, used, limit, left, refreshAt }` |
| `BrainAuthAdapterDao` | adapter persistence (`get.one`, `set.findsert`, `set.upsert`, `del`) |

---

## coverage check: lang.terms

### standards

| standard | intent |
|----------|--------|
| treestruct | names follow [verb][...noun] |
| ubiqlang | canonical terms, no synonyms |
| gerunds | no -ing nouns |
| noun_adj | [noun][adj] order |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| treestruct | `getOneBrainAuthCredentialBySpec` = [get][BrainAuth][Best] | verb first, domain hierarchy follows |
| treestruct | `asBrainAuthSpecShape` = [as][BrainAuth][Spec][Shape] | verb first, domain hierarchy follows |
| treestruct | `genApiKeyHelperCommand` = [gen][ApiKeyHelper][Command] | verb first, output type follows |
| ubiqlang | `capacity` = usage status | distinct from `adapter` (contract) |
| ubiqlang | `specWords` vs `specShape` | raw string vs parsed structure — no overload |
| gerunds | all names scanned | no -ing nouns detected |
| noun_adj | `BrainAuthCapacity` | [domain][concept] |

**coverage complete**: every operation and domain object follows term conventions.

---

## coverage check: lang.tones

### standards

| standard | intent |
|----------|--------|
| lowercase | lowercase prose |
| buzzwords | no semantic diffusion |
| shouts | no ALL_CAPS except constants |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| lowercase | blueprint prose | all prose lowercase |
| buzzwords | no "scalable", "robust", etc. | technical terms only |
| shouts | `CLAUDE_CODE_OAUTH_TOKEN` | env var constant, appropriate |

**coverage complete**: tone conventions apply to blueprint prose.

---

## coverage check: evolvable.architecture

### standards

| standard | intent |
|----------|--------|
| wet-over-dry | tolerate duplication until 3+ usages |
| bounded-contexts | domains own their logic |
| ddd | use domain objects for business concepts |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| wet-over-dry | brains auth is single usecase | no premature abstractions |
| bounded-contexts | brains auth owns rotation | keyrack owns storage, enrollment owns integration |
| ddd | `BrainAuthCapacity extends DomainLiteral` | value object for capacity status |
| ddd | `BrainAuthAdapter` interface | contract pattern for adapter |

**coverage complete**: architecture standards addressed. adapter pattern follows `BrainHooksAdapter` precedent.

---

## coverage check: evolvable.domain.objects

### standards

| standard | intent |
|----------|--------|
| nullable | nullable needs domain reason |
| undefined | no undefined attributes |
| immutable-refs | refs are immutable |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| nullable | `refreshAt: IsoTimeStamp \| null` | null = "not applicable" (token has capacity) |
| undefined | `BrainAuthCapacity` attributes | all explicit: `authSlug`, `used`, `limit`, `left`, `refreshAt` |
| immutable-refs | `authSlug` | immutable identifier for token |

**coverage complete**: `BrainAuthCapacity` follows `DomainLiteral` pattern with explicit typed attributes.

---

## coverage check: evolvable.domain.operations

### standards

| standard | intent |
|----------|--------|
| get-set-gen | use exactly one verb |
| compute-imagine | prefix for compute vs probabilistic |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| get-set-gen | `getOneBrainAuthCredentialBySpec` | get = retrieve/compute |
| get-set-gen | `genApiKeyHelperCommand` | gen = generate output |
| get-set-gen | `BrainAuthCapacityDao.get.one` | get = retrieve |
| get-set-gen | `BrainAuthCapacityDao.get.all` | get = retrieve all |
| get-set-gen | `BrainAuthAdapterDao.set.findsert` | set = mutation |
| get-set-gen | `BrainAuthAdapterDao.set.upsert` | set = mutation |
| get-set-gen | `BrainAuthAdapterDao.del` | del = deletion |
| compute-imagine | no imagine operations | no probabilistic logic in this blueprint |

**coverage complete**: all operations use correct verb prefixes.

---

## coverage check: evolvable.procedures

### standards

| standard | intent |
|----------|--------|
| input-context | (input, context?) pattern |
| arrow-only | no function keyword |
| clear-contracts | declare behavior shape |
| di | dependencies via context |
| hook-wrapper | wrap procedures with hooks |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| input-context | `getOneBrainAuthCredentialBySpec({ specWords }, { brainAuthAdapter, keyrack })` | input first, context second |
| arrow-only | arrow syntax in samples | no function keyword |
| clear-contracts | typed input/output on each operation | behavior shape explicit |
| di | `brainAuthAdapter` in context | adapter injected, not imported |
| di | `keyrack` in context | keyrack injected, not imported |
| hook-wrapper | n/a | no cross-cut concerns at this layer |

**coverage complete**: procedure standards addressed.

---

## coverage check: evolvable.repo.structure

### standards

| standard | intent |
|----------|--------|
| barrel-exports | no index.ts re-exports |
| index-ts | only for entrypoints or daos |
| directional-deps | lower layers don't import higher |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| barrel-exports | no index.ts in brain.auth/ | individual exports |
| index-ts | daos have index.ts | dao pattern allows index |
| directional-deps | contract → operations → objects | no upward imports |

**coverage complete**: repo structure standards addressed.

---

## coverage check: pitofsuccess.errors

### standards

| standard | intent |
|----------|--------|
| failfast | guard invalid state early |
| failloud | errors with context |
| failhide | no swallowed errors |
| exit-codes | 0, 1, 2 semantics |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| failfast | `asBrainAuthSpecShape` throws on invalid | parse errors surface at boundary |
| failfast | empty filter result → error | exhaustion detected immediately |
| failloud | error includes spec, tokens tried | context for debugging |
| failhide | keyrack errors propagate | no catch-and-ignore |
| exit-codes | exit 2 for exhausted | constraint error (user must wait or add tokens) |
| exit-codes | exit 2 for keyrack-locked | constraint error (user must unlock keyrack) |

**coverage complete**: all error paths have semantic exit codes.

---

## coverage check: pitofsuccess.procedures

### standards

| standard | intent |
|----------|--------|
| idempotent | handle twice without double effects |
| undefined-inputs | use null, not undefined |
| nonidempotent-mutations | use findsert/upsert/delete |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| idempotent | `getOneBrainAuthCredentialBySpec` | pure query, no side effects |
| idempotent | `BrainAuthAdapterDao.set.findsert` | returns extant if present |
| idempotent | `BrainAuthAdapterDao.set.upsert` | overwrites to same value |
| idempotent | `BrainAuthAdapterDao.del` | delete absent is no-op |
| undefined-inputs | typed input signatures | all fields explicit |
| nonidempotent-mutations | findsert, upsert, del | no create, insert, add |

**coverage complete**: stateless design means `getOneBrainAuthCredentialBySpec` has no side effects.

---

## coverage check: pitofsuccess.typedefs

### standards

| standard | intent |
|----------|--------|
| shapefit | types must fit |
| as-cast | no as X casts |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| shapefit | `BrainAuthCapacity` typed shape | explicit interface |
| shapefit | `BrainAuthSpecShape` typed shape | explicit interface |
| shapefit | `BrainAuthAdapter` typed shape | explicit interface |
| as-cast | no casts in blueprint | all types fit naturally |

**coverage complete**: typedef standards addressed.

---

## coverage check: readable.comments

### standards

| standard | intent |
|----------|--------|
| what-why-headers | .what/.why on procedures |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| what-why-headers | n/a at blueprint | headers added at implementation |

**not applicable**: this standard applies to implementation, not blueprint.

---

## coverage check: readable.narrative

### standards

| standard | intent |
|----------|--------|
| else-branches | no else |
| named-transformers | extract decode-friction |
| early-returns | guard and return early |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| else-branches | filter + pick pattern | no if/else, filter removes exhausted |
| named-transformers | `asBrainAuthSpecShape` | extracts parse logic |
| named-transformers | `asBrainAuthTokenSlugs` | extracts slug extraction |
| early-returns | capacity filter | `left === 0` tokens eliminated before selection |

**coverage complete**: narrative standards addressed.

---

## coverage check: code.test

### standards

| standard | intent |
|----------|--------|
| given-when-then | bdd test structure |
| coverage-by-grain | correct test types per grain |
| snapshots | acceptance tests snapshot outputs |

### mechanism → standard trace

| standard | blueprint mechanism | why it holds |
|----------|---------------------|--------------|
| given-when-then | test tree uses test-fns | `given`, `when`, `then` blocks |
| coverage-by-grain | transformers → unit | `asBrainAuthSpecShape.test.ts` |
| coverage-by-grain | communicators → integration | `BrainAuthCapacityDao.integration.test.ts` |
| coverage-by-grain | contracts → acceptance | `invokeBrainsAuth.acceptance.test.ts` |
| snapshots | acceptance tests | cli output snapshots declared |

**coverage complete**: test standards addressed.

---

## gap analysis

| category | standards | gaps |
|----------|-----------|------|
| lang.terms | 4 | 0 |
| lang.tones | 3 | 0 |
| evolvable.architecture | 3 | 0 |
| evolvable.domain.objects | 3 | 0 |
| evolvable.domain.operations | 2 | 0 |
| evolvable.procedures | 5 | 0 |
| evolvable.repo.structure | 3 | 0 |
| pitofsuccess.errors | 4 | 0 |
| pitofsuccess.procedures | 3 | 0 |
| pitofsuccess.typedefs | 2 | 0 |
| readable.comments | 1 | 0 (n/a) |
| readable.narrative | 3 | 0 |
| code.test | 3 | 0 |

**total gaps:** 0

---

## summary

### what was checked

- **13 categories** reviewed
- **39 standards** traced to blueprint mechanisms
- **0 coverage gaps** found
- **1 standard** not applicable at blueprint stage (what-why-headers)

### why coverage is complete

every mechanic role standard that applies to a blueprint has a corresponding mechanism:

| standard area | mechanism |
|--------------|-----------|
| term conventions | operation names, domain object names |
| architecture | adapter pattern, bounded contexts |
| domain objects | `BrainAuthCapacity`, `BrainAuthSpecShape` |
| operations | `getOneBrainAuthCredentialBySpec`, `genApiKeyHelperCommand`, dao methods |
| procedures | input-context pattern, dependency injection |
| errors | failfast at parse, exit code 2 for constraints |
| tests | coverage by grain, snapshots |

**result:** the stateless adapter-based design (`BrainAuthAdapter`, `BrainAuthCapacity`, `BrainAuthCapacityDao`) has complete coverage of mechanic role standards. no absent patterns that should be present.
