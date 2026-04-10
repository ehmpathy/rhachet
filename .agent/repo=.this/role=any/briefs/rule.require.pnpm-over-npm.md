# rule.require.pnpm-over-npm

## .what

always use pnpm. avoid npm like the plague.

## .why

npm has fundamental performance defects locked in for backwards compatibility:
- flat node_modules creates massive duplication
- slow dependency resolution
- inefficient disk usage
- network-heavy even for cached packages

pnpm is built correctly from the ground up:
- content-addressable store = no duplication
- hard links = instant installs from cache
- strict node_modules = catches phantom dependencies
- fast, efficient, reliable

## .how

### for local installs

```bash
# good
pnpm install
pnpm add zod

# avoid
npm install
npm install zod
```

### for global installs

```bash
# good
pnpm add -g rhachet

# avoid
npm install -g rhachet
```

### in code

detect pnpm first, fall back to npm only if pnpm unavailable:

```typescript
const usePnpm = isPnpmAvailable();
const pm = usePnpm ? 'pnpm' : 'npm';
```

## .note: npm aliased to pnpm

some users alias `npm` to `pnpm` in their shell config:

```bash
alias npm='pnpm'
```

this means:
- invoke `npm` may actually run `pnpm`
- output formats will differ (pnpm vs npm style)
- code that parses npm output must handle both formats

when code invokes package managers:
1. prefer explicit `pnpm` command
2. if npm fallback needed, handle both output formats

## .enforcement

- use npm when pnpm is available = blocker
- hardcode npm without pnpm detection = blocker
