# accept.blackbox testing strategy

## .what

acceptance tests validate all external contracts as black-boxes. this includes:
- **cli**: invoke commands as subprocesses, assert on stdout/stderr/status
- **sdk**: import published exports, call functions, assert on return values
- **api**: call endpoints via http, assert on responses

these tests exercise the same code paths users experience, without access to internal implementations.

## .why

- **isolation**: tests run against actual compiled artifacts
- **realism**: tests exercise the exact code paths users experience
- **portability**: tests work across environments without internal coupling
- **confidence**: verifies end-to-end behavior, not just unit logic

## .structure

```
accept.blackbox/                      # @/accept.blackbox
  .test/
    assets/                           # fixture templates copied into temp repos
      minimal/                        # bare .agent/ structure
      with-skills/                    # includes sample skills
      with-briefs/                    # includes sample briefs
      with-registry/                  # complete role registry
    infra/
      genTestTempRepo.ts              # copies assets into os.tmpdir()
      invokeRhachetCliBinary.ts       # CLI binary invocation helpers
  cli/
    run.acceptance.test.ts            # rhachet run tests
    roles.boot.acceptance.test.ts     # rhachet roles boot tests
    roles.cost.acceptance.test.ts     # rhachet roles cost tests
    ...
  sdk/
    genActor.acceptance.test.ts       # genActor tests
    ...
```

## .scope

all external contracts must have acceptance test coverage:

| contract type | test approach                         | location                     |
| ------------- | ------------------------------------- | ---------------------------- |
| cli           | subprocess invocation via spawn/exec  | `@/accept.blackbox/cli/*.ts` |
| sdk           | import compiled dist/, call functions | `@/accept.blackbox/sdk/*.ts` |
| api           | http calls to endpoints               | `@/accept.blackbox/api/*.ts` |

## .pattern: genTestTempRepo

creates isolated test environments in `os.tmpdir()`:
- clones example repos with proper `.agent/` structure
- leverages OS temp directory cleanup (no manual teardown needed)
- ensures each test gets a fresh, isolated workspace

```ts
const repo = genTestTempRepo({
  fixture: 'minimal',  // or 'with-skills', 'with-briefs', etc
});

const result = invokeRhachetCli({
  args: ['run', '--skill', 'say-hello'],
  cwd: repo.path,
});

expect(result.status).toEqual(0);
```

## .principles

1. **only test through contract layer** - no internal imports allowed in acceptance tests
2. **use os.tmpdir()** - maximally portable and isolated, OS handles cleanup
3. **invoke CLI as subprocess** - uses `invokeRhachetCli` helper
4. **assert on observable outputs** - stdout/stderr/status for cli, return values for sdk
5. **fixture-based setup** - reusable test repo templates

## .fixtures

fixture templates live in `.test/assets/` and are copied into temp repos by `genTestTempRepo`:

| fixture         | contents                                                       |
| --------------- | -------------------------------------------------------------- |
| `minimal`       | bare `.agent/` structure                                       |
| `with-skills`   | sample skills in `.agent/repo=.this/role=any/skills/`          |
| `with-briefs`   | sample briefs + readme in `.agent/repo=.this/role=any/briefs/` |
| `with-registry` | complete role registry with skills + briefs                    |

to add a new fixture:
1. create a new directory under `.test/assets/`
2. add the fixture files (`.agent/` structure, boot.yml, etc)
3. add the fixture name to `TestRepoFixture` type in `genTestTempRepo.ts`

## .coverage

### cli contracts

- `rhachet init` - project initialization
- `rhachet roles boot` - role context bootup
- `rhachet roles link` - external role link
- `rhachet roles init` - init script execution
- `rhachet roles cost` - token cost estimation
- `rhachet run` - skill execution
- `rhachet list` - role/skill enumeration
- `rhachet readme` - readme generation
- `rhachet choose` - choice selection

### sdk contracts

- `genActor` - actor instantiation
- `Role` / `RoleRegistry` - domain object exports
- template and stitch utilities

## .when to add

add acceptance tests when:
- a new CLI command is added
- a new SDK export is added
- CLI behavior observable to users changes
- SDK return values or signatures change
- bugs are reported (regression tests)
- cross-command workflows need validation

## .example

```ts
// file: accept.blackbox/cli/run.acceptance.test.ts
import { given, when, then, useBeforeAll } from 'test-fns';
import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet run', () => {
  given('[case1] repo with say-hello skill', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] run --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs hello message', () => {
        expect(result.stdout).toContain('hello');
      });
    });
  });
});
```
