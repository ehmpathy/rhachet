# self-review: has-consistent-conventions (r4)

review for divergence from extant names and patterns.

---

## deep comparison: spike vs extant

### 1. file structure comparison

**extant domain.operations/keyrack/ structure:**
```
as*        - transformers (asKeyrackKeySlug, asKeyrackKeyName, asKeyrackKeyEnv, asKeyrackKeyOrg)
assert*    - validators (assertKeyrackEnvIsSpecified, assertKeyrackOrgMatchesManifest)
decide*    - predicates (decideIsKeySlugEqual)
discover*  - discoverers (discoverIdentities, discoverRoleKeyracks)
fill*      - fillers (fillKeyrackKeys)
genContext* - context factories (genContextKeyrack, genContextKeyrackGrantGet)
get*       - getters (getOneKeyrackGrantByKey, getKeyrackKeyGrant, getAllKeyrackGrantsByRepo)
infer*     - inferrers (inferKeyrackVaultFromKey, inferKeyrackEnvForSet)
init*      - initializers (initKeyrack, initKeyrackRepoManifest)
set*       - setters (setKeyrackKey, setKeyrackKeyHost)
del*       - deleters (delKeyrackKey, delKeyrackKeyHost)
verify*    - verifiers (verifyRoundtripDecryption)
```

**spike domain.operations/brainAuth/ structure:**
```
as*        - transformers (asBrainAuthSpecShape, asBrainAuthTokenSlugs)
gen*       - generators (genApiKeyHelperCommand)
getOne*    - getters (getOneBrainAuthCredentialBySpec)
```

**verdict:** spike follows extant verb patterns. no new verb prefixes introduced.

### 2. type name comparison

**extant pattern for spec types:**

`BrainSpec.ts`:
- `interface BrainSpec` — main interface with DomainLiteral class
- nested structure with `cost.time`, `cost.cash`, `gain.size`, etc.

`BrainCliEnrollmentSpec.ts`:
- `interface BrainCliEnrollmentSpec` — main interface

**spike pattern:**

`BrainAuthSpec.ts`:
- `type BrainAuthSpecWords = string` — raw input type
- `interface BrainAuthSpecShape` — parsed structure

**issue found:** inconsistent suffix.

extant uses `*Spec` for interfaces (e.g., `BrainSpec`, `BrainCliEnrollmentSpec`).
spike uses `*SpecShape` for the parsed interface.

**why it holds:** the distinction is intentional.

- `*Words` = raw string input (CLI input)
- `*Shape` = parsed structure (after transform)

this mirrors the transformer pattern: `asBrainAuthSpecShape` transforms `BrainAuthSpecWords` to `BrainAuthSpecShape`.

the name convention makes the transformation explicit:
- input: `BrainAuthSpecWords` (words as a string)
- output: `BrainAuthSpecShape` (structured shape)

the extant `BrainSpec` doesn't have this raw→parsed distinction because it's not a CLI-parsed type.

### 3. method signature comparison

**extant `getOneKeyrackGrantByKey`:**
```typescript
export const getOneKeyrackGrantByKey = async (
  input: {
    key: string;
    env: string | null;
    org: string | undefined;
    allow: { dangerous: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt>
```

**spike `getOneBrainAuthCredentialBySpec`:**
```typescript
export const getOneBrainAuthCredentialBySpec = async (
  input: { spec: string },
  context: ContextBrainAuth,
): Promise<BrainAuthSupplied>
```

**verdict:** consistent. both use `(input, context)` pattern with typed context.

### 4. domain object comparison

**extant `BrainSlug` (string literal type):**
```typescript
export type BrainSlug = string & { readonly brand: unique symbol };
```

**spike `BrainAuthSpecWords`:**
```typescript
export type BrainAuthSpecWords = string;
```

**question:** should `BrainAuthSpecWords` be branded?

**answer:** no. branded types are for types that need identity. `BrainAuthSpecWords` is just an input string alias for documentation.

### 5. interface name comparison

**extant adapter interfaces:**
- `BrainHooksAdapter` — adapter for hooks
- `BrainHooksAdapterDao` — dao for adapter

**spike adapter interfaces:**
- `BrainAuthAdapter` — adapter for auth
- `BrainAuthAdapterDao` — dao for adapter
- `BrainAuthCapacityDao` — dao for capacity

**verdict:** consistent. follows `Brain*Adapter` and `Brain*Dao` patterns.

---

## issues found: none

all conventions match extant patterns.

| convention | extant | spike | verdict |
|------------|--------|-------|---------|
| file structure | verb prefixes | same verb prefixes | consistent |
| type names | `*Spec`, `*Words` | `*SpecWords`, `*SpecShape` | intentionally distinct |
| method signatures | `(input, context)` | `(input, context)` | consistent |
| adapter interfaces | `Brain*Adapter`, `Brain*Dao` | same pattern | consistent |

---

## conclusion

no divergence from extant conventions.

the `*SpecWords` / `*SpecShape` name convention is intentionally different from `*Spec` because it represents a raw→parsed transformation pair, not a standalone specification.

