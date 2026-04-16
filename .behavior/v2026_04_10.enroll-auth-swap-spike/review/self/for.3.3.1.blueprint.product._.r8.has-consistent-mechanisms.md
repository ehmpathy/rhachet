# self-review r8: has-consistent-mechanisms

## the question

do blueprint mechanisms duplicate extant functionality? are they consistent with extant patterns?

---

## codebase search for related patterns

### BrainHooksAdapter pattern

**found**: `src/domain.objects/BrainHooksAdapter.ts` and `src/domain.objects/BrainHooksAdapterDao.ts`

```ts
// BrainHooksAdapter.ts
export interface BrainHooksAdapter {
  slug: string;
  dao: BrainHooksAdapterDao;
}

// BrainHooksAdapterDao.ts
export interface BrainHooksAdapterDao {
  get: {
    one(input: { by: { unique: RefByUnique<typeof BrainHook> } }): Promise<BrainHook | null>;
    all(input?: { by?: PickOne<{ author: string; event: BrainHookEvent; command: string }> }): Promise<BrainHook[]>;
  };
  set: {
    findsert(input: { hook: BrainHook }): Promise<BrainHook>;
    upsert(input: { hook: BrainHook }): Promise<BrainHook>;
  };
  del(input: { by: { unique: RefByUnique<typeof BrainHook> } }): Promise<void>;
}
```

**blueprint pattern comparison**:

```ts
// BrainAuthAdapter (from blueprint)
export interface BrainAuthAdapter {
  slug: string;
  dao: BrainAuthAdapterDao;
  capacity: BrainAuthCapacityDao;  // additional: readonly capacity queries
}

// BrainAuthAdapterDao (from blueprint)
export interface BrainAuthAdapterDao {
  get: { one(): Promise<BrainAuthSpecShape | null> }
  set: { findsert(...), upsert(...) }
  del(): Promise<void>
}

// BrainAuthCapacityDao (from blueprint)
export interface BrainAuthCapacityDao {
  get: {
    one(input: { by: { slug: string } }): Promise<BrainAuthCapacity | null>;
    all(): Promise<BrainAuthCapacity[]>;
  }
}
```

**verdict**: symmetric patterns. BrainAuthAdapter follows BrainHooksAdapter structure:
- both have `slug: string` identifier
- both have `dao` property for CRUD operations
- BrainAuthAdapter adds `capacity` for readonly queries (intentional extension — capacity is owned by brain supplier)

---

### keyrack transformers

**found**: extant transformers in `src/domain.operations/keyrack/`:
- `asKeyrackKeySlug.ts` — construct slug from parts
- `asKeyrackKeyOrg.ts` — extract org from slug
- `asKeyrackKeyEnv.ts` — extract env from slug
- `asKeyrackKeyName.ts` — extract key name from slug

these parse `$org.$env.$keyName` slugs.

**blueprint has**: `asBrainAuthTokenSlugs.ts` — parse `keyrack://owner/env/KEY_*` URI to array of slugs

**question**: does `asBrainAuthTokenSlugs` duplicate extant transformers?

| aspect | extant slug transformers | blueprint URI transformer |
|--------|-------------------------|---------------------------|
| input format | `ehmpathy.test.API_KEY` | `keyrack://ehmpath/prep/KEY_*` |
| separator | `.` (dot) | `/` (slash) |
| glob support | no | yes (via keyrack lookup) |
| output | single string | array of strings |
| purpose | extract component | discover and expand keys |

**verdict**: no duplication. URI format is structurally distinct. extant transformers parse extant slugs; blueprint transformer parses URI and discovers keys. different input formats require different parse logic.

---

### command generation

**searched**: `genCommand|genCmd|generateCommand` → no matches
**searched**: `apiKeyHelper|apikey|helper` → no code generators found

**blueprint has**: `genApiKeyHelperCommand.ts` — format spec into shell command

**verdict**: no duplication. no extant command generation patterns. new transformer provides single source of truth for apiKeyHelper invocation format.

---

### DomainLiteral patterns

**found**: 30+ files use `extends DomainLiteral` pattern in `src/domain.objects/`

**blueprint has**: `BrainAuthCapacity extends DomainLiteral<BrainAuthCapacity>`

**verdict**: follows extant pattern. BrainAuthCapacity uses same DomainLiteral inheritance as BrainSpec, BrainEpisode, and other domain objects.

---

## mechanism-by-mechanism review

### BrainAuthAdapter.ts

**does codebase have this?**: yes — BrainHooksAdapter pattern.

**comparison**:

| aspect | BrainHooksAdapter | BrainAuthAdapter |
|--------|-------------------|------------------|
| slug | yes | yes |
| dao | yes (hooks CRUD) | yes (spec CRUD) |
| capacity | no | yes (readonly) |

**why the additional `capacity` property?**

BrainHooksAdapter manages hooks that rhachet creates and brain stores. CRUD is symmetric.

BrainAuthAdapter has two concerns:
1. spec CRUD — rhachet creates, brain stores (same as hooks)
2. capacity queries — brain owns, rhachet reads (one-way)

the `capacity` property encapsulates readonly access to brain-owned capacity data. this is inversion of control — brain suppliers implement capacity queries.

**verdict**: not duplication. follows BrainHooksAdapter pattern with intentional extension for capacity queries. architectural symmetry maintained.

---

### BrainAuthAdapterDao.ts

**does codebase have this?**: yes — BrainHooksAdapterDao pattern.

**comparison**:

| method | BrainHooksAdapterDao | BrainAuthAdapterDao |
|--------|---------------------|---------------------|
| get.one | yes | yes |
| get.all | yes | no (spec is singular) |
| set.findsert | yes | yes |
| set.upsert | yes | yes |
| del | yes | yes |

**why no `get.all` in BrainAuthAdapterDao?**

BrainHooksAdapterDao has `get.all` because a brain can have multiple hooks (filter by author, event, command).

BrainAuthAdapterDao has only `get.one` because a brain has one auth spec configuration. there is no list of specs — just one current spec.

**verdict**: not duplication. follows BrainHooksAdapterDao pattern with appropriate simplification (singular spec vs multiple hooks). architectural symmetry maintained.

---

### BrainAuthCapacityDao.ts

**does codebase have this?**: no — new DAO for readonly capacity queries.

**why a separate DAO?**

capacity is owned by the brain supplier, not rhachet. the DAO is readonly:
- `get.one` — query capacity for specific slug
- `get.all` — query all capacities

no `set` or `del` — rhachet queries capacity, never mutates it.

**follows extant DAO conventions?**: yes
- method syntax for bivariance
- `get.one` / `get.all` name convention
- Promise return types
- null for absent (not undefined)

**verdict**: new mechanism. follows extant DAO conventions. not duplication — fills specific need (readonly capacity queries).

---

### BrainAuthCapacity.ts

**does codebase have this?**: no — new domain object for capacity status.

**follows extant DomainLiteral pattern?**: yes

```ts
interface BrainAuthCapacity {
  authSlug: string;
  used: number;
  limit: number;
  left: number;
  refreshAt: IsoTimeStamp | null;
}

class BrainAuthCapacity extends DomainLiteral<BrainAuthCapacity> { ... }
```

**verdict**: new mechanism. follows extant DomainLiteral pattern exactly. not duplication.

---

### BrainAuthSpec.ts

**does codebase have this?**: yes — BrainSpec pattern exists.

**comparison**:

| aspect | BrainSpec | BrainAuthSpec |
|--------|-----------|---------------|
| Words type | BrainSpecWords (string) | BrainAuthSpecWords (string) |
| Shape type | BrainSpec (parsed) | BrainAuthSpecShape (parsed) |
| purpose | brain configuration | auth pool configuration |

**follows extant pattern?**: yes — Words/Shape distinction mirrors BrainSpec pattern.

**verdict**: follows extant pattern. not duplication — different domain (auth vs brain config).

---

### asBrainAuthSpecShape.ts

**does codebase have this?**: no extant spec parsers for URI format.

**closest extant**: keyrack slug transformers (but those parse dot-separated slugs, not URIs).

**verdict**: new mechanism. parses URI format distinct from extant slug format. not duplication.

---

### asBrainAuthTokenSlugs.ts

**does codebase have this?**: no.

**closest extant**: keyrack slug transformers extract components from extant slugs. this transformer discovers slugs via glob expansion.

**verdict**: new mechanism. different purpose (discovery vs extraction). not duplication.

---

### getOneBrainAuthCredentialBySpec.ts

**does codebase have this?**: no — no extant "best of N" selection patterns.

**does it reuse extant mechanisms?**: yes!
1. `context.keyrack.get()` — uses keyrack public API for token access
2. `brainAuthAdapter.capacity.get.all()` — uses adapter for capacity queries

**verdict**: new orchestrator. correctly reuses keyrack context and adapter pattern. not duplication.

---

### genApiKeyHelperCommand.ts

**does codebase have this?**: no extant command generation.

**why a dedicated transformer?**

the command format `npx rhachet brains auth get --from $spec --into claude.apiKeyHelper` is a contract. a single source of truth prevents scatter-shot updates if format changes.

**verdict**: new mechanism. provides single source of truth for apiKeyHelper invocation format. not duplication.

---

## keyrack context reuse

**does blueprint correctly reuse keyrack?**: yes.

the orchestrator `getOneBrainAuthCredentialBySpec.ts` receives keyrack via context:

```ts
export const getOneBrainAuthCredentialBySpec = async (
  input: { spec: BrainAuthSpecWords },
  context: { keyrack: ContextKeyrack; brainAuthAdapter: BrainAuthAdapter },
) => {
  // ...
  const tokenResult = await context.keyrack.get({ key: slug });
  // ...
}
```

this is correct:
1. dependency injection via context
2. uses keyrack public API (`get`)
3. no internal import from keyrack files
4. keyrack handles unlock/grant/fetch internally

**verdict**: correct reuse of extant mechanism.

---

## adapter symmetry verification

| adapter | slug | dao | extra |
|---------|------|-----|-------|
| BrainHooksAdapter | yes | BrainHooksAdapterDao | none |
| BrainAuthAdapter | yes | BrainAuthAdapterDao | capacity: BrainAuthCapacityDao |

| dao method | BrainHooksAdapterDao | BrainAuthAdapterDao |
|------------|---------------------|---------------------|
| get.one | yes | yes |
| get.all | yes | no (singular spec) |
| set.findsert | yes | yes |
| set.upsert | yes | yes |
| del | yes | yes |

**architectural symmetry maintained**: BrainAuthAdapter follows BrainHooksAdapter pattern. the additional `capacity` property is an intentional extension for readonly queries.

---

## summary

| mechanism | duplicates extant? | reuses extant? | why not duplicate? |
|-----------|-------------------|----------------|-------------------|
| BrainAuthAdapter | no | yes (pattern) | follows BrainHooksAdapter pattern |
| BrainAuthAdapterDao | no | yes (pattern) | follows BrainHooksAdapterDao pattern |
| BrainAuthCapacityDao | no | yes (conventions) | follows DAO conventions |
| BrainAuthCapacity | no | yes (pattern) | follows DomainLiteral pattern |
| BrainAuthSpec | no | yes (pattern) | follows Words/Shape pattern |
| asBrainAuthSpecShape | no | no | URI format distinct from slug format |
| asBrainAuthTokenSlugs | no | no | discovery vs extraction |
| getOneBrainAuthCredentialBySpec | no | yes (keyrack) | uses keyrack context for token access |
| genApiKeyHelperCommand | no | no | no extant command generation |

**result**: zero duplication of extant mechanisms. correct reuse of extant patterns (BrainHooksAdapter, DomainLiteral, DAO conventions, keyrack context). architectural symmetry maintained between BrainAuthAdapter and BrainHooksAdapter.
