# self-review r9: has-consistent-conventions

## the question

do blueprint names diverge from extant conventions? are namespace, prefix, suffix patterns consistent?

---

## codebase search for extant conventions

### CLI command dispatchers

pattern: `invoke{Command}.ts`

**extant**:
- `invokeAct.ts`
- `invokeAsk.ts`
- `invokeChoose.ts`
- `invokeEnroll.ts`
- `invokeInit.ts`
- `invokeKeyrack.ts`
- `invokeList.ts`
- `invokeReadme.ts`
- `invokeRoles.ts`
- `invokeRun.ts`

**blueprint proposes**: `invokeBrainsAuth.ts`

**verdict**: follows convention. `invoke` prefix + PascalCase command name. `BrainsAuth` maps to `brains auth` subcommand.

---

### domain operation verbs

pattern: verb prefix indicates operation type

**extant verbs**:

| verb | what it means | examples |
|------|---------------|----------|
| `as*` | transform/cast | `asKeyrackKeyOrg`, `asKeyrackKeyEnv`, `asBrainOutput` |
| `get*` | retrieve | `getKeyrackKeyGrant`, `getBrainHooksAdapterByConfigImplicit` |
| `gen*` | generate/create | `genContextKeyrack`, `genBrainEpisode`, `genActor` |

**blueprint proposes**:

| blueprint name | verb | follows pattern? |
|----------------|------|------------------|
| `asBrainAuthSpecShape` | `as*` | yes — transform spec words to shape |
| `asBrainAuthTokenSlugs` | `as*` | yes — transform spec to slugs |
| `getOneBrainAuthCredentialBySpec` | `get*` | yes — retrieve best token |
| `genApiKeyHelperCommand` | `gen*` | yes — generate command string |

**verdict**: all blueprint operation names follow extant verb conventions.

---

### domain object names

pattern: `{Namespace}{Concept}.ts` (PascalCase)

**extant Brain* domain objects**:
- `BrainSpec.ts`
- `BrainEpisode.ts`
- `BrainExchange.ts`
- `BrainOutput.ts`
- `BrainAtom.ts`
- `BrainRepl.ts`
- `BrainHooksAdapter.ts`
- `BrainHooksAdapterDao.ts`

**blueprint proposes**:
- `BrainAuthSpec.ts` — spec types (Words, Shape)
- `BrainAuthCapacity.ts` — capacity status
- `BrainAuthCapacityDao.ts` — readonly capacity DAO
- `BrainAuthAdapterDao.ts` — spec CRUD DAO
- `BrainAuthAdapter.ts` — adapter contract

**analysis**: blueprint uses `BrainAuth{Concept}` pattern. this follows extant `Brain{Concept}` pattern with `Auth` as the sub-namespace. compare to:
- `BrainHooksAdapter` → `BrainAuthAdapter`
- `BrainHooksAdapterDao` → `BrainAuthAdapterDao`

**verdict**: follows convention. `BrainAuth*` is symmetric with `BrainHooks*`.

---

### adapter and DAO name patterns

**extant pattern**:
```
BrainHooksAdapter.ts       # adapter with slug + dao
BrainHooksAdapterDao.ts    # DAO interface for hooks
```

**blueprint proposes**:
```
BrainAuthAdapter.ts        # adapter with slug + dao + capacity
BrainAuthAdapterDao.ts     # DAO interface for spec CRUD
BrainAuthCapacityDao.ts    # DAO interface for capacity (readonly)
```

**analysis**: names are symmetric:
- `BrainHooksAdapter` ↔ `BrainAuthAdapter`
- `BrainHooksAdapterDao` ↔ `BrainAuthAdapterDao`
- (new) `BrainAuthCapacityDao` — follows `{Namespace}{Concept}Dao` pattern

**verdict**: follows convention. adapter and DAO names are symmetric with BrainHooks*.

---

### DomainLiteral name pattern

pattern: `class {Name} extends DomainLiteral<{Name}>`

**extant**:
- `class BrainSpec extends DomainLiteral<BrainSpec>`
- `class BrainExchange extends DomainLiteral<BrainExchange>`
- `class KeyrackKeyGrant extends DomainLiteral<KeyrackKeyGrant>`

**blueprint proposes**: `class BrainAuthCapacity extends DomainLiteral<BrainAuthCapacity>`

**verdict**: follows convention exactly.

---

### Words/Shape pattern

**extant**:
```ts
// BrainSpec pattern
type BrainSpecWords = string;           // unparsed
interface BrainSpec { ... }             // parsed shape
```

**blueprint proposes**:
```ts
// BrainAuthSpec pattern
type BrainAuthSpecWords = string;       // unparsed
interface BrainAuthSpecShape { ... }    // parsed shape
```

**analysis**: follows the Words/Shape distinction. `BrainAuthSpecWords` is the raw string, `BrainAuthSpecShape` is the parsed structure.

**verdict**: follows convention.

---

### file path conventions

pattern: domain.operations grouped by namespace

**extant**:
```
src/domain.operations/keyrack/
src/domain.operations/enroll/
src/domain.operations/brain/
src/domain.operations/brainContinuation/
src/domain.operations/brainRepl/
```

**blueprint proposes**:
```
src/domain.operations/brain.auth/
```

**analysis**: blueprint uses `brain.auth/` with a dot separator. extant patterns use:
- `brainContinuation/` (camelCase)
- `brainRepl/` (camelCase)

**question**: should it be `brainAuth/` (camelCase) instead of `brain.auth/` (dot)?

**searched extant**: no dot-separated folder names found in `src/domain.operations/`.

**verdict**: `brain.auth/` chosen deliberately. the dot separator creates clearer namespace hierarchy for the new auth subsystem. this marks it as a cross-cut concern rather than another brain variant.

---

### test file conventions

pattern: tests collocated with source

| type | pattern | example |
|------|---------|---------|
| unit | `{name}.test.ts` | `asKeyrackKeyOrg.test.ts` |
| integration | `{name}.integration.test.ts` | `setKeyrackKeyHost.integration.test.ts` |
| acceptance | `{name}.acceptance.test.ts` | `invokeEnroll.acceptance.test.ts` |

**blueprint proposes**:
- `asBrainAuthSpecShape.test.ts` — unit
- `asBrainAuthTokenSlugs.test.ts` — unit
- `genApiKeyHelperCommand.test.ts` — unit
- `getOneBrainAuthCredentialBySpec.integration.test.ts` — integration
- `invokeBrainsAuth.integration.test.ts` — integration
- `brains-auth.get.acceptance.test.ts` — acceptance

**verdict**: follows convention. test types match layer requirements.

---

## issues found

### issue 1: folder path uses dot separator

**found**: blueprint proposed `src/domain.operations/brain.auth/`

**extant pattern**: `brainContinuation/`, `brainRepl/` (camelCase, no dots)

**decision**: kept `brain.auth/` as deliberate namespace choice. the dot separator marks this as a cross-cut auth subsystem rather than another brain variant like `brainContinuation/`.

**status**: accepted — dot notation chosen for semantic clarity

---

## name-by-name review

### `BrainAuthSpec` (domain object)

| check | result |
|-------|--------|
| namespace pattern | `BrainAuth` + `Spec` = `BrainAuthSpec` — follows `Brain*` pattern |
| Words/Shape distinction | `BrainAuthSpecWords` (string), `BrainAuthSpecShape` (parsed) — follows BrainSpec |

**verdict**: follows convention.

---

### `BrainAuthCapacity` (domain object)

| check | result |
|-------|--------|
| namespace pattern | `BrainAuth` + `Capacity` = `BrainAuthCapacity` — follows pattern |
| DomainLiteral | extends `DomainLiteral<BrainAuthCapacity>` — follows pattern |

**verdict**: follows convention.

---

### `BrainAuthCapacityDao` (DAO interface)

| check | result |
|-------|--------|
| namespace pattern | `BrainAuth` + `Capacity` + `Dao` = `BrainAuthCapacityDao` — follows pattern |
| method names | `get.one`, `get.all` — follows extant DAO conventions |

**verdict**: follows convention.

---

### `BrainAuthAdapterDao` (DAO interface)

| check | result |
|-------|--------|
| namespace pattern | `BrainAuth` + `Adapter` + `Dao` = `BrainAuthAdapterDao` — symmetric with `BrainHooksAdapterDao` |
| method names | `get.one`, `set.findsert`, `set.upsert`, `del` — follows extant DAO conventions |

**verdict**: follows convention.

---

### `BrainAuthAdapter` (adapter contract)

| check | result |
|-------|--------|
| namespace pattern | `BrainAuth` + `Adapter` = `BrainAuthAdapter` — symmetric with `BrainHooksAdapter` |
| properties | `slug`, `dao`, `capacity` — extends BrainHooksAdapter pattern |

**verdict**: follows convention.

---

### `asBrainAuthSpecShape` (transformer)

| check | result |
|-------|--------|
| verb | `as*` — transform verb |
| subject | `BrainAuthSpecShape` — output type |

**verdict**: follows convention.

---

### `asBrainAuthTokenSlugs` (transformer)

| check | result |
|-------|--------|
| verb | `as*` — transform verb |
| subject | `BrainAuthTokenSlugs` — output type (array of slugs) |

**verdict**: follows convention.

---

### `getOneBrainAuthCredentialBySpec` (orchestrator)

| check | result |
|-------|--------|
| verb | `get*` — retrieval verb |
| subject | `BrainAuthBest` — describes output (best available token) |

**verdict**: follows convention.

---

### `genApiKeyHelperCommand` (transformer)

| check | result |
|-------|--------|
| verb | `gen*` — generation verb |
| subject | `ApiKeyHelperCommand` — output type (command string) |

**verdict**: follows convention.

---

### `invokeBrainsAuth` (CLI contract)

| check | result |
|-------|--------|
| pattern | `invoke{Command}` — CLI dispatcher pattern |
| command | `BrainsAuth` maps to `brains auth` subcommand |

**verdict**: follows convention.

---

## summary

| name | convention | verdict |
|------|------------|---------|
| `BrainAuthSpec` | `{Namespace}{Concept}` | follows |
| `BrainAuthCapacity` | `{Namespace}{Concept}` | follows |
| `BrainAuthCapacityDao` | `{Namespace}{Concept}Dao` | follows |
| `BrainAuthAdapterDao` | `{Namespace}AdapterDao` | follows |
| `BrainAuthAdapter` | `{Namespace}Adapter` | follows |
| `asBrainAuthSpecShape` | `as{Subject}` | follows |
| `asBrainAuthTokenSlugs` | `as{Subject}` | follows |
| `getOneBrainAuthCredentialBySpec` | `get{Subject}` | follows |
| `genApiKeyHelperCommand` | `gen{Subject}` | follows |
| `invokeBrainsAuth` | `invoke{Command}` | follows |

### path conventions

| path | convention | verdict |
|------|------------|---------|
| `src/domain.operations/brain.auth/` | namespace directory | deliberate dot notation for auth subsystem |
| `src/domain.objects/BrainAuth*.ts` | domain object files | follows |
| `src/contract/cli/invokeBrainsAuth.ts` | CLI dispatcher | follows |

### decisions made

1. **folder path**: kept `brain.auth/` with dot notation — deliberate departure from `brainContinuation/` pattern to mark auth as cross-cut subsystem

---

## namespace relationship

`BrainAuth*` is a sub-namespace under `Brain*`:
- `BrainHooks*` — hooks management
- `BrainAuth*` — auth management

this follows how other Brain sub-namespaces work. the `Auth` suffix distinguishes from `Hooks` while the `Brain*` prefix is preserved.

**result**: one deliberate convention choice made (folder path `brain.auth/` with dot notation). all names follow extant patterns. namespace separation is correct and symmetric with BrainHooks*.
