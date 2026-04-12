# self-review: has-consistent-conventions (r4)

## approach

i searched the codebase for patterns in:
1. CLI handler names (`src/contract/cli/invoke*.ts`)
2. domain operation names (`src/domain.operations/**/*.ts`)
3. infrastructure utility names (`src/infra/**/*.ts`)
4. directory organization patterns

for each name choice in my implementation, i asked:
- does this follow the verb prefix pattern?
- is the term i used already present in the codebase?
- does the structure match how similar code is organized?

## name conventions analyzed

### CLI handlers: invoke* pattern

**search result**: `src/contract/cli/invoke*.ts` returns 25+ files:
- invokeAct, invokeAsk, invokeChoose, invokeEnroll
- invokeRepoIntrospect, invokeRolesBoot, invokeRolesCost, invokeRolesInit, invokeRolesLink
- invokeRun, invokeList, invokeReadme, invokeKeyrack

**my addition**: `invokeRepoCompile.ts`

**why it holds**: the `invoke*` prefix is universal for CLI command handlers in this repo. the pattern is `invoke` + `{CommandName}`. my `invokeRepoCompile` follows this exactly: `invoke` + `RepoCompile`.

the `Repo` prefix matches `invokeRepoIntrospect` — both are subcommands under the `repo` namespace.

### domain.operations: getAll* for enumeration

**search result**: grep for `^export const getAll` in domain.operations found:
- `getAllKeyrackSlugsForEnv`
- `getAllKeyrackEnvsFromRepoManifest`
- `getAllKeyrackGrantsByRepo`
- `getAllKeyrackDaemonSocketPaths`
- `getAllFilesFromDir` (aliased as `getAllFiles`)

**my addition**: `getAllArtifactsForRole`

**why it holds**: the `getAll*` pattern is used for operations that enumerate a collection. the pattern is `getAll` + `{WhatIsEnumerated}` + optional `{Scope}`.

examples:
- `getAllKeyrackSlugsForEnv` = get all slugs, scoped to env
- `getAllKeyrackGrantsByRepo` = get all grants, scoped to repo
- `getAllArtifactsForRole` = get all artifacts, scoped to role ✓

the name matches the pattern exactly.

### infra/filesystem: collocated utilities

**search result**: `src/infra/filesystem/` contains:
- `getAllFilesFromDir.ts` — enumerate files recursively
- `getAllFilesFromDir.test.ts`
- `getAllFilesFromDir.integration.test.ts`

**my addition**: `getAllFilesByGlobs.ts` — enumerate files via glob patterns

**why it holds**: both utilities enumerate files. the difference:
- `getAllFilesFromDir` — enumerate by directory traversal
- `getAllFilesByGlobs` — enumerate by glob pattern match

collocation in `infra/filesystem/` makes sense: both are filesystem enumeration utilities. neither has domain knowledge.

### nested subcommands: repo namespace

**search result**: `invokeRepoIntrospect.ts` introduced the `repo` command:
```ts
program.command('repo').description('repository management commands');
```

**my addition**: `invokeRepoCompile.ts` uses the same namespace:
```ts
const repoCommand =
  program.commands.find((c) => c.name() === 'repo') ??
  program.command('repo').description('repository management commands');
```

**why it holds**: both are repository management operations. `repo introspect` analyzes a repo. `repo compile` compiles a repo. the namespace groups related operations.

the defensive pattern (find or create) ensures load order independence — either command can register first.

### directory structure: domain modules

**search result**: `domain.operations/` contains modules by domain:
- `actor/` — actor operations
- `boot/` — boot operations
- `keyrack/` — keyrack operations
- `brains/` — brain discovery operations

**my addition**: `compile/` — compile operations

**why it holds**: the pattern is one directory per domain concept. `compile` is a distinct concept from `boot`, `keyrack`, etc. it deserves its own module.

alternative considered: put `getAllArtifactsForRole` in `role/`. rejected because:
- `role/` contains operations about roles (enrollThread, getRoleFileCosts)
- `compile/` is specifically about artifact compilation

## issues found

none.

## conclusion

all names and structures match codebase conventions:
- `invokeRepoCompile` follows `invoke*` pattern for CLI handlers
- `getAllArtifactsForRole` follows `getAll*` pattern for enumeration
- `getAllFilesByGlobs` is collocated with related `getAllFilesFromDir`
- `repo compile` shares namespace with `repo introspect`
- `compile/` follows the domain module organization pattern

no new terms introduced where terms already exist. no divergence from conventions detected.
