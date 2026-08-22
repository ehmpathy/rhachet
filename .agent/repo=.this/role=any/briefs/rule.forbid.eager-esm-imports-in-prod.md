# rule.forbid.eager-esm-imports-in-prod

## .what

rhachet's own production source (`src/**`, apart from `*.test.ts` / test assets) must NOT
**eagerly** (top-level, static) `import` a **pure-esm** package — one whose `package.json` carries
`"type": "module"` (and exposes no commonjs-loadable entry). load such a package **lazily** at
call time via the extant `importEsmSafe` boundary instead.

a pure-esm package is fine as a dependency; the ban is on the **eager static import of it in
shipped source**, which tsc compiles to a `require(...)` in `dist/`.

## .why

rhachet ships as **commonjs** (`tsconfig.json` `module: commonjs`; `package.json` `type` absent).
tsc down-levels every top-level `import x from 'pkg'` into `require('pkg')` in the built `dist/`.
node's commonjs loader **cannot `require()` a pure-esm package** — it throws
`Must use import to load ES Module`.

so a single eager static import of a pure-esm package in rhachet's source becomes a **landmine in
every consumer's `dist/`**: the moment anything does a CJS `require('rhachet')`, module-eval walks
into that `require('pkg')` and throws. this hits two common places:

1. **downstream jest** (CJS `testEnvironment`, ts-jest / `@swc/jest`) — a test that exercises real
   brain auto-discovery requires rhachet transitively and crashes.
2. **a brain package's compiled CJS** — it `require('rhachet')`, which evaluates rhachet's modules,
   which hit the pure-esm `require(...)`.

the failure is **silent and deceptive**: brain auto-discovery catches the load error, degrades to
`{ atoms: [], repls: [] }`, and emits only a `console.warn` — so it surfaces downstream as
`BrainChoiceNotFoundError` / `available.atoms: []`, not as the real ESM/CJS boundary error. it also
**fans out**: because every brain package's peer chain pulls in rhachet, ONE pure-esm require in
rhachet empties the registry for ALL providers. (ehmpathy/rhachet#468, #429.)

module eval is **fail-fast**: it throws on the FIRST pure-esm `require` it hits. so "the repro only
names package X" does NOT mean X is the only landmine — fix X and the next one throws. audit the
whole eval graph, not just the named culprit.

## .the fix pattern

replace the eager static import with a lazy load. pick the boundary by WHERE the dep must load:

- **loaded only in prod (real node)** → `importEsmSafe` (a genuine `import()`).
- **also loaded by rhachet's OWN jest tests** (e.g. keyrack crypto / github-app auth run REAL, no
  mocks) → `importEsmOrRequire` — a runtime-aware boundary: `importEsmSafe`'s `import()` in real
  node, a `require()` under jest (jest cannot `import()` a pure-esm package without
  `--experimental-vm-modules`, which breaks the shared harness; rhachet's jest config down-levels
  the dep to cjs so a `require()` works). BOTH keep the eager static import out of `dist/` — the
  `require()` is a *dynamic*, jest-only, in-function call, never at module-eval, so it is NOT the
  landmine (a downstream `require('rhachet')` never touches it).

```ts
// 👎 forbidden — eager static import of a pure-esm package (tsc → require() in dist)
import * as age from 'age-encryption';

export const encrypt = async (input) => {
  const encrypter = new age.Encrypter();
  // ...
};
```

```ts
// 👍 required — the shared lazy loader (age is rhachet's OWN dep → bare specifier).
// getOneLazyEsmModuleLoader wraps importEsmOrRequire (a genuine import() in real node, a require()
// under jest) with memoize + single-flight + fail-loud, so every keyrack landmine loads through ONE
// tested seam instead of a per-adapter copy.
import { getOneLazyEsmModuleLoader } from '@src/infra/importEsmSafe/getOneLazyEsmModuleLoader';

type AgeModule = typeof import('age-encryption');
const getOneAgeModule = getOneLazyEsmModuleLoader<AgeModule>({
  specifier: 'age-encryption',
  purpose: 'keyrack crypto',
});

export const encrypt = async (input) => {
  const age = await getOneAgeModule();  // one load, cached; fails loud if genuinely broken
  const encrypter = new age.Encrypter();
  // ...
};
```

the shared `getOneLazyEsmModuleLoader` guarantees (so callers do not re-implement them):

- the caller function must be (or become) `async` — all current keyrack crypto fns already are.
- **name the loader `getOne$Module`** — a `get` verb needs `One`/`All` cardinality
  (`rule.require.get-set-gen-verbs`).
- **memoize + single-flight** — the in-flight promise is cached, so concurrent first callers share
  ONE load; a failed load is NOT cached, so a later call re-attempts (fail loud, then allow recovery).
- **fail loud + actionable** — a load failure throws a `MalfunctionError` that names the module AND
  the fix; a raw import error is non-actionable (`rule.require.failloud` / the ergonomist's
  `rule.require.errors-name-the-fix`). the `purpose` composes the message
  (`failed to load the <specifier> module for <purpose>`).
- **runtime-aware hint** — the hint is derived by `getOneEsmLoadFailureHint`, which keys off
  `JEST_WORKER_ID` so a jest-branch failure names the consumer's own jest transform +
  transformIgnorePatterns fix (NOT rhachet's own @swc/jest — this ships in rhachet's dist and runs
  inside downstream jest processes too) and a real-node failure names the esm-load fix.
- **detect jest DETERMINISTICALLY** — `importEsmOrRequire` chooses its branch by
  `process.env.JEST_WORKER_ID !== undefined` (jest sets it in every worker), NEVER by a match on an
  import error's message text. a message-text guess is fragile (a jest reword silently disables the
  fallback; an unrelated failure whose text held the phrase would misroute a real-node `require()`
  of a pure-esm package). the env flag makes the branch a function of the runtime, not of message text.
- for rhachet's **own** deps, a **bare specifier** is correct (it looks up from `importEsmSafe`'s
  own location = rhachet's dist). the `getOnePackageEntryUrl` / `file://` machinery is for
  **caller-repo** brain/role packages, not own-deps.

## .how to detect

- **audit source**: grep `src/**/*.ts` for a top-level `import ... from '<pkg>'` where
  `node_modules/<pkg>/package.json` has `"type": "module"` and no commonjs entry.
- **the honest witness is the BUILT dist, not the source** — `@swc/jest` may keep `import()` native
  and mask the defect; only the tsc `dist/` under a real-node CJS `require()` reproduces it. clamp
  with a `.realnode.acceptance.test.ts` that `require()`s the built module under CJS.
- **make the clamp's teeth environment-independent** — do NOT assert "the `require()` throws the ESM
  error", because a modern node CAN `require()` an esm package, so that signal is node-version-bound
  and can false-pass. instead hook `Module._load` in the probe to record which specifiers the
  module-eval `require()`s, and assert the pure-esm packages are ABSENT from that eval graph
  (RED before the fix — the static import puts them in the graph; GREEN after — the lazy load keeps
  them out). pair it with a real functional call (e.g. an encrypt→decrypt roundtrip) so the
  lazy-loaded shape is proven to work, not merely absent.
- **prove the fail-loud path too** — jest itself cannot `import()` a pure-esm package (no
  `--experimental-vm-modules`), so a jest unit test is the natural place to assert the load-failure
  branch surfaces the actionable `MalfunctionError`, not a bare import error.

## .known-safe vs known-landmine (as of #468)

a landmine is a `type: module` package with NO cjs `require` path (a bare `require()` of it hits an
esm file and throws). a `type: module` package that ALSO exposes a cjs entry (a `require` export
condition, or a `.cjs` main) is dual-published and require()s cleanly — NOT a landmine (e.g. `zod`).

| package | `type: module`? | cjs require path? | verdict |
|---------|-----------------|-------------------|---------|
| `age-encryption` | yes | no | **lazy-load** (fixed) |
| `@octokit/auth-app` | yes | no | **lazy-load** (fixed — second landmine, same keyrack graph) |
| `@noble/curves`, `@noble/hashes`, `@scure/base` | yes | no | **lazy-load** (fixed — third landmine, ssh-crypto files in the keyrack graph via the vault adapters) |
| `zod` | yes | yes (`require` condition + `.cjs` main) | eager import OK (dual-published, require()s cleanly) |

## .scope

- rhachet production source: `src/**` apart from `*.test.ts`, `*.integration.test.ts`,
  `*.acceptance.test.ts`, and `src/.test/`, `blackbox/.test/` assets.
- test files may import a pure-esm package statically — they run inside jest, where config handles
  it, and never ship in `dist/`.
- transitive esm deps of a package need NO separate treatment: a lazy `import()` of the top-level
  package pulls its whole dependency graph through the esm-capable loader.

## .enforcement

- an eager top-level static import of a pure-esm (`type: module`, no cjs entry) package in rhachet
  production source = **blocker**.
- a fix that neutralizes only the ONE package a repro named, without an audit of the rest of the
  eval graph for peer pure-esm imports = **blocker**.

## .see also

- `src/infra/importEsmSafe/importEsmSafe.ts` — the lazy dynamic-import boundary (its doc-note names
  age-encryption as the harness-breaker)
- `src/infra/importEsmSafe/getOnePackageEntryUrl.ts` — caller-repo lookup (for brain packages, NOT
  own-deps)
- `.behavior/v2026_07_26.fix-brains-esm-dynamic-import/` — the outer-boundary fix (rhachet's load of
  a brain *package* via `importEsmSafe`)
- `.behavior/v2026_08_16.fix-consumer-jest/` — the inner-boundary fix (rhachet's own age-encryption
  / @octokit/auth-app require) this rule generalizes
- ehmpathy/rhachet#468, ehmpathy/rhachet#429
