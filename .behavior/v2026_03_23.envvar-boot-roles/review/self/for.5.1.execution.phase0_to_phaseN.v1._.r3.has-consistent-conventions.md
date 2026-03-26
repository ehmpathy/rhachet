# self-review: has-consistent-conventions

## summary

reviewed new code for consistency with extant name conventions.

**verdict: conventions are consistent with extant patterns.**

## analysis

### 1. type alias names

**extant pattern**: `type XSlug = string` for simple type aliases

**new code**:
- `type BrainSlug = string` (in `BrainSlug.ts`)
- `type RoleSlug = string` (in `RoleSlug.ts`)

**conclusion**: consistent. uses simple string alias pattern.

note: the codebase also has branded types (`string & { __brand: 'X' }`) for slugs that need conversion functions (e.g., `BrainSupplierSlug`). our slugs don't need conversion functions, so plain aliases are appropriate.

### 2. domain object names

**extant pattern**: `[Namespace][Concept]` with PascalCase, extends DomainLiteral or DomainEntity

**new code**:
- `BrainCliEnrollmentOperation` - follows pattern
- `BrainCliEnrollmentSpec` - follows pattern
- `BrainCliEnrollmentManifest` - follows pattern
- `BrainCliConfigArtifact` - follows pattern

**conclusion**: consistent. all extend DomainLiteral, use PascalCase, follow namespace+concept pattern.

### 3. operation names

**extant patterns**:
- `gen*` - generate/create (e.g., `genActor`, `genBrainEpisode`)
- `parse*` - parse strings/input (e.g., `parseRoleSpecifier`, `parseRoleBootYaml`)
- `compute*` - compute/calculate (e.g., `computeBootMode`, `computeBrainEpisodeHash`)
- `enroll*` - enroll things (e.g., `enrollThread`)

**new code**:
- `parseBrainCliEnrollmentSpec` - follows `parse*` pattern
- `computeBrainCliEnrollment` - follows `compute*` pattern
- `genBrainCliConfigArtifact` - follows `gen*` pattern
- `enrollBrainCli` - follows `enroll*` pattern (matches extant `enrollThread`)

**conclusion**: consistent. all operations follow extant verb patterns.

### 4. contract layer names

**extant pattern**: `invoke[Command].ts` for CLI commands (e.g., `invokeAct.ts`, `invokeAsk.ts`, `invokeRun.ts`)

**new code**: `invokeEnroll.ts`

**conclusion**: consistent with extant pattern.

### 5. test file names

**extant patterns**:
- `.test.ts` for unit tests
- `.integration.test.ts` for integration tests

**new code**:
- `parseBrainCliEnrollmentSpec.test.ts` - unit test
- `computeBrainCliEnrollment.integration.test.ts` - integration test
- `genBrainCliConfigArtifact.integration.test.ts` - integration test
- `invokeEnroll.integration.test.ts` - integration test

**conclusion**: consistent with extant pattern.

### 6. folder structure

**extant pattern**: operations in `src/domain.operations/[subdomain]/`

**new code**: operations in `src/domain.operations/enroll/`

**conclusion**: consistent. new subdomain for enroll operations.

## conclusion

all name conventions are consistent with extant patterns. no divergence found.
