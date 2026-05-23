# howto: test local rhachet changes

> "if you havin node problems i feel bad for you son, i got 99 problems but npm aint one" — use pnpm

## .tldr

| command | what it runs | when to use |
|---------|--------------|-------------|
| `npx rhx` / `rhx` | local via BASH_ENV wrapper | **always** |
| `npx rhachet` | local via BASH_ENV wrapper | **always** |

**NEVER use `./bin/rhx` or `./bin/run` directly.**

## .the solution

use `npx rhachet` or `npx rhx` for all operations:

```bash
npx rhachet run --skill say-hello
npx rhx git.repo.test --what unit
rhx route.drive
rhx route.stone.set --stone my-stone --as passed
```

the BASH_ENV wrapper routes these to `./node_modules/.bin/` automatically — no latency penalty.

## .if npx routes to stale cache

if `npx rhx` fails with "run: not found" or similar, you need the npx wrapper.

add to `~/.bash_aliases` (or similar):

```bash
npx() {
  local cmd="$1"
  if [[ -n "$cmd" && -x "./node_modules/.bin/$cmd" ]]; then
    shift
    "./node_modules/.bin/$cmd" "$@"
  elif [[ -f "package-lock.json" ]]; then
    command npx "$@"
  else
    pnpm exec "$@"
  fi
}
```

then set `BASH_ENV=~/.bash_aliases` in your shell profile to load it in non-interactive shells (e.g., CI, Claude Code).

## .forbidden patterns

**NEVER** use these patterns:
- `./bin/rhx` — bypasses node_modules resolution
- `./bin/run` — bypasses node_modules resolution

always use `npx rhx`, `rhx`, or `npx rhachet` instead.
