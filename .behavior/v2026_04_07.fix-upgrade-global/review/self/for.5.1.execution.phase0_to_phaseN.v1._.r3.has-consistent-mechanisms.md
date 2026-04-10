# review: has-consistent-mechanisms

## reviewed for duplication of extant mechanisms

reviewed each new mechanism for overlap with extant codebase functionality.

## search methodology

ran targeted grep searches to find related patterns in the codebase:

```
grep 'npm_execpath|process\.env\.' → 23 files (keyrack, ssh, test infra)
grep 'npm list -g|npm list.*global' → 0 files
grep 'npm install -g|install.*-g' → 2 files (only the new execNpmInstallGlobal)
grep 'spawnSync|execSync' → 32 files (various infra)
```

## new mechanisms

### detectInvocationMethod.ts

**purpose:** detect if invoked via npx or global install by checking `process.env.npm_execpath`

**search findings:**

grep for `npm_execpath` found 2 files — both are the new detectInvocationMethod.ts and its test.

grep for `process.env.` found 23 files in src/ — examined each:
- keyrack files: use process.env for XDG_RUNTIME_DIR, HOME paths
- ssh files: use process.env for HOME, SSH_AUTH_SOCK
- test infra: use process.env for test configuration
- none check npm_execpath for invocation detection

**conclusion:** no extant mechanism detects npx vs global invocation. this is a new capability.

**holds because:** unique purpose (invocation detection), no overlap with extant process.env usages (which are for paths and config, not invocation context).

### getGlobalRhachetVersion.ts

**purpose:** detect current global rhachet version via `npm list -g rhachet --json`

**search findings:**

grep for `npm list -g` and `npm list.*global` found 0 files in src/ (excluding the new file).

grep for `spawnSync` found 32 files — examined upgrade-related ones:
- `execNpmInstall.ts` — spawns `pnpm|npm install` for local packages (with cwd)
- no extant code queries global npm state

**comparison to execNpmInstall.ts:**

| aspect | execNpmInstall | getGlobalRhachetVersion |
|--------|----------------|-------------------------|
| command | `pnpm install` / `npm install` | `npm list -g --json` |
| operation | mutation (install) | query (read-only) |
| scope | local (cwd-scoped) | global (no cwd) |
| output | inherits stdio | parses json response |

**conclusion:** no extant mechanism queries global npm packages. execNpmInstall is for local installs and mutations, not global queries.

**holds because:** fundamentally different operation type (query vs install), different scope (global vs local), different output handling (json parse vs stdio).

### execNpmInstallGlobal.ts

**purpose:** execute `npm install -g` for global package upgrade

**search findings:**

grep for `npm install -g` and `install.*-g` found 2 files — both are the new execNpmInstallGlobal.ts and its test.

examined `execNpmInstall.ts` (the closest extant mechanism):

```typescript
// execNpmInstall.ts (extant) - line 62-66
const result = spawnSync(pm, ['install', ...packagesLatest], {
  cwd: context.cwd,      // local scope
  stdio: 'inherit',      // user sees progress
  shell: true,
});
```

```typescript
// execNpmInstallGlobal.ts (new) - line 15-18
const result = spawnSync('npm', ['install', '-g', ...packagesLatest], {
  stdio: 'pipe',         // returns result
  shell: true,
});
```

**comparison:**

| aspect | execNpmInstall | execNpmInstallGlobal |
|--------|----------------|----------------------|
| scope | local (cwd) | global (-g flag) |
| pkg manager | detects pnpm/npm via lock file | always npm (global is npm-only) |
| output | inherits stdio (user sees progress) | piped (returns result) |
| error handling | UpgradeExecutionError with context | plain Error (fail fast) |
| context required | yes (ContextCli for cwd) | no (global has no cwd) |

**consolidation analysis:**

considered adding `global: boolean` flag to execNpmInstall. rejected because:
1. **no cwd for global** — context.cwd is required for local, meaningless for global
2. **different pkg manager** — global uses npm only; local detects pnpm/npm via lock file
3. **different stdio** — global should be quiet (piped); local shows progress (inherited)
4. **different error context** — local has packages/exitCode; global just fails fast
5. **premature abstraction** — one call site for global; consolidation would add complexity for no reuse benefit

**conclusion:** execNpmInstall and execNpmInstallGlobal are distinct mechanisms despite similar names. the contracts differ in scope, detection, output, and error handling.

**holds because:** consolidation would complicate the extant mechanism for a single call site, violating YAGNI. the separation is intentional and appropriate.

## verdict

no duplication found. each new mechanism serves a distinct purpose not covered by extant code:

| mechanism | purpose | overlap |
|-----------|---------|---------|
| detectInvocationMethod | detect npx vs global invocation | none (new capability) |
| getGlobalRhachetVersion | query global npm package version | none (no global queries extant) |
| execNpmInstallGlobal | install global npm package | similar to execNpmInstall but different contract |

consolidation was considered for execNpmInstallGlobal and rejected — the contracts are fundamentally different (local vs global, detected pm vs npm-only, inherited vs piped stdio).
