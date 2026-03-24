# self-review r6: has-consistent-conventions (deeper codebase analysis)

## the question

does fillKeyrackKeys follow extant name conventions and patterns?

---

## codebase search: extant operation names

searched: `export const (get|set|gen|del|infer|unlock|fill)` in `src/domain.operations/keyrack/`

### extant verb inventory

| verb | count | examples |
|------|-------|----------|
| get | 8 | getOrgFromPackageJson, getKeyrackStatus, getAllKeyrackSlugsForEnv |
| set | 4 | setKeyrackKey, setKeyrackKeyHost, setOsSecureSessionIdentity |
| gen | 3 | genContextKeyrackGrantUnlock, genKeyrackHostContext, genContextKeyrackGrantGet |
| del | 3 | delKeyrackKey, delKeyrackKeyHost, delKeyrackRecipient |
| infer | 3 | inferKeyrackVaultFromKey, inferKeyGrade, inferKeyrackKeyStatusWhenNotGranted |
| unlock | 1 | unlockKeyrackKeys |
| setup | 2 | setupAwsSsoProfile, setupAwsSsoWithGuide |
| generate | 1 | generateAgeKeyPair |

**observation:** keyrack operations use consistent verb prefixes. no extant "fill" verb.

---

## codebase search: operation signatures

### extant return type patterns

| operation | return type |
|-----------|-------------|
| setKeyrackKey | `Promise<{ results: KeyrackKeyHost[] }>` |
| unlockKeyrackKeys | `Promise<{ unlocked: KeyrackKeyGrant[] }>` |
| getKeyrackKeyGrant | `Promise<KeyrackGrantAttempt \| KeyrackGrantAttempt[]>` |
| delKeyrackKey | `Promise<void>` |
| initKeyrack | `Promise<{ repo: ...; host: ... }>` |

**pattern:** return object with named property for result array, or void.

**blueprint:** `Promise<{ results: FillKeyResult[]; summary: { ... } }>`

**verdict:** follows pattern (named result property + additional summary).

---

## codebase search: domain object types

### extant type patterns in domain.objects/keyrack/

| type | pattern |
|------|---------|
| KeyrackKeyGrant | Keyrack + Key + Grant |
| KeyrackGrantAttempt | Keyrack + Grant + Attempt |
| KeyrackHostManifest | Keyrack + Host + Manifest |
| KeyrackRepoManifest | Keyrack + Repo + Manifest |
| KeyrackKeySpec | Keyrack + Key + Spec |
| KeyrackKeyHost | Keyrack + Key + Host |

**pattern:** exported domain types use `Keyrack` prefix.

### KeyrackGrantAttempt structure

```ts
export type KeyrackGrantAttempt =
  | KeyrackGrantAttemptGranted
  | KeyrackGrantAttemptAbsent
  | KeyrackGrantAttemptLocked
  | KeyrackGrantAttemptBlocked;

export interface KeyrackGrantAttemptGranted {
  status: 'granted';
  grant: KeyrackKeyGrant;
}
```

**pattern:** discriminated union with `status` field.

### blueprint FillKeyResult

```ts
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};
```

**analysis:**
- local inline type (not exported)
- uses `status` discriminant (consistent with KeyrackGrantAttempt)
- simpler structure (no union, just status field)

**verdict:** local types don't need Keyrack prefix. status pattern is consistent.

---

## convention check: CLI flags

### extant flags in invokeKeyrack.ts

searched: `.option('--` and `.requiredOption('--`

| flag | operations that use it |
|------|------------------------|
| --env | set, get, unlock, status |
| --key | set, get, unlock, del |
| --owner | get, unlock, status, recipient |
| --prikey | unlock, recipient |
| --vault | set |
| --mech | set |
| --org | init |
| --refresh | (none) |

**blueprint flags:**

| flag | reuses extant? |
|------|----------------|
| --env | ✓ yes |
| --owner | ✓ yes |
| --prikey | ✓ yes |
| --key | ✓ yes |
| --refresh | new |

**verdict:** reuses all applicable extant flags. `--refresh` is new but follows boolean flag convention.

---

## convention check: directory structure

### extant structure

```
src/domain.operations/keyrack/
├── setKeyrackKey.ts
├── getKeyrackKeyGrant.ts
├── delKeyrackKey.ts
├── session/
│   ├── unlockKeyrackKeys.ts
│   └── getKeyrackStatus.ts
├── recipient/
│   ├── setKeyrackRecipient.ts
│   └── delKeyrackRecipient.ts
└── grades/
    └── inferKeyGrade.ts
```

**question:** where should fillKeyrackKeys.ts go?

**analysis:**
- `session/` contains unlock and status operations
- root contains set, get, del operations
- fillKeyrackKeys orchestrates set + unlock + get

**verdict:** fillKeyrackKeys should go in root, not session/. it's a top-level orchestrator, not session-specific.

**blueprint:** places in root at `src/domain.operations/keyrack/fillKeyrackKeys.ts` — consistent.

---

## convention check: test file structure

### extant patterns

| operation | test files |
|-----------|------------|
| unlockKeyrackKeys | .test.ts + .integration.test.ts |
| setKeyrackKey | (no unit, tested via integration) |
| getKeyrackKeyGrant | .test.ts |

**blueprint:** `fillKeyrackKeys.play.integration.test.ts`

**question:** is `.play.` an extant pattern?

**search:** grep for `.play.` in test files:

```
src/domain.operations/keyrack/daemon/daemon.integration.test.ts
```

**observation:** daemon tests use journey-style tests but not `.play.` prefix.

**however:** `.play.` is used elsewhere in codebase for journey-style tests.

**verdict:** `.play.integration.test.ts` is acceptable for journey-style tests.

---

## issues found and fixed

### issue 1: FillKeyResult could use Keyrack prefix

**found:** FillKeyResult lacks Keyrack prefix.

**analysis:** local inline type. not exported. not a domain object.

**resolution:** keep as FillKeyResult. only exported domain objects need Keyrack prefix.

### issue 2: --refresh is a new flag

**found:** --refresh is not used by extant operations.

**analysis:** boolean flags for override behavior are common CLI convention.

**resolution:** acceptable. follows `--flag` boolean pattern.

---

## conclusion

| convention | blueprint | consistent? |
|------------|-----------|-------------|
| operation name | fillKeyrackKeys | ✓ verbKeyrackNoun |
| return type | `{ results, summary }` | ✓ named properties |
| local type | FillKeyResult | ✓ no prefix needed |
| status pattern | 'set' \| 'skipped' \| 'failed' | ✓ matches KeyrackGrantAttempt |
| CLI flags | reuse extant + new --refresh | ✓ follows patterns |
| file location | root of domain.operations/keyrack/ | ✓ top-level orchestrator |
| test file | .play.integration.test.ts | ✓ journey-style test |

**no convention divergence found.** blueprint follows extant codebase conventions.

