# tsdown: dts bundling for external dependencies

## .what

tsdown is a library bundler built on rolldown (rust-based rollup successor) that can bundle external type definitions into a single portable `.d.ts` file, solving the TS2742 transitive dependency problem.

## .why use tsdown

| feature | tsdown | tsup | dts-bundle-generator |
|---------|--------|------|---------------------|
| speed | fastest (rolldown + oxc) | fast (esbuild) | slow |
| dts bundling | native | `--dts-resolve` | native |
| isolatedDeclarations | native oxc support | no | no |
| config | zero-config | zero-config | minimal |
| maintenance | active (official rolldown tool) | active | maintenance mode |

**key advantage**: with `isolatedDeclarations` enabled, tsdown uses oxc-transform which is **40x faster** than tsc on typical files.

---

## installation

```bash
npm install -D tsdown
```

---

## basic usage

```bash
# generate bundled .d.ts
tsdown src/index.ts --dts

# with output directory
tsdown src/index.ts --dts -d dist
```

---

## configuration

### tsdown.config.ts

```typescript
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  dts: true, // or detailed config below
})
```

---

## dts.resolve: bundling external types

by default, tsdown **does not bundle** any dependency types. to inline external types:

### resolve specific packages

```typescript
export default defineConfig({
  dts: {
    resolve: ['simple-log-methods', 'some-other-package'],
  },
})
```

### resolve by pattern (regex)

```typescript
export default defineConfig({
  dts: {
    resolve: [/^@types\//, /^my-internal-/],
  },
})
```

### resolve all external types

```typescript
export default defineConfig({
  dts: {
    resolve: true,
    resolver: 'tsc', // recommended when resolve: true
  },
})
```

---

## dts.resolver: oxc vs tsc

| resolver | speed | compatibility |
|----------|-------|---------------|
| `'oxc'` (default) | faster | may fail on complex setups |
| `'tsc'` | slower | handles edge cases |

### when to use tsc resolver

- `@types/` packages with unusual paths (e.g., `@types/babel__generator`)
- complex type re-exports from deep node_modules
- when oxc fails to resolve types correctly

```typescript
export default defineConfig({
  dts: {
    resolve: true,
    resolver: 'tsc',
  },
})
```

---

## isolatedDeclarations: fast mode

when `isolatedDeclarations: true` in tsconfig.json, tsdown uses **oxc-transform** instead of tsc:

### enable in tsconfig.json

```json
{
  "compilerOptions": {
    "isolatedDeclarations": true,
    "declaration": true
  }
}
```

### performance gains

- **40x faster** than tsc on typical files
- **20x faster** on larger files
- real-world: 76s → 16s (reported by @sxzz)

### requirement

all exported functions must have **explicit return types**:

```typescript
// ❌ fails with isolatedDeclarations
export const createThing = () => new Thing();

// ✅ works with isolatedDeclarations
export const createThing = (): Thing => new Thing();
```

---

## dependency handling

### default behavior

| dependency type | bundled? |
|-----------------|----------|
| `dependencies` | no (external) |
| `peerDependencies` | no (external) |
| `devDependencies` | only if imported |
| phantom (unlisted) | only if imported |

### force bundle a package

```typescript
export default defineConfig({
  noExternal: ['some-package'],
})
```

### force externalize a package

```typescript
export default defineConfig({
  external: ['lodash', /^@my-scope\//],
})
```

---

## declaration maps

for go-to-definition to original `.ts` sources:

```typescript
export default defineConfig({
  dts: {
    sourcemap: true,
  },
})
```

or in tsconfig.json:

```json
{
  "compilerOptions": {
    "declarationMap": true
  }
}
```

---

## complete example: solving TS2742

for a package like `as-procedure` that exposes types from `simple-log-methods`:

### tsdown.config.ts

```typescript
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: {
    resolve: ['simple-log-methods'], // inline this transitive dep's types
  },
})
```

### package.json

```json
{
  "scripts": {
    "build": "tsdown"
  },
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

### result

before bundling:
```typescript
// dist/index.d.ts
import { LogMethods } from 'simple-log-methods';
export interface Context { log: LogMethods; }
```

after bundling with `resolve: ['simple-log-methods']`:
```typescript
// dist/index.d.ts
interface LogMethods { /* inlined */ }
export interface Context { log: LogMethods; }
```

consumers no longer need `simple-log-methods` resolvable in their node_modules.

---

## under the hood

tsdown uses [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts) internally:

1. **generation**: uses oxc-transform (fast) or tsc (compatible) to emit `.d.ts`
2. **bundling**: rolldown bundles multiple `.d.ts` files into one
3. **resolution**: oxc-resolver or tsc resolves external type paths
4. **inlining**: matched `resolve` patterns get their types copied inline

---

## cli reference

```bash
tsdown [entry] [options]

options:
  --dts              generate declaration files
  --dts.resolve      resolve external types (comma-separated)
  -d, --outDir       output directory
  --format           output format (esm, cjs, iife)
  --external         external packages (comma-separated)
  --noExternal       force bundle packages (comma-separated)
```

---

## sources

- [tsdown documentation](https://tsdown.dev/guide/)
- [tsdown dts options](https://tsdown.dev/options/dts)
- [tsdown dependencies options](https://tsdown.dev/options/dependencies)
- [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)
- [GitHub - rolldown/tsdown](https://github.com/rolldown/tsdown)
- [Alan Norbauer - Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/)
- [oxc-resolver Issue #549 - DTS Resolver](https://github.com/oxc-project/oxc-resolver/issues/549)
- [Oxc Transformer Alpha](https://oxc.rs/blog/2024-09-29-transformer-alpha.html)
- [@sxzz on X - tsdown announcement](https://x.com/sanxiaozhizi/status/1806016123441422662)
- [@sxzz on X - tsc fallback support](https://x.com/sanxiaozhizi/status/1912420516541145397)
