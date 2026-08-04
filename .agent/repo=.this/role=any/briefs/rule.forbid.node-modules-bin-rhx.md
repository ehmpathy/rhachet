# rule.forbid.node-modules-bin-rhx

## .what

to exercise this repo's built cli, always use `npx rhx`. never invoke `./node_modules/.bin/rhx`
directly.

## .why

- `npx rhx` resolves through node_modules the same way a consumer hits the binary, so it
  exercises the real resolution path — the `link:.` self-link that makes a local build the live
  code is honored
- a direct `./node_modules/.bin/rhx` path bypasses that resolution and couples every command to
  an exact filesystem layout that can drift
- one canonical invocation keeps commands portable across the worktree, ci, and a human's box

## .pattern

```bash
# good — resolves via node_modules, exercises the consumer path
npx rhx keyrack unlock --owner ehmpath --env test

# bad — direct binary path, bypasses resolution
./node_modules/.bin/rhx keyrack unlock --owner ehmpath --env test
```

## .note

after a src change, run `npm run build` before `npx rhx` — `bin/run.jit` loads `dist/`, not
`src/`. see `howto.test-local-rhachet.md` for the `link:.` self-link that makes the local build
the live code.

## .enforcement

a `./node_modules/.bin/rhx` invocation = blocker
