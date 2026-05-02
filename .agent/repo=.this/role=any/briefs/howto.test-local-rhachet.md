# howto: test local rhachet changes

> "if you havin node problems i feel bad for you son, i got 99 problems but npm aint one" — use pnpm

## .tldr

| command | what it runs | when to use |
|---------|--------------|-------------|
| `npx rhachet` / `npx rhx` | local via BASH_ENV wrapper | **preferred** |
| `./node_modules/.bin/rhachet` | local via link | fallback if wrapper absent |
| `./bin/rhx` | local source | only after you change CLI code |

## .the solution

use `npx rhachet` or `npx rhx` for normal operations:

```bash
npx rhachet run --skill say-hello
npx rhx git.repo.test --what unit
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

## .when to use `./bin/rhx`

only after you change CLI source code (e.g., files in `src/contract/cli/`).

```bash
# you changed src/contract/cli/invokeRun.ts
# now test your change:
./bin/rhx say-hello
./bin/run roles boot --repo .this --role any
```

if you did not change CLI code, do not use `./bin/`. use `./node_modules/.bin/rhachet` instead.

## .permissions

to use `./bin/rhx` or `./bin/run`, add to `.claude/settings.json`:

```json
"Bash(./bin/rhx:*)",
"Bash(./bin/run:*)"
```

