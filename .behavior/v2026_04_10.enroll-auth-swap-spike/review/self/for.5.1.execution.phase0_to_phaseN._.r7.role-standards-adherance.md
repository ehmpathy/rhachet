# self-review: role-standards-adherance (r7)

review for adherance to mechanic role standards.

---

## briefs directories checked

| directory | coverage |
|-----------|----------|
| `lang.terms/` | treestruct, ubiqlang, gerunds, noun_adj |
| `lang.tones/` | lowercase, no buzzwords, no shouts |
| `code.prod/evolvable.procedures/` | arrow-only, input-context, dependency-injection |
| `code.prod/evolvable.domain.objects/` | domain-objects patterns |
| `code.prod/pitofsuccess.errors/` | fail-fast, failloud errors |
| `code.prod/readable.comments/` | what-why headers |
| `code.test/` | given-when-then |

---

## domain objects review

### BrainAuthSpec.ts

| standard | check | verdict |
|----------|-------|---------|
| what-why headers | `/** .what = ... .why = ... */` present | pass |
| no gerunds | no gerunds found | pass |
| lowercase comments | lowercase used | pass |
| treestruct names | `BrainAuthSpecWords`, `BrainAuthSpecShape` | pass |

**why it holds:** file follows all conventions — comments use `.what/.why` format with lowercase, type names follow treestruct pattern.

### BrainAuthCredential.ts

| standard | check | verdict |
|----------|-------|---------|
| what-why headers | present | pass |
| DomainLiteral pattern | extends DomainLiteral | pass |
| interface + class pattern | both declared | pass |

**why it holds:** follows domain-objects library pattern exactly — interface declares shape, class extends DomainLiteral.

### BrainAuthAdapter.ts

| standard | check | verdict |
|----------|-------|---------|
| what-why headers | present | pass |
| interface pattern | clean interface | pass |
| generic type parameter | `TBrainSlug extends string` | pass |

**why it holds:** adapter interface is minimal and typed. generic parameter enables type-safe brain slug match.

---

## transformers review

### asBrainAuthSpecShape.ts

| standard | check | verdict |
|----------|-------|---------|
| arrow-only | `export const asBrainAuthSpecShape = (...) => {...}` | pass |
| input-context pattern | uses `input` object | pass |
| what-why headers | present | pass |
| fail-fast | uses `BadRequestError` for invalid input | pass |
| no gerunds | no gerunds found | pass |
| single-responsibility | one transform per file | pass |
| treestruct name | `asBrainAuthSpecShape` follows `as*` pattern | pass |

**why it holds:** transformer is pure — takes input, returns output or throws. follows `as*` naming. uses `input` object pattern.

### asBrainAuthTokenSlugs.ts

| standard | check | verdict |
|----------|-------|---------|
| arrow-only | all functions use arrow syntax | pass |
| input-context pattern | uses `input` objects | pass |
| what-why headers | present on public function | pass |
| fail-fast | uses `BadRequestError` for no matches | pass |
| no gerunds | no gerunds found | pass |
| treestruct name | `asBrainAuthTokenSlugs` follows `as*` pattern | pass |
| internal functions private | `parseKeyrackUri`, `patternToRegex` not exported | pass |

**why it holds:** pure transformer with internal utilities. public function follows `as*` naming. internal names also follow treestruct (`parseKeyrackUri` = `parse` + noun, `patternToRegex` = noun + `To` + noun).

---

## orchestrator review

### getOneBrainAuthCredentialBySpec.ts

| standard | check | verdict |
|----------|-------|---------|
| arrow-only | all functions use arrow syntax | pass |
| input-context pattern | `(input, context)` signature | pass |
| dependency injection | context provides keyrack, adapter | pass |
| what-why headers | present | pass |
| treestruct name | `getOneBrainAuthCredentialBySpec` follows `getOne*By*` | pass |
| fail-fast errors | BadRequestError, UnexpectedCodePathError | pass |
| no gerunds | no gerunds found | pass |
| narrative flow | early returns for errors | pass |

**why it holds:** orchestrator follows `(input, context)` pattern. dependencies injected via context. name follows `getOne*By*` pattern from `rule.require.get-set-gen-verbs`. errors use helpful-errors classes.

**note on let:** line 151 uses `let` for `selectedCredential`. acceptable — assignment depends on conditional branch. not mutation, just conditional initialization.

---

## tests review

### test files (4 total)

| standard | check | verdict |
|----------|-------|---------|
| given-when-then | uses `given`, `when`, `then` from test-fns | pass |
| no mocks | tests are pure | pass |
| data-driven cases | caselist pattern used | pass |

**why it holds:** tests import `given`, `when`, `then` from test-fns. transformers tested with caselist pattern (array of test cases). no mocks — pure function tests.

---

## issues found: none

all files adhere to mechanic role standards.

---

## summary

| category | pass | fail |
|----------|------|------|
| lang.terms | 8/8 | 0 |
| lang.tones | 3/3 | 0 |
| code.prod | 10/10 | 0 |
| code.test | 2/2 | 0 |

no standards violations found.

