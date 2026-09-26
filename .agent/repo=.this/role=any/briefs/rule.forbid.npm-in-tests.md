# rule.forbid.npm-in-tests

## .what

tests never invoke npm. any install a test, a fixture, or test infra performs runs through pnpm.
where pnpm is absent, the test fails fast with a `ConstraintError` that says to install pnpm.
npm is never a fallback.

## .why

- npm is slow: an install re-resolves and re-downloads what pnpm links from its content store
- a test suite pays that cost on every cold cache, on every host, in every ci run
- a fallback hides the slow path: the suite goes quietly slower on a host without pnpm, and no one
  notices
- ⇒ fail fast is the pit of success. the fix is one install, made once

## .how

```ts
// 👍 pnpm required, fail fast
const isPnpmOnPath = spawnSync('pnpm', ['--version'], { stdio: 'pipe' }).status === 0;
if (!isPnpmOnPath)
  throw new ConstraintError('pnpm is required', {
    hint: 'install pnpm: corepack enable pnpm (or see https://pnpm.io/installation)',
  });
spawnSync('pnpm', ['add', pkg, '--dir', prefix, '--ignore-workspace']);

// 👎 npm, direct or as a fallback
spawnSync('npm', ['install', '--prefix', prefix, pkg]);
const pm = isPnpmOnPath ? 'pnpm' : 'npm';
```

🟡 pnpm skips a dependency's postinstall unless allowed. a package that lands a native binary in
postinstall (claude-code does) needs `--allow-build=<pkg>`, or its bin fails at first run.

## .scope

test code and test infra: `*.test.ts`, `blackbox/.test/`, `src/.test/`, and skills that exist to
support tests. prod code that tells a human how to install a tool prefers pnpm and may name npm as
the alternative — that is `rule.require.pnpm-over-npm`.

## .enforcement

- npm invoked from a test, a fixture, or test infra = **blocker**
- npm as a fallback where pnpm is absent, in tests = **blocker**
- an absent pnpm that does not fail fast with a hint = **blocker**

## .see also

- `rule.require.pnpm-over-npm` — the general rule this sharpens for tests
- `rule.require.failfast` (mechanic) — an absent resource fails loud, never skips
