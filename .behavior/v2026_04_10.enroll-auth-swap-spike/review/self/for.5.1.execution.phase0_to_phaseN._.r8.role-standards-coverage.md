# self-review: role-standards-coverage (r8)

review for coverage of mechanic role standards.

---

## briefs directories checked

| directory | relevance |
|-----------|-----------|
| `lang.terms/` | all code must follow |
| `lang.tones/` | all comments must follow |
| `code.prod/evolvable.procedures/` | all procedures must follow |
| `code.prod/evolvable.domain.objects/` | all domain objects must follow |
| `code.prod/pitofsuccess.errors/` | all error cases must follow |
| `code.prod/readable.comments/` | all public functions must follow |
| `code.test/` | all tests must follow |

---

## coverage checklist by file

### domain objects

| file | headers | types | patterns |
|------|---------|-------|----------|
| BrainAuthSpec.ts | .what/.why present | exported types | type alias + interface |
| BrainAuthCredential.ts | .what/.why present | DomainLiteral | interface + class |
| BrainAuthAdapter.ts | .what/.why present | interface | generic param |
| BrainAuthAdapterDao.ts | .what/.why present | interface | supply method |
| BrainAuthCapacity.ts | .what/.why present | DomainLiteral | interface + class |
| BrainAuthCapacityDao.ts | .what/.why present | interface | get method |
| BrainAuthError.ts | .what/.why present | class | extends HelpfulError |
| BrainAuthSupplied.ts | .what/.why present | interface | generic format |

**why covered:** all 8 domain objects have .what/.why headers, follow domain-objects library patterns (DomainLiteral for value objects, interface for contracts).

### transformers

| file | headers | input pattern | errors |
|------|---------|---------------|--------|
| asBrainAuthSpecShape.ts | .what/.why present | `(input: {...})` | BadRequestError |
| asBrainAuthTokenSlugs.ts | .what/.why present | `(input: {...})` | BadRequestError |
| genApiKeyHelperCommand.ts | .what/.why present | `(input: {...})` | - |

**why covered:** all transformers have headers, use `input` object pattern (not positional args), use BadRequestError for invalid input (fail-fast).

### orchestrator

| file | headers | input-context | DI | errors |
|------|---------|---------------|----|----|
| getOneBrainAuthCredentialBySpec.ts | .what/.why present | `(input, context)` | keyrack, adapter | BadRequestError, UnexpectedCodePathError |

**why covered:** orchestrator follows full `(input, context)` pattern. context declares dependencies (keyrack, adapter). errors use helpful-errors classes with context objects.

### CLI

| file | headers | command pattern |
|------|---------|-----------------|
| invokeBrainsAuth.ts | .what/.why present | commander.js |

**why covered:** CLI handler follows extant pattern (commander.js). context composed from genContextKeyrackGrantGet.

### tests

| file | given-when-then | caselist |
|------|-----------------|----------|
| asBrainAuthSpecShape.test.ts | uses test-fns | caselist pattern |
| asBrainAuthTokenSlugs.test.ts | uses test-fns | caselist pattern |
| genApiKeyHelperCommand.test.ts | uses test-fns | caselist pattern |
| getOneBrainAuthCredentialBySpec.test.ts | uses test-fns | behavior tests |

**why covered:** all test files import `given`, `when`, `then` from test-fns. transformers use caselist pattern (data-driven). orchestrator uses behavior tests.

---

## absent patterns check

| standard | expected | status |
|----------|----------|--------|
| error boundary | operations must fail-fast | all use BadRequestError or UnexpectedCodePathError |
| input validation | inputs must validate | transformers validate format, orchestrator validates state |
| type exports | types must be exported | all domain objects exported in index.ts |
| test coverage | exports must have tests | 4 test files cover all exports |
| context interface | orchestrators must declare context | ContextBrainAuth declared in orchestrator |

**why covered:** each standard is applied. errors use helpful-errors classes. validation occurs at boundaries. types are exported. tests exist for all public functions.

---

## issues found: none

all mechanic role standards are covered.

| area | coverage |
|------|----------|
| domain objects | 8/8 |
| transformers | 3/3 |
| orchestrators | 1/1 |
| CLI | 1/1 |
| tests | 4/4 |

no gaps found. all files follow mechanic briefs.

