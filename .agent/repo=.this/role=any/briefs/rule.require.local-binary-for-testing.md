# rule.require.local-binary-for-testing

## .what

when testing built features in this repo, always use `./node_modules/.bin/rhx` not `rhx` or `npx rhx`.

## .why

- `rhx` may point to a globally installed version (stale)
- `npx rhx` may use npm cache (stale)
- `./node_modules/.bin/rhx` uses the local build (current)

testing with stale builds wastes time debugging already-fixed issues.

## .pattern

```bash
# good — uses local build
./node_modules/.bin/rhx keyrack unlock --owner ehmpath --env test

# bad — may use stale global/cached version
rhx keyrack unlock --owner ehmpath --env test
npx rhx keyrack unlock --owner ehmpath --env test
```

## .enforcement

testing built feature with non-local binary = blocker
