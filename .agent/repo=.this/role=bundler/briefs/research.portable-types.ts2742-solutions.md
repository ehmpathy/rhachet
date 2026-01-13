# portable typescript types: TS2742 solutions research

## .what

comprehensive research on how the typescript ecosystem solves the "inferred type cannot be named" (TS2742) error when types from transitive dependencies are exposed in public API declarations.

## .problem

when a package's public API exposes types from transitive dependencies, typescript's declaration emit writes import paths that trace back to the original module. with pnpm's strict `node_modules` structure, these paths end up at non-portable locations like `.pnpm/package@version/node_modules/...`.

```
error TS2742: The inferred type of 'X' cannot be named without a reference to
'.pnpm/simple-log-methods@0.6.9/node_modules/simple-log-methods'.
This is likely not portable. A type annotation is necessary.
```

## .root cause

1. **typescript design**: declaration emit traces types to their original source module, not re-export paths
2. **pnpm isolation**: transitive dependencies are at `.pnpm/` paths, not hoisted
3. **no native bundling**: typescript intentionally delegates declaration bundling to third-party tools

---

# solutions overview

## solution categories

| category | approach | when to use |
|----------|----------|-------------|
| **declaration bundling** | inline external types into single .d.ts | library authors publishing npm packages |
| **pnpm hoisting** | hoist transitive deps to root | quick fix for consumers |
| **explicit dependencies** | add transitive as direct dep | simple cases |
| **peer dependencies** | declare types as peer deps | types need version alignment |
| **isolated declarations** | TS 5.5+ fast emit | new projects with explicit annotations |

---

# solution 1: declaration bundling tools

the recommended approach for library authors is to bundle declarations, inlining external types.

## tool comparison

| tool | speed | config | features | maintained |
|------|-------|--------|----------|------------|
| **tsup** | fast (esbuild) | zero-config | `--dts-resolve` | active |
| **api-extractor** | medium | complex | trimming, release tags | microsoft |
| **dts-bundle-generator** | slow | minimal | simple, reliable | maintenance mode |
| **rollup-plugin-dts** | medium | rollup config | integrates with rollup | maintenance mode |
| **tsdown** | fastest (rolldown) | zero-config | successor to tsup | active |
| **unbuild/mkdist** | fast | minimal | bundleless option | active |

### tsup (recommended for most cases)

```bash
# bundle declarations with external types inlined
tsup src/index.ts --dts-resolve -d dist

# force inline specific packages even if in dependencies
tsup src/index.ts --dts-resolve --noExternal some-package -d dist
```

**key limitation**: `--dts-resolve` excludes packages in `dependencies` by default. use `--noExternal` to force inlining.

**sources**:
- [tsup documentation](https://tsup.egoist.dev/)
- [LogRocket - Using tsup to bundle your TypeScript package](https://blog.logrocket.com/tsup/)
- [tsup Discussion #795 - How tsup can bundle .d.ts?](https://github.com/egoist/tsup/discussions/795)
- [tsup Issue #907 - dts resolve types from peer/dependencies](https://github.com/egoist/tsup/issues/907)
- [DEV.to - Rollup dts file using TSUP](https://dev.to/egoist/rollup-dts-file-using-tsup-2579)

### @microsoft/api-extractor

```bash
npm i -D @microsoft/api-extractor
npx api-extractor init
npx api-extractor run
```

**features**:
- trimmed rollups by release tag (`@public`, `@beta`, `@internal`)
- API report generation
- documentation model output

**sources**:
- [@microsoft/api-extractor npm](https://www.npmjs.com/package/@microsoft/api-extractor)
- [API Extractor - Configuring a .d.ts rollup](https://api-extractor.com/pages/setup/configure_rollup/)
- [API Extractor - The .d.ts rollup](https://api-extractor.com/pages/overview/demo_rollup/)
- [Medium - How to Bundle .d.ts Declaration Files with API-Extractor](https://medium.com/full-human/how-to-bundle-d-ts-declaration-files-with-api-extractor-cf6669ed15d4)

### dts-bundle-generator

```bash
npm i -D dts-bundle-generator
dts-bundle-generator -o dist/index.d.ts src/index.ts
```

**note**: slower than alternatives but works reliably with any TypeScript version >= 2.6.1.

**sources**:
- [dts-bundle-generator Discussion #68 - Tools comparison](https://github.com/timocov/dts-bundle-generator/discussions/68)

### rollup-plugin-dts

```javascript
// rollup.config.js
import dts from 'rollup-plugin-dts';

export default {
  input: './dist/index.d.ts',
  output: { file: 'dist/index.bundled.d.ts', format: 'es' },
  plugins: [dts()],
};
```

**note**: in maintenance mode. considers external libraries from `@types` as external by default.

**sources**:
- [rollup-plugin-dts npm](https://www.npmjs.com/package/rollup-plugin-dts)
- [GitHub - Swatinem/rollup-plugin-dts](https://github.com/Swatinem/rollup-plugin-dts)
- [Medium - TypeScript library tips: Rollup your types!](https://medium.com/@martin_hotell/typescript-library-tips-rollup-your-types-995153cc81c7)

### tsdown (emerging)

```bash
npm i -D tsdown
tsdown src/index.ts --dts
```

**built on rolldown** (rust-based). claims to be faster than tsup with `--isolated-declarations`.

**sources**:
- [tsdown documentation](https://tsdown.dev/guide/)
- [tsdown - Dependencies](https://tsdown.dev/options/dependencies)
- [Alan Norbauer - Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/)

### rslib

```javascript
// rslib.config.ts
export default {
  lib: [{ format: 'esm', dts: { bundle: true } }],
};
```

**features**: uses api-extractor under the hood for bundling. supports experimental tsgo for faster generation.

**sources**:
- [Rslib - Declaration files](https://rslib.rs/guide/advanced/dts)
- [Rslib - lib.dts config](https://rslib.rs/config/lib/dts)
- [Rslib - Introducing Rslib](https://rslib.rs/blog/introducing-rslib)

---

# solution 2: pnpm hoisting workarounds

for consumers who can't modify upstream packages, pnpm provides hoisting options.

## public-hoist-pattern (recommended)

```ini
# .npmrc
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
```

hoists matching packages to `node_modules/` root, making them resolvable by typescript.

## shamefully-hoist (nuclear option)

```ini
# .npmrc
shamefully-hoist=true
```

equivalent to `public-hoist-pattern=*`. hoists everything, losing pnpm's isolation benefits.

## packageExtensions

```yaml
# pnpm-workspace.yaml
packageExtensions:
  'some-package':
    peerDependencies:
      '@types/node': '*'
```

adds missing peer dependencies to packages.

**sources**:
- [pnpm - Working with TypeScript](https://pnpm.io/typescript)
- [pnpm - Settings (.npmrc)](https://pnpm.io/9.x/npmrc)
- [pnpm Discussion #5535 - Issues with TypeScript types not being hoisted](https://github.com/orgs/pnpm/discussions/5535)
- [pnpm Discussion #6367 - pnpm, hoisting and TypeScript monorepos](https://github.com/orgs/pnpm/discussions/6367)
- [pnpm Issue #2628 - feat: public-hoist-pattern](https://github.com/pnpm/pnpm/issues/2628)
- [pnpm blog - Node-Modules configuration options](https://pnpm.io/blog/2020/10/17/node-modules-configuration-options-with-pnpm)

---

# solution 3: explicit type annotations

add explicit return types to avoid inference issues.

```typescript
// before: TS2742 error
export const createThing = () => {
  return new ExternalThing(); // type inferred from transitive dep
};

// after: explicit annotation
import type { ExternalThing } from 'external-package';
export const createThing = (): ExternalThing => {
  return new ExternalThing();
};
```

**limitation**: requires modifying source code; doesn't solve the underlying portability issue.

**sources**:
- [TypeScript Issue #42873 - type annotation is necessary](https://github.com/microsoft/TypeScript/issues/42873)
- [TypeScript Issue #30858 - transitive dependencies causing errors](https://github.com/microsoft/TypeScript/issues/30858)

---

# solution 4: add transitive as direct dependency

```json
{
  "dependencies": {
    "direct-dep": "^1.0.0",
    "transitive-dep-types": "^1.0.0"
  }
}
```

**pros**: simple, works immediately
**cons**: manual sync required, version drift risk

**sources**:
- [pnpm Issue #5355 - Typescript types constructed through transitive dependencies](https://github.com/pnpm/pnpm/issues/5355)
- [pnpm Issue #6089 - cannot be named without a reference](https://github.com/pnpm/pnpm/issues/6089)

---

# solution 5: peer dependencies

for types that should align with consumer's version:

```json
{
  "peerDependencies": {
    "@types/react": ">=17"
  },
  "devDependencies": {
    "@types/react": "^18.0.0"
  }
}
```

**sources**:
- [DefinitelyTyped Issue #56011 - Writing type definitions for packages using peer dependencies](https://github.com/DefinitelyTyped/DefinitelyTyped/issues/56011)
- [TypeScript Issue #11671 - Prevent dependency hell](https://github.com/Microsoft/TypeScript/issues/11671)
- [DEV.to - A tip on using peer dependencies with TypeScript](https://dev.to/jody/a-tip-on-using-peer-dependencies-with-typescript-2bji)
- [DefinitelyTyped Issue #20290 - Allow peerDependencies in package.json](https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20290)

---

# future: isolated declarations (TS 5.5+)

typescript 5.5 introduced `isolatedDeclarations` which enables fast declaration emit without type inference.

```json
{
  "compilerOptions": {
    "isolatedDeclarations": true,
    "declaration": true
  }
}
```

**requirement**: all exported functions must have explicit return types.

**benefit**: enables non-typescript tools (esbuild, swc, bun) to generate declarations natively.

**sources**:
- [TypeScript 5.5 Documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)
- [TypeScript Issue #47947 - isolatedDeclarations for standalone DTS emit](https://github.com/microsoft/TypeScript/issues/47947)
- [TypeScript PR #53463 - Isolated declarations](https://github.com/microsoft/TypeScript/pull/53463)
- [marvinh.dev - Speeding up the JavaScript ecosystem - Isolated Declarations](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-10/)
- [gitnation - Faster TypeScript builds with --isolatedDeclarations](https://gitnation.com/contents/faster-typescript-builds-with-isolateddeclarations)
- [arshadyaseen.com - Speeding up TypeScript Library Development](https://www.arshadyaseen.com/writing/isolated-declarations)

---

# why typescript doesn't bundle natively

typescript's design philosophy is "one .d.ts per .js file". bundling was intentionally left to third-party tools.

**key issues**:
- [TypeScript Issue #4433 - Proposal: Bundling TS module type definitions](https://github.com/microsoft/TypeScript/issues/4433) - "In Discussion", no consensus
- [TypeScript Issue #4434 - Proposal: Bundling TS modules](https://github.com/Microsoft/TypeScript/issues/4434) - marked "Out of Scope"
- [TypeScript Issue #8372 - Support --declarationOutFile](https://github.com/microsoft/TypeScript/issues/8372)

**rationale**: typescript team believes bundling is the job of bundlers, not the compiler.

---

# bundler-specific limitations

## esbuild

esbuild cannot generate `.d.ts` files - it strips types without retaining type information.

**workaround**: run `tsc --emitDeclarationOnly` alongside esbuild.

**sources**:
- [esbuild Issue #95 - support to output declaration files](https://github.com/evanw/esbuild/issues/95)
- [esbuild Issue #855 - Can esbuild generate types.d.ts?](https://github.com/evanw/esbuild/issues/855)
- [esbuild Issue #3775 - Generate TypeScript declarations with isolatedDeclarations](https://github.com/evanw/esbuild/issues/3775)

## swc

swc has experimental `emitIsolatedDts` but with limitations.

**sources**:
- [swc Issue #657 - Generates corresponding .d.ts file](https://github.com/swc-project/swc/issues/657)
- [swc Issue #9512 - emitIsolatedDts does not emit with --out-file](https://github.com/swc-project/swc/issues/9512)

## bun

bun's bundler doesn't natively generate `.d.ts`. community plugins available.

**sources**:
- [Bun Issue #5141 - Generate type declarations during bun build](https://github.com/oven-sh/bun/issues/5141)
- [GitHub - wobsoriano/bun-plugin-dts](https://github.com/wobsoriano/bun-plugin-dts)
- [GitHub - stacksjs/bun-plugin-dtsx](https://github.com/stacksjs/bun-plugin-dtsx)

---

# related typescript issues

## TS2742 specific

- [TypeScript Issue #47663 - multiple modules with same package ID](https://github.com/microsoft/TypeScript/issues/47663)
- [TypeScript Issue #58914 - npm link packages manually](https://github.com/microsoft/TypeScript/issues/58914)
- [TypeScript Issue #36800 - types in transitive dependencies](https://github.com/microsoft/TypeScript/issues/36800)
- [typescript-go Issue #1034 - pnpm Error 2742](https://github.com/microsoft/typescript-go/issues/1034)
- [typescript-eslint Issue #10893 - TS2742 with composite and pnpm](https://github.com/typescript-eslint/typescript-eslint/issues/10893)
- [Prisma Issue #28581 - TS2742 errors with pnpm monorepo](https://github.com/prisma/prisma/issues/28581)
- [yarn/berry Issue #227 - Bug TS2742](https://github.com/yarnpkg/berry/issues/227)

## phantom dependencies

- [radix-ui Issue #1896 - phantom dependency on @types/react](https://github.com/radix-ui/primitives/issues/1896)
- [typescript-eslint Issue #3622 - phantom dependency on typescript](https://github.com/typescript-eslint/typescript-eslint/issues/3622)
- [DefinitelyTyped Issue #55519 - @types/node dependencies](https://github.com/DefinitelyTyped/DefinitelyTyped/issues/55519)

---

# monorepo considerations

## project references

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "references": [{ "path": "../other-package" }]
}
```

**sources**:
- [TypeScript Documentation - Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [moonrepo - TypeScript project references](https://moonrepo.dev/docs/guides/javascript/typescript-project-refs)
- [Nx Blog - Managing TypeScript Packages in Monorepos](https://nx.dev/blog/managing-ts-packages-in-monorepos)
- [Turborepo - TypeScript in a monorepo](https://turbo.build/repo/docs/handbook/linting/typescript)
- [LogRocket - Boost your productivity with TypeScript project references](https://blog.logrocket.com/boost-your-productivity-with-typescript-project-references/)
- [colinhacks.com - Live types in a TypeScript monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo)

---

# best practices for library authors

## package.json configuration

```json
{
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

## tsconfig.json for libraries

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

**sources**:
- [TypeScript Documentation - Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [Node.js - Publishing a TypeScript package](https://nodejs.org/en/learn/typescript/publishing-a-ts-package)
- [liblab.com - TypeScript npm packages done right](https://liblab.com/blog/typescript-npm-packages-done-right)
- [Snyk - Best Practices for Creating a Modern npm Package](https://snyk.io/blog/best-practices-create-modern-npm-package/)
- [DEV.to - In-Depth guide for TypeScript Library](https://dev.to/imjuni/in-depth-guide-for-typescript-library-project-o1j)

---

# recommendation

for the `as-procedure` / `simple-log-methods` case:

1. **fix at the source**: add `tsup --dts-resolve` to `as-procedure`'s build
2. this inlines `simple-log-methods` types into `as-procedure`'s declarations
3. all downstream consumers (rhachet, rhachet-roles-*) get portable types automatically

```bash
# in as-procedure
tsup src/index.ts --dts-resolve -d dist --tsconfig tsconfig.build.json
```

this is the cleanest solution: one fix at the source benefits the entire dependency tree.

---

# sources summary

this report synthesizes information from 50+ sources including:
- 15+ TypeScript GitHub issues
- 10+ pnpm GitHub issues and discussions
- official documentation for tsup, api-extractor, rollup-plugin-dts, rslib, tsdown
- TypeScript 5.5 isolated declarations documentation
- npm package publishing best practices from Node.js, Snyk, liblab
- bundler limitations documentation (esbuild, swc, bun)
- monorepo tooling documentation (Nx, Turborepo, moonrepo)
