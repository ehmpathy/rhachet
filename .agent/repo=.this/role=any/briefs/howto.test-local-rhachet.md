# howto: test local rhachet changes

## .tldr

| command | what it runs | when to use |
|---------|--------------|-------------|
| `rhx` | global install | **avoid** — may differ from local |
| `./node_modules/.bin/rhachet` | local via link | normal operations |
| `./bin/rhx` | local source | only after you change CLI code |

## .the problem

`rhx` runs whatever is installed globally. in this repo, global may not match local.

## .the solution

use `./node_modules/.bin/rhachet` for normal operations:

```bash
./node_modules/.bin/rhachet run --skill say-hello
./node_modules/.bin/rhachet roles boot --repo .this --role any
```

this runs the local version directly. **avoid `npx rhachet`** — npx adds 500ms-2s latency per invocation.

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

