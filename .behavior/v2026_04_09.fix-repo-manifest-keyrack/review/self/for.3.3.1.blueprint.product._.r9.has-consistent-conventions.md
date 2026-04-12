# self-review r9: has-consistent-conventions

## summary of r8

r8 identified conventions across directories, files, tests, CLI, and errors. this review verifies WHY each convention holds by trace to extant code.

## convention 1: domain.operations directory

**extant codebase has**:
```
src/domain.operations/
├── actor/
├── manifest/
├── invoke/
├── keyrack/
└── ... (23 total)
```

**blueprint proposes**: `src/domain.operations/compile/`

**why it holds**: the domain is "compile" — singular noun that describes the operation domain. matches all extant directories which are singular nouns (actor, manifest, invoke, keyrack).

## convention 2: verb prefix for operations

**extant patterns**:
- `get*` — retrieval: `getAllFilesFromDir`, `getBrainSlugFull`
- `cast*` — transformation: `castIntoRoleRegistryManifest`, `castBriefsToPrompt`
- `find*` — search: `findActorBrainInAllowlist`
- `compute*` — calculation: `computeBootMode`, `computeBrainSeriesHash`

**blueprint proposes**:
- `getAllArtifactsForRole` — `get*` prefix for retrieval
- `applyArtifactGlobs` — `apply*` prefix for filter
- `applyExclusions` — `apply*` prefix for filter
- `copyFileWithStructure` — `copy*` prefix for copy
- `pruneEmptyDirs` — `prune*` prefix for removal

**question**: does `apply*` match extant patterns?

**searched**: `apply` in src/domain.operations/

**found**: no extant `apply*` operations.

**question**: should we use `filter*` instead?

**considered**: `filterByArtifactGlobs`, `filterByExclusions`

**decision**: `apply*` is clearer because:
1. "filter" suggests removal
2. "apply" suggests transformation via globs/patterns
3. matches semantic intent: "apply these globs to select files"

**verdict**: `apply*` is a new but justified convention for filter-by-pattern operations.

## convention 3: CLI command namespace

**extant pattern**: `rhachet repo introspect`

**blueprint proposes**: `rhachet repo compile`

**why it holds**: both are `repo` subcommands. `introspect` reads state, `compile` transforms state. both operate on the repo.

## convention 4: CLI flag style

**extant pattern** (from invokeRepoIntrospect):
- `--output <path>` — destination flag

**blueprint proposes**:
- `--from <dir>` — source dir
- `--into <dir>` — destination dir

**question**: should we use `--output` instead of `--into`?

**considered**: `--output` vs `--into`

**decision**: `--into` is clearer because:
1. `--from`/`--into` form a symmetric pair
2. `--output` implies stdout option, `--into` is destination dir

**verdict**: `--from`/`--into` is a new but justified convention for source/destination dir flags.

## convention 5: error messages

**extant pattern**:
```ts
throw new BadRequestError('repo introspect must be run inside a rhachet-roles-* package', {
  packageName,
});
```

**blueprint proposes**:
```ts
throw new BadRequestError('briefs dir not found', {
  role: input.role.name,
  dir,
});
```

**why it holds**: same pattern — short message + context object with relevant variables.

## conclusion

r8 findings verified:
- directory names: consistent (singular noun)
- operation verbs: `apply*` is new but justified for filter-by-pattern
- CLI namespace: consistent (`repo` subcommand)
- CLI flags: `--from`/`--into` is new but justified for symmetry
- errors: consistent (BadRequestError + context)

no divergences that block. two new conventions are justified.
