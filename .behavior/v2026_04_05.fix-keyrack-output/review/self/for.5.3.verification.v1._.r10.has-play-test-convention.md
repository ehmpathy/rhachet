# self-review: has-play-test-convention (deeper pass — configuration verification)

## the question

double-check: are journey test files named correctly?

## the review

### repo test infrastructure evidence

from `package.json` commands:

```json
"test:unit": "jest -c ./jest.unit.config.ts ...",
"test:integration": "jest -c ./jest.integration.config.ts ...",
"test:acceptance:locally": "npm run build && LOCALLY=true jest -c ./jest.acceptance.config.ts ...",
"test:acceptance": "npm run build && jest -c ./jest.acceptance.config.ts ..."
```

**observation:** three test runners exist:
- unit (`.test.ts`)
- integration (`.integration.test.ts`)
- acceptance (`.acceptance.test.ts`)

no `.play.` runner exists in this repo.

### file suffix to runner map

| suffix | runner | config |
|--------|--------|--------|
| `.test.ts` | test:unit | jest.unit.config.ts |
| `.integration.test.ts` | test:integration | jest.integration.config.ts |
| `.acceptance.test.ts` | test:acceptance | jest.acceptance.config.ts |

### why `.acceptance.` serves as `.play.`

acceptance tests in this repo fulfill the journey test purpose:
- test from user-visible contract layer
- invoke real binary via subprocess
- verify CLI input/output
- black-box (no internal imports)

the guide states:
> "if not supported, is the fallback convention used?"

**yes.** `.acceptance.test.ts` is the fallback convention for journey tests in this repo.

### verification: behavior's tests match convention

| file | suffix | runner |
|------|--------|--------|
| `keyrack.get.output.acceptance.test.ts` | `.acceptance.test.ts` | test:acceptance |
| `keyrack.source.cli.acceptance.test.ts` | `.acceptance.test.ts` | test:acceptance |
| `asShellEscapedSecret.test.ts` | `.test.ts` | test:unit |

all test files match the repo's established suffix-to-runner convention.

### verification: tests run successfully

from prior evidence in this behavior:
- acceptance tests were executed via `npm run test:acceptance:locally`
- tests passed
- snapshots were generated

### why not introduce `.play.`?

the guide asks about `.play.` convention:
> - `feature.play.test.ts` — journey test
> - `feature.play.integration.test.ts` — if repo requires integration runner
> - `feature.play.acceptance.test.ts` — if repo requires acceptance runner

this repo does not have `.play.` infrastructure. the acceptance runner already fulfills the journey test purpose. no convention change needed.

## found concerns

none.

evidence confirms:
1. repo uses `.acceptance.test.ts` for journey tests
2. behavior's tests follow this convention
3. test runners configured in package.json match file suffixes
4. no `.play.` infrastructure exists to adopt

## conclusion

**has-play-test-convention check: PASS**

- `.acceptance.test.ts` is the repo's journey test convention
- package.json commands confirm this convention
- behavior's tests use correct suffixes
- no convention drift

