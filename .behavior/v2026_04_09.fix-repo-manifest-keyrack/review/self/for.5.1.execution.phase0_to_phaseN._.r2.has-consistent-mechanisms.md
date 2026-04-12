# self-review: has-consistent-mechanisms

## mechanisms reviewed

### 1. getAllFilesByGlobs vs getAllFilesFromDir

| aspect | getAllFilesFromDir | getAllFilesByGlobs |
|--------|-------------------|-------------------|
| purpose | simple recursive enumeration | glob-based discovery with filtering |
| patterns | none | yes (include/exclude) |
| precedence | none | rsync-style (user > default) |
| use case | list all files | selective artifact collection |

**verdict**: not a duplicate. different purposes.
- getAllFilesFromDir enumerates everything
- getAllFilesByGlobs selects by pattern with precedence rules

### 2. copyFileSync vs upsertFile

| aspect | upsertFile | copyFileSync |
|--------|-----------|--------------|
| operation | write content | copy file |
| output | console.log with [created]/[updated] | silent |
| return | { effect: 'CREATED' | 'UPDATED' } | void |

**verdict**: deliberate choice to use copyFileSync.
- upsertFile has console.log side effects incompatible with my output style
- repo compile has its own output format (role: N files)
- copyFileSync is simpler for copy-only operations

blueprint suggested `[~] upsertFile.ts (add copyFile variant)` but native fs is sufficient.

### 3. getRoleRegistry loading pattern

compared invokeRepoCompile with invokeRepoIntrospect:

```ts
// both use identical pattern:
const entryPoint: string = packageJson.main ?? 'index.js';
const entryPath = path.join(gitRoot, entryPoint);
const localRequire = createRequire(path.join(gitRoot, 'package.json'));
const packageExports: { getRoleRegistry?: () => RoleRegistry } = localRequire(entryPath);
```

**verdict**: consistent with extant pattern. reused the approach from invokeRepoIntrospect.

### 4. repo subcommand registration

invokeRepoIntrospect creates the `repo` command.
invokeRepoCompile finds or creates:

```ts
const repoCommand =
  program.commands.find((c) => c.name() === 'repo') ??
  program.command('repo').description('repository management commands');
```

**verdict**: correct defensive pattern. avoids duplicate command registration.

## conclusion

no duplicate mechanisms found. each new component serves a distinct purpose or reuses extant patterns correctly.
