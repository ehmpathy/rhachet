# self-review: has-play-test-convention (r10)

## question

> are journey test files named correctly?

the question asks whether journey tests use the `.play.test.ts` suffix.

## analysis

### what is a play test?

play tests are journey tests that exercise full user flows:
- `feature.play.test.ts` — journey test
- `feature.play.integration.test.ts` — if repo requires integration runner
- `feature.play.acceptance.test.ts` — if repo requires acceptance runner

### searched for play test files

```bash
glob **/*.play.*.test.ts
```

**result**: no files found

this repo does not use the `.play.` file name convention.

### what convention does this repo use?

examined test file patterns in this repo:

| test type | location | pattern |
|-----------|----------|---------|
| unit | `src/**/*.test.ts` | `{name}.test.ts` |
| integration | `src/**/*.integration.test.ts` | `{name}.integration.test.ts` |
| acceptance | `blackbox/**/*.acceptance.test.ts` | `{name}.acceptance.test.ts` |

the **acceptance** tests in `blackbox/` serve as journey tests:
- test CLI commands as a subprocess
- verify full user flows end-to-end
- capture stdout/stderr via snapshots

### keyrack firewall journey tests

the firewall journey tests are at:
- `blackbox/cli/keyrack.firewall.acceptance.test.ts`

this file covers all user journeys from the criteria:
- usecase.1: credential translation
- usecase.2: credential filter
- usecase.3: credential block
- usecase.4: credential passthrough
- usecase.5: debug experience (success)
- usecase.6: debug experience (failure)
- usecase.7: atomicity (fail fast)
- usecase.8: keyrack.yml not found
- usecase.9: absent secrets

### is the fallback convention valid?

yes. the guide says:
> if not supported, is the fallback convention used?

this repo's fallback is `*.acceptance.test.ts` in `blackbox/`:
- located in dedicated `blackbox/` directory (separate from unit/integration)
- uses `.acceptance.test.ts` suffix (distinct from internal tests)
- tests CLI as subprocess (black-box approach)

this matches the spirit of play tests: journey-level verification.

## why it holds

1. the `.play.test.ts` convention is not used in this repo
2. `blackbox/cli/*.acceptance.test.ts` serves as the journey test location
3. all usecases from criteria have dedicated tests in this location
4. the fallback convention is consistent with how the repo organizes tests
5. acceptance tests exercise full user flows via subprocess execution

## verdict

**holds** — repo uses `*.acceptance.test.ts` in `blackbox/` as the journey test convention
