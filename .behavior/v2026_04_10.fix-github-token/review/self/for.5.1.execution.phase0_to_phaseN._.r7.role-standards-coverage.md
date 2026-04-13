# review: role-standards-coverage (round 7)

## slowed down. checked for patterns that should be present.

---

## rule directories for coverage check

1. `practices/code.prod/readable.comments/` — jsdoc coverage
2. `practices/code.prod/pitofsuccess.errors/` — error handle coverage
3. `practices/code.test/` — test coverage
4. `practices/code.prod/evolvable.procedures/` — type safety coverage

---

## file-by-file coverage check

### promptLineInput.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| .what/.why header | ✓ | lines 3-9 |
| typed input | ✓ | `(input: { prompt: string })` |
| typed return | ✓ | `Promise<string>` |
| error handle | n/a | no error paths in simple readline |

### mockPromptLineInput.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| .what/.why header | ✓ | file-level + each export |
| usage example | ✓ | lines 5-16 show how to use |
| typed exports | ✓ | all functions have type signatures |
| error on misuse | ✓ | throws when queue empty |

### inferKeyrackMechForSet.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| .what/.why header | ✓ | lines 20-26 |
| typed input | ✓ | `(input: { vault: KeyrackHostVaultAdapter })` |
| typed return | ✓ | `Promise<KeyrackGrantMechanism>` |
| validation | ✓ | throws on invalid choice |
| early return | ✓ | single mech auto-select |

### KeyrackKeySpec.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| .what/.why for each field | ✓ | each field has jsdoc |
| .note for nullable | ✓ | explains why mech can be null |

### hydrateKeyrackRepoManifest.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| .what/.why header | ✓ | extractKeysFromEnvSections, hydrateKeyrackRepoManifest |
| typed input/context | ✓ | `(input: {...}, context: {...})` |
| error on invalid | ✓ | throws BadRequestError |

### mechAdapterGithubApp.ts

| required pattern | present? | evidence |
|------------------|----------|----------|
| error wrap | ✓ | UnexpectedCodePathError with metadata |
| tilde expansion comment | ✓ | line 204 explains why |

---

## test coverage check

| file | test file | status |
|------|-----------|--------|
| promptLineInput.ts | n/a | infra file, mocked in tests |
| mockPromptLineInput.ts | n/a | test infra |
| inferKeyrackMechForSet.ts | fillKeyrackKeys.integration.test.ts | tested via fill journey |
| KeyrackKeySpec.ts | hydrateKeyrackRepoManifest.test.ts | type used in hydration tests |
| hydrateKeyrackRepoManifest.ts | hydrateKeyrackRepoManifest.test.ts | unit tests exist |
| mechAdapterGithubApp.ts | mechAdapterGithubApp.test.ts | validation tests exist |

**blueprint note:**
> no new tests required — changes are minimal

this matches — integration tests pass, unit tests unaffected.

---

## omissions checked

| should be present? | is it? | notes |
|--------------------|--------|-------|
| error message with context | ✓ | inferKeyrackMechForSet includes expected range |
| typed domain objects | ✓ | KeyrackKeySpec used throughout |
| comment that explains tilde | ✓ | "node doesn't do this automatically" |
| mock usage example | ✓ | mockPromptLineInput has usage block |

---

## verdict

**holds** — all required patterns are present. jsdoc complete. types complete. errors have context. tests cover the journey.

