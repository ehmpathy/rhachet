# review: role-standards-coverage (round 8)

## slowed down. traced each brief category exhaustively.

---

## brief directories enumerated

checked each subdirectory in `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`:

| directory | applies to this pr? | reason |
|-----------|---------------------|--------|
| `lang.terms/` | yes | function names, variable names |
| `lang.tones/` | yes | comments, messages |
| `code.prod/consistent.artifacts/` | yes | package changes |
| `code.prod/evolvable.architecture/` | yes | file organization |
| `code.prod/evolvable.procedures/` | yes | function signatures |
| `code.prod/evolvable.repo.structure/` | yes | file locations |
| `code.prod/pitofsuccess.errors/` | yes | error patterns |
| `code.prod/readable.comments/` | yes | jsdoc |
| `code.prod/readable.narrative/` | yes | flow |
| `code.test/` | yes | test patterns |
| `work.flow/` | no | workflow, not code |

---

## changed production files

### KeyrackKeySpec.ts

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.require.what-why-headers` | each field has .what/.why | ✓ line 17-20 |
| `rule.forbid.nullable-without-reason` | .note explains null | ✓ line 19 |
| `rule.forbid.undefined-attributes` | no undefined | ✓ uses null |

### hydrateKeyrackRepoManifest.ts

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.require.input-context-pattern` | (input, context) | ✓ line 135 |
| `rule.require.arrow-only` | arrow functions | ✓ all functions |
| `rule.require.what-why-headers` | .what/.why | ✓ line 14-17, 49-55, 127-134 |
| `rule.require.failfast` | early errors | ✓ BadRequestError throws |

### mechAdapterGithubApp.ts

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.prefer.helpful-error-wrap` | context in errors | ✓ line 214-218 |
| `rule.require.failfast` | error on bad pem | ✓ line 211-218 |
| `rule.require.what-why-headers` | comments | ✓ line 204 |

---

## new files

### promptLineInput.ts

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.require.input-context-pattern` | (input: {...}) | ✓ line 10-12 |
| `rule.require.arrow-only` | arrow function | ✓ line 10 |
| `rule.require.what-why-headers` | .what/.why/.note | ✓ lines 3-9 |
| `rule.require.directional-deps` | infra layer | ✓ in src/infra/ |
| `rule.forbid.barrel-exports` | no index.ts | ✓ standalone file |

### mockPromptLineInput.ts

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.require.arrow-only` | arrow functions | ✓ all exports |
| `rule.require.what-why-headers` | .what/.why | ✓ each export |
| `rule.require.failfast` | error on empty queue | ✓ line 49-52 |
| `rule.require.shared-test-fixtures` | in src/.test/ | ✓ in src/.test/infra/ |

### inferKeyrackMechForSet.ts (modified)

**coverage check:**

| brief | pattern required | present? |
|-------|------------------|----------|
| `rule.require.input-context-pattern` | (input: {...}) | ✓ line 27-29 |
| `rule.require.arrow-only` | arrow function | ✓ line 27 |
| `rule.require.what-why-headers` | .what/.why/.note | ✓ lines 21-26 |
| `rule.require.failfast` | error on invalid | ✓ line 50-53 |
| `rule.forbid.else-branches` | early return | ✓ line 33-35 |

---

## test coverage

| file | test exists? | type |
|------|--------------|------|
| promptLineInput.ts | via mock | infra (mocked) |
| mockPromptLineInput.ts | n/a | test infra |
| inferKeyrackMechForSet.ts | fillKeyrackKeys.integration.test.ts | integration |
| hydrateKeyrackRepoManifest.ts | hydrateKeyrackRepoManifest.test.ts | unit |
| mechAdapterGithubApp.ts | mechAdapterGithubApp.test.ts | unit |
| KeyrackKeySpec.ts | via hydration tests | type (domain object) |

all tests pass. blueprint said no new tests needed.

---

## omissions found

none. all required patterns are present.

---

## verdict

**holds** — exhaustively checked each brief directory. all patterns present. no omissions.

