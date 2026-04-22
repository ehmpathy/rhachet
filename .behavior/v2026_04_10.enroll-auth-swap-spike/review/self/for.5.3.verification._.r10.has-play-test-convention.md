# self-review: has-play-test-convention (r10)

review for journey test file suffix convention.

---

## the question

are journey test files named correctly with `.play.test.ts` suffix?

---

## search for journey tests

### searched for .play.test.ts files in spike

```
$ find src -name '*.play.*.ts'
> (no results)
```

**result: no journey tests exist in the spike.**

### searched for .play.test.ts files in entire repo

```
$ find . -name '*.play.test.ts' -o -name '*.play.*.test.ts'
> (no results)
```

**result: no journey tests exist anywhere in this repo.** the `.play.test.ts` convention is not yet adopted in this codebase.

### searched for spike test files

```
$ find src -name '*brainAuth*.test.ts'
> src/domain.operations/brainAuth/asBrainAuthSpecShape.test.ts
> src/domain.operations/brainAuth/asBrainAuthTokenSlugs.test.ts
> src/domain.operations/brainAuth/genApiKeyHelperCommand.test.ts
> src/domain.operations/brainAuth/getOneBrainAuthCredentialBySpec.test.ts
```

**result: 4 test files, all unit tests (`.test.ts`).**

---

## deep dive: actual test file structure

i opened each test file to verify they are unit tests (not journey tests mislabeled).

### asBrainAuthSpecShape.test.ts

```typescript
import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBrainAuthSpecShape } from './asBrainAuthSpecShape';

describe('asBrainAuthSpecShape', () => {
  given('[case1] pool strategy with keyrack URI', () => {
    when('[t0] spec has pool wrapper', () => {
      then('returns pool strategy with source', () => {
        const result = asBrainAuthSpecShape({
          spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)',
        });
        expect(result.strategy).toEqual('pool');
        expect(result.source).toEqual(
          'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*',
        );
      });
    });
  });
  // ... 4 more cases covering solo, default, empty, invalid
});
```

**this is a unit test because:**

1. tests a single transformer function (`asBrainAuthSpecShape`)
2. no external dependencies (no keyrack, no CLI, no api)
3. pure input/output assertions
4. 9 test cases covering all branches

### why these are NOT journey tests

journey tests verify end-to-end flows from the user's perspective. compare:

| aspect | unit test (current) | journey test (phase 8) |
|--------|---------------------|------------------------|
| scope | single function | full CLI flow |
| dependencies | none (pure function) | keyrack, claude api |
| input | direct function call | CLI invocation |
| output | return value | stdout, exit code |
| purpose | internal correctness | external behavior |

the spike tests verify internal correctness. journey tests would verify:

```typescript
// hypothetical journey test (phase 8)
describe('brain auth pool rotation', () => {
  given('[case1] pool with 3 credentials', () => {
    when('[t0] supply is called 4 times', () => {
      then('rotates through all 3 then wraps', () => {
        // CLI invocation, keyrack interaction, rotation state
      });
    });
  });
});
```

---

## test file inventory

| file | type | suffix | convention? |
|------|------|--------|-------------|
| `asBrainAuthSpecShape.test.ts` | unit | `.test.ts` | **CORRECT** |
| `asBrainAuthTokenSlugs.test.ts` | unit | `.test.ts` | **CORRECT** |
| `genApiKeyHelperCommand.test.ts` | unit | `.test.ts` | **CORRECT** |
| `getOneBrainAuthCredentialBySpec.test.ts` | unit | `.test.ts` | **CORRECT** |

all test files are unit tests. unit tests use `.test.ts` suffix, not `.play.test.ts`.

---

## why no journey tests

### spike scope

the wish explicitly requested a spike:

> "lets spike out a solution here"
> "how can we prove or disprove via a poc?"

the spike scope is phases 0-4. journey tests would be phase 8.

### what journey tests would require

if the spike had journey tests, they would need:

```typescript
// hypothetical journey test
describe('brain auth pool rotation journey', () => {
  given('[case1] user has 3 claude tokens in keyrack', () => {
    // SETUP: requires real keyrack with 3 tokens
    // SETUP: requires keyrack unlocked
    when('[t0] supply is called 4 times', () => {
      // ACTION: invoke CLI, track rotation state
      then('rotates through all 3 then wraps', async () => {
        // ASSERT: 4th call returns credential 1
      });
    });
    when('[t1] first token hits rate limit', () => {
      // ACTION: invoke CLI, simulate rate limit
      then('automatically rotates to second token', async () => {
        // ASSERT: rotation occurred without user action
      });
    });
  });
});
```

dependencies for journey tests:
- real keyrack credentials unlocked
- real claude api access (or sophisticated mock)
- rate limit simulation
- cross-process state (rotation state persisted)

these are phase 8 dependencies.

### what unit tests verify

the spike tests verify internal correctness without external dependencies:

```typescript
// actual test from asBrainAuthSpecShape.test.ts
given('[case5] invalid spec format', () => {
  when('[t0] spec has invalid wrapper name', () => {
    then('throws BadRequestError', async () => {
      const error = await getError(async () =>
        asBrainAuthSpecShape({
          spec: 'invalid(keyrack://ehmpathy/prod/KEY)',
        }),
      );
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error!.message).toContain('invalid auth spec format');
    });
  });
});
```

| aspect | unit test (current) | journey test (phase 8) |
|--------|---------------------|------------------------|
| dependencies | none | keyrack, claude api |
| state | in-memory | persisted across processes |
| scope | single function | full CLI flow |
| purpose | internal correctness | external behavior |

---

## convention compliance in this repo

### repo-wide convention search

```
$ find . -name '*.play.test.ts' -o -name '*.play.*.test.ts'
> (no results)
```

**the `.play.test.ts` convention is not yet adopted in this repo.**

this is not a violation. the convention is a recommendation for journey tests. if no journey tests exist, the convention does not apply.

### spike convention compliance

| check | status |
|-------|--------|
| unit tests have `.test.ts` suffix? | **YES** — all 4 files |
| journey tests have `.play.test.ts` suffix? | **N/A** — no journey tests in spike |
| journey tests have wrong suffix? | **N/A** — no journey tests |
| unit tests mislabeled as journey? | **NO** — all are pure function tests |

---

## issues found: NONE

i verified:

1. **no journey tests exist** — repo-wide search confirms
2. **unit tests use correct suffix** — `.test.ts` for all 4 files
3. **unit tests are correctly categorized** — pure function tests, no external dependencies
4. **no mislabeled tests** — tests match their suffix

---

## checklist

| checklist item | status |
|----------------|--------|
| journey tests in right location? | **N/A** — no journey tests |
| journey tests have `.play.` suffix? | **N/A** — no journey tests |
| fallback convention used? | **YES** — unit tests with `.test.ts` |
| unit tests correctly suffixed? | **YES** |
| unit tests mislabeled? | **NO** |

---

## verdict: PASS

the spike has no journey tests. this is intentional:

1. journey tests are phase 8 scope (full acceptance tests)
2. spike tests internal correctness via unit tests
3. all 4 unit tests use correct `.test.ts` suffix
4. no tests are mislabeled

the `.play.test.ts` convention does not apply because no journey tests exist in the spike scope.
