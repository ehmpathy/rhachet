# rule.require.shared-test-fixtures

## .what

test fixture generators (e.g., `genMockedBrainAtom`, `genSampleBrainSpec`) must be generalized into shared test infra, not duplicated inline.

## .why

- **reduces duplication** — same fixture shape used across unit, integration, and acceptance tests
- **single source of truth** — fixture updates propagate to all tests
- **faster test authorship** — import and use, no boilerplate
- **consistent test data** — all tests use the same realistic fixtures

## .where

| test type         | fixture location                                                        |
| ----------------- | ----------------------------------------------------------------------- |
| unit tests        | `src/.test/assets/`                                                     |
| integration tests | `src/.test/assets/`                                                     |
| acceptance tests  | `src/.test/assets/` if applicable, else `accept.blackbox/.test/assets/` |

acceptance tests should import from `src/.test/assets/` (via `@src/` imports) only when the fixture is also relevant for unit or integration tests.

## .when

extract to shared infra when:
- the same fixture shape appears in 2+ test files
- the fixture requires non-trivial setup (domain objects, nested structures)
- the fixture represents a core domain concept (brains, roles, specs, metrics)

## .how

```ts
// src/.test/assets/genMockedWidget.ts
export const genMockedWidget = (input?: {
  id?: string;
  name?: string;
}): Widget =>
  new Widget({
    id: input?.id ?? '__mock_id__',
    name: input?.name ?? '__mock_widget__',
  });
```

```ts
// any test file
import { genMockedWidget } from '@src/.test/assets/genMockedWidget';

const widget = genMockedWidget({ name: 'test-widget' });
```

## .name convention

- `genMocked*` — returns a mock/fake instance with sensible defaults
- `genSample*` — returns a realistic sample based on real-world data

## .antipattern

```ts
// 👎 inline fixture duplicated across test files
const genSampleSpec = (): BrainSpec =>
  new BrainSpec({ /* same shape in 3 files */ });
```

extract to `src/.test/assets/genSampleBrainSpec.ts` instead.
