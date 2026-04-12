# self-review r12: has-role-standards-coverage

## summary

coverage check for mechanic role standards. verifies that all relevant patterns from `repo=ehmpathy/role=mechanic/briefs/practices/` are present in the blueprint.

## rule directories enumerated

from mechanic briefs structure:

```
briefs/practices/
  ├── lang.terms/          # name conventions
  ├── lang.tones/          # seaturtle vibes, lowercase
  ├── code.prod/
  │   ├── evolvable.domain.operations/   # get-set-gen verbs
  │   ├── evolvable.procedures/          # input-context, arrow-only
  │   ├── evolvable.repo.structure/      # directional-deps
  │   ├── readable.narrative/            # no else, early returns
  │   ├── readable.comments/             # what-why headers
  │   ├── pitofsuccess.errors/           # failfast, failloud
  │   └── pitofsuccess.procedures/       # idempotent mutations
  └── code.test/
      ├── frames.behavior/               # given-when-then
      └── scope.coverage/                # test by grain
```

## coverage check by category

### lang.terms: ubiqlang

**check**: consistent terminology throughout.

| term used | context | consistent? |
|-----------|---------|-------------|
| artifacts | files to copy | yes |
| roles | from getRoleRegistry | yes |
| exclusions | patterns to exclude | yes |
| globs | pattern syntax | yes |
| compile | command name | yes |

no synonym drift detected.

**coverage**: complete.

### lang.tones: treestruct + lowercase

**check**: CLI output format and prose style.

treestruct elements present:
- `🐢` turtle header
- `🐚` shell root
- `├─` / `└─` branches
- vibe phrases (`cowabunga!`, `bummer dude...`)

prose in .what/.why comments: lowercase throughout.

**coverage**: complete.

### code.prod/evolvable.domain.operations: get-set-gen verbs

**check**: all operations use correct verb prefix.

| operation | verb | correct? |
|-----------|------|----------|
| getAllArtifactsForRole | getAll* | yes |
| applyArtifactGlobs | apply* | valid — transformer action |
| applyExclusions | apply* | valid — transformer action |
| copyFileWithStructure | copy* | valid — imperative action |
| pruneEmptyDirs | prune* | valid — imperative action |

note: `getAll*` follows rule. transformers and imperative actions have their own verbs (not get/set/gen).

**coverage**: complete.

### code.prod/evolvable.procedures: input-context + arrow-only

**check**: all functions use `(input, context)` and arrow syntax.

```ts
export const getAllArtifactsForRole = async (input: {...}): Promise<string[]> => {
export const applyArtifactGlobs = (input: {...}): string[] => {
export const applyExclusions = (input: {...}): string[] => {
export const copyFileWithStructure = async (input: {...}): Promise<void> => {
export const pruneEmptyDirs = async (input: {...}): Promise<void> => {
```

all use:
- `input: {...}` destructured object (not positional args)
- `=> {` arrow syntax (no `function` keyword)
- context absent where not needed (transformers are pure)

**coverage**: complete.

### code.prod/evolvable.repo.structure: directional-deps

**check**: no upward imports, correct layer placement.

```
src/
  contract/cli/
    invokeRepoCompile.ts              # imports from domain.operations ✓
  domain.operations/compile/
    getAllArtifactsForRole.ts         # imports from infra ✓
    applyArtifactGlobs.ts             # no imports (pure) ✓
    applyExclusions.ts                # imports fast-glob ✓
    copyFileWithStructure.ts          # imports fs, path ✓
    pruneEmptyDirs.ts                 # imports fs, path ✓
```

no circular deps. no upward imports.

**coverage**: complete.

### code.prod/readable.narrative: no else + early returns

**check**: flat structure, guard clauses.

blueprint code pattern:
```ts
if (!fs.existsSync(fullPath)) {
  throw new BadRequestError('briefs dir not found', { role: input.role.name, dir });
}
```

no `else` branches. no nested conditionals. early throw for invalid state.

**coverage**: complete.

### code.prod/readable.comments: what-why headers

**check**: all functions have `.what` and `.why`.

| function | .what | .why | both? |
|----------|-------|------|-------|
| getAllArtifactsForRole | yes | yes | yes |
| applyArtifactGlobs | yes | yes | yes |
| applyExclusions | yes | yes | yes |
| copyFileWithStructure | yes | yes | yes |
| pruneEmptyDirs | yes | yes | yes |

**coverage**: complete.

### code.prod/pitofsuccess.errors: failfast + failloud

**check**: errors throw immediately with context.

error patterns in blueprint:
```ts
throw new BadRequestError('briefs dir not found', { role: input.role.name, dir });
throw new BadRequestError('skills dir not found', { role: input.role.name, dir });
throw new BadRequestError('inits dir not found', { role: input.role.name, dir });
```

all errors:
- use `BadRequestError` (helpful-errors subclass)
- include context object with relevant variables
- throw immediately on invalid state (failfast)

**coverage**: complete.

### code.prod/pitofsuccess.procedures: idempotent mutations

**check**: operations are safe to retry.

| operation | idempotent? | why |
|-----------|-------------|-----|
| getAllArtifactsForRole | yes | read-only |
| applyArtifactGlobs | yes | pure filter |
| applyExclusions | yes | pure filter |
| copyFileWithStructure | yes | overwrites if extant |
| pruneEmptyDirs | yes | no-op if already empty |

no create-only operations. all safe to retry.

**coverage**: complete.

### code.test/frames.behavior: given-when-then

**check**: tests use BDD structure.

from test tree (blueprint lines 252-269):
- unit tests for transformers
- integration tests for orchestrators/communicators
- acceptance tests with snapshots

acceptance test cases (lines 274-288) follow behavior format:
- happy path scenarios
- error case scenarios
- edge case scenarios

**coverage**: complete.

### code.test/scope.coverage: test by grain

**check**: correct test type per operation grain.

| grain | operation | required test | blueprint has |
|-------|-----------|---------------|---------------|
| transformer | applyArtifactGlobs | unit | yes (line 254) |
| transformer | applyExclusions | unit | yes (line 256) |
| orchestrator | getAllArtifactsForRole | integration | yes (line 258) |
| communicator | copyFileWithStructure | integration | yes (line 260) |
| communicator | pruneEmptyDirs | integration | yes (line 262) |
| contract | invokeRepoCompile | acceptance + snapshots | yes (line 269) |

**coverage**: complete.

## conclusion

all mechanic role standards covered:

| category | status |
|----------|--------|
| lang.terms/ubiqlang | complete |
| lang.tones/treestruct | complete |
| lang.tones/lowercase | complete |
| evolvable.domain.operations | complete |
| evolvable.procedures | complete |
| evolvable.repo.structure | complete |
| readable.narrative | complete |
| readable.comments | complete |
| pitofsuccess.errors | complete |
| pitofsuccess.procedures | complete |
| code.test/frames.behavior | complete |
| code.test/scope.coverage | complete |

no gaps found.
