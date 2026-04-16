# self-review: has-consistent-conventions (r3)

review for divergence from extant names and patterns.

---

## conventions analyzed

### 1. domain object names

**extant pattern:** `Brain*` prefix for brain-related domain objects.

found 33 extant files:
- `BrainAtom.ts`, `BrainRepl.ts`, `BrainSpec.ts`, `BrainSlug.ts`
- `BrainCliEnrollmentSpec.ts`, `BrainCliEnrollmentManifest.ts`
- `BrainHook.ts`, `BrainHookEvent.ts`, `BrainHookFilter.ts`
- etc.

**spike names:**
- `BrainAuthSpec.ts` — follows `Brain*Spec` pattern
- `BrainAuthCredential.ts` — follows `Brain*` pattern
- `BrainAuthSupplied.ts` — follows `Brain*` pattern
- `BrainAuthCapacity.ts` — follows `Brain*` pattern
- `BrainAuthError.ts` — follows `Brain*Error` pattern
- `BrainAuthAdapter.ts` — follows `Brain*Adapter` pattern
- `BrainAuthCapacityDao.ts` — follows `Brain*Dao` pattern
- `BrainAuthAdapterDao.ts` — follows `Brain*Dao` pattern

**verdict:** consistent. all spike objects follow `BrainAuth*` pattern.

### 2. transformer names

**extant pattern:** `as*` prefix for transformers.

found 12 files:
- `asKeyrackKeySlug.ts`, `asKeyrackKeyName.ts`, `asKeyrackKeyEnv.ts`, `asKeyrackKeyOrg.ts`
- `asBrainOutput.ts`, `asBrainPlugToolDict.ts`
- `asStitcher.ts`, `asStitcherFlat.ts`
- `asShellEscapedSecret.ts`

**spike names:**
- `asBrainAuthSpecShape.ts` — follows `as*` pattern
- `asBrainAuthTokenSlugs.ts` — follows `as*` pattern

**verdict:** consistent.

### 3. orchestrator names

**extant pattern:** `getOne*By*` for single-item retrieval.

found 2 files:
- `getOneKeyrackGrantByKey.ts`
- `getOneBrainAuthCredentialBySpec.ts` (spike)

**spike names:**
- `getOneBrainAuthCredentialBySpec.ts` — follows `getOne*By*` pattern

**verdict:** consistent.

### 4. CLI handler names

**extant pattern:** `invoke*` prefix for CLI handlers.

found 30+ files:
- `invokeAct.ts`, `invokeAsk.ts`, `invokeInit.ts`
- `invokeKeyrack.ts`, `invokeEnroll.ts`
- `invokeRoles.ts`, `invokeRolesBoot.ts`, `invokeRolesLink.ts`

**spike names:**
- `invokeBrainsAuth.ts` — follows `invoke*` pattern

**verdict:** consistent.

### 5. adapter factory names

**extant pattern:** `gen*Adapter*` for adapter factories.

**spike names:**
- `genBrainAuthAdapterForClaudeCode.ts` — follows `gen*Adapter*` pattern

**verdict:** consistent.

### 6. command generator names

**extant pattern:** `gen*Command` for command string generators.

**spike names:**
- `genApiKeyHelperCommand.ts` — follows `gen*Command` pattern

**verdict:** consistent.

---

## potential issues reviewed

### issue 1: `BrainAuth*` vs `Auth*`

**question:** should objects be `Auth*` instead of `BrainAuth*`?

**answer:** `BrainAuth*` is correct.

the auth is specifically for brain enrollment, not generic auth. `BrainAuthSpec` parallels `BrainCliEnrollmentSpec`. the "Brain" prefix scopes the auth concept to the brain domain.

### issue 2: `*Words` type name

**question:** is `BrainAuthSpecWords` a good name?

**answer:** yes, follows extant pattern.

`*Words` is used elsewhere (e.g., `BrainSlug` is string literal type). `BrainAuthSpecWords` is a string literal union for strategy words.

---

## conclusion

all names follow extant conventions.

| convention | extant pattern | spike usage | verdict |
|------------|---------------|-------------|---------|
| domain objects | `Brain*` | `BrainAuth*` | consistent |
| transformers | `as*` | `asBrainAuth*` | consistent |
| orchestrators | `getOne*By*` | `getOneBrainAuthCredentialBySpec` | consistent |
| CLI handlers | `invoke*` | `invokeBrainsAuth` | consistent |
| adapter factories | `gen*Adapter*` | `genBrainAuthAdapterForClaudeCode` | consistent |
| command generators | `gen*Command` | `genApiKeyHelperCommand` | consistent |

no divergence from extant conventions found.

