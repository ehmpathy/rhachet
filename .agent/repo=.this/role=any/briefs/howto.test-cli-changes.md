# howto: test CLI changes in this repo

## .what

this repo uses `"rhachet": "link:."` in package.json. changes to CLI code require `npm run build` before `./node_modules/.bin/rhachet` reflects them.

## .why

- `./node_modules/.bin/rhachet` runs from `dist/` (compiled output)
- source changes in `src/` are not visible until built
- bun binaries are compiled from source during build

## .pattern

```bash
# after changing CLI code (src/contract/cli/*.ts)
npm run build

# now test your changes
./node_modules/.bin/rhachet <command>
```

## .when

run `npm run build` after changing:
- `src/contract/cli/*.ts` — CLI command handlers
- `src/domain.operations/**/*.ts` — domain logic used by CLI
- any code imported by CLI entry points

## .skip build when

- changes are test-only (*.test.ts)
- changes are in `.agent/` (briefs, skills)
- running extant tests (`npm run test:*`)

## .common mistake

```bash
# change src/contract/cli/invokeRepoCompile.ts
./node_modules/.bin/rhachet repo compile --help  # still shows old behavior!

# fix: build first
npm run build
./node_modules/.bin/rhachet repo compile --help  # now reflects changes
```
