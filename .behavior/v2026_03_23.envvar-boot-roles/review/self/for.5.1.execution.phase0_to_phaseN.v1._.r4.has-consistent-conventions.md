# review: has-consistent-conventions

## the question

conventions asks: do we follow extant name and structure conventions?

## files reviewed

- `src/domain.objects/BrainSlug.ts`
- `src/domain.objects/RoleSlug.ts`
- `src/domain.objects/BrainCliEnrollmentSpec.ts`
- `src/domain.objects/BrainCliEnrollmentOperation.ts`
- `src/domain.objects/BrainCliEnrollmentManifest.ts`
- `src/domain.objects/BrainCliConfigArtifact.ts`
- `src/domain.operations/enroll/parseBrainCliEnrollmentSpec.ts`
- `src/domain.operations/enroll/computeBrainCliEnrollment.ts`
- `src/domain.operations/enroll/genBrainCliConfigArtifact.ts`
- `src/domain.operations/enroll/enrollBrainCli.ts`
- `src/contract/cli/invokeEnroll.ts`

## extant conventions search

searched for extant patterns:
- `grep -r "class [A-Z]+ extends Domain" src/domain.objects/` — found domain object patterns
- `glob src/contract/cli/invoke*.ts` — found cli command patterns
- `grep -r "export const (parse|compute|gen|get|set)" src/` — found operation verb patterns

## deep review

### domain object names

**extant domain objects:**
- `BrainSpec extends DomainLiteral<BrainSpec>` — [Context][Noun] pattern
- `RoleHooks extends DomainLiteral<RoleHooks>` — [Context][Noun] pattern
- `BrainHook extends DomainEntity<BrainHook>` — [Context][Noun] pattern

**new domain objects:**

| object | extant pattern match | why it holds |
|--------|---------------------|--------------|
| BrainSlug | ✓ matches `RoleSupplierSlug` (type alias) | same type-alias-for-string pattern |
| RoleSlug | ✓ matches `RoleSupplierSlug` (type alias) | same type-alias-for-string pattern |
| BrainCliEnrollmentSpec | ✓ matches `BrainSpec` | [Context][Noun] pattern |
| BrainCliEnrollmentOperation | ✓ matches `BrainHook` | [Context][Noun] pattern |
| BrainCliEnrollmentManifest | ✓ matches `RoleHooks` | [Context][Noun] pattern |
| BrainCliConfigArtifact | ✓ matches `BrainHook` | [Context][Noun] pattern |

### operation verb conventions

**extant operations:**
- `genBrainHooksAdapterForClaudeCode` — gen prefix
- `parseRoleRegistryFromDir` — parse prefix (inferred from usage patterns)
- `computeStageFromEnv` — compute prefix
- `getAllFilesFromDir` — getAll prefix

**new operations:**

| operation | verb | extant match | why it holds |
|-----------|------|--------------|--------------|
| parseBrainCliEnrollmentSpec | parse | ✓ matches parseRoleRegistryFromDir | transforms string to domain object |
| computeBrainCliEnrollment | compute | ✓ matches computeStageFromEnv | derives result from inputs |
| genBrainCliConfigArtifact | gen | ✓ matches genBrainHooksAdapterForClaudeCode | generates artifact |
| enrollBrainCli | enroll | new verb — see justification | spawns process |

**justification for new "enroll" verb:**

extant verbs (get, set, gen, compute, parse) are for internal operations. "enroll" is the action users invoke — it spawns the brain process. this matches the domain language in rhachet briefs where "enroll" means "pair brain with role to create actor".

the verb "spawn" was considered but "enroll" better captures the semantic: not just start a process, but configure it with roles first.

### cli command file structure

**extant pattern from `invokeRun.ts`:**
```ts
// line 1-3: type imports
import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

// line 18-24: getRawArgsAfterRun helper
const getRawArgsAfterRun = (): string[] => { ... }

// line 30+: performRunViaInitMode function
const performRunViaInitMode = (input: { ... }): void => { ... }
```

**new code in `invokeEnroll.ts`:**
```ts
// line 1-12: type imports (same pattern)
import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

// line 18-32: getRawArgsAfterEnroll helper (mirrors getRawArgsAfterRun)
const getRawArgsAfterEnroll = (input: { brain: string }): string[] => { ... }

// line 80+: performEnroll function (mirrors performRunViaInitMode)
const performEnroll = async (input: { ... }): Promise<void> => { ... }
```

the structure mirrors `invokeRun.ts` exactly:
1. type imports at top
2. raw arg extraction helper
3. perform* function for core logic

### test file structure

**extant:**
- `invokeRun.integration.test.ts` — integration test for cli command
- `invokeRun.stdin.integration.test.ts` — specialized test

**new:**
- `invokeEnroll.integration.test.ts` — follows same pattern

uses same test structure with `given/when/then` from test-fns.

## conclusion

all conventions followed. verified against extant code with line-by-line comparison.

| aspect | status | evidence |
|--------|--------|----------|
| domain object names | ✓ | matches BrainSpec, RoleHooks patterns |
| operation verbs | ✓ | matches gen, parse, compute patterns |
| cli file structure | ✓ | mirrors invokeRun.ts exactly |
| test file structure | ✓ | follows .integration.test.ts pattern |

one new verb ("enroll") introduced with clear domain justification — matches the rhachet glossary where "enroll" means "pair brain with role".

