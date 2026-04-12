# self-review r8: has-consistent-conventions

## directory structure conventions

**extant pattern**: `src/domain.operations/{domain}/`

examples from codebase:
- `src/domain.operations/actor/`
- `src/domain.operations/manifest/`
- `src/domain.operations/invoke/`

**blueprint proposes**: `src/domain.operations/compile/`

**verdict**: consistent — singular noun as domain namespace.

## file name conventions

**extant pattern**: `{verb}{noun}.ts`

examples from codebase:
- `castIntoRoleRegistryManifest.ts`
- `getAllFilesFromDir.ts`
- `extractDirUris.ts` (within castIntoRoleRegistryManifest)

**blueprint proposes**:
- `getAllArtifactsForRole.ts` — matches extant `getAll*` pattern
- `applyArtifactGlobs.ts` — matches extant `apply*` pattern
- `applyExclusions.ts` — matches extant `apply*` pattern
- `copyFileWithStructure.ts` — descriptive verb + context
- `pruneEmptyDirs.ts` — descriptive verb + context

**verdict**: consistent — all names follow verb + noun pattern.

## test file conventions

**extant pattern**: `{name}.test.ts` for unit, `{name}.integration.test.ts` for integration

examples from codebase:
- `src/infra/filesystem/getAllFilesFromDir.test.ts`
- `src/infra/filesystem/getAllFilesFromDir.integration.test.ts`

**blueprint proposes**:
- `applyArtifactGlobs.test.ts`
- `applyExclusions.test.ts`
- `getAllArtifactsForRole.integration.test.ts`
- `copyFileWithStructure.integration.test.ts`
- `pruneEmptyDirs.integration.test.ts`

**verdict**: consistent — unit and integration test file suffixes match extant pattern.

## CLI command conventions

**extant pattern**: `rhachet repo {subcommand}`

examples from codebase:
- `rhachet repo introspect` (in invokeRepoIntrospect.ts)

**blueprint proposes**: `rhachet repo compile`

**verdict**: consistent — follows extant `repo` namespace pattern.

## CLI flag conventions

**extant pattern**: `--{flag} <value>`

examples from `invokeRepoIntrospect.ts`:
- `--output <path>`

**blueprint proposes**:
- `--from <dir>`
- `--into <dir>`
- `--include <glob>`
- `--exclude <glob>`

**verdict**: consistent — all flags use lowercase with descriptive names.

## error message conventions

**extant pattern**: `BadRequestError` with context object

examples from `invokeRepoIntrospect.ts`:
- `throw new BadRequestError('repo introspect must be run inside a rhachet-roles-* package', { packageName })`

**blueprint proposes**:
- `throw new BadRequestError('briefs dir not found', { role: input.role.name, dir })`

**verdict**: consistent — same error class with relevant context.

## conclusion

all conventions match extant patterns:
- directory: `domain.operations/{domain}/`
- files: `{verb}{noun}.ts`
- tests: `.test.ts` / `.integration.test.ts`
- CLI: `repo {subcommand}` with `--{flag} <value>`
- errors: `BadRequestError` with context

no divergence found.
