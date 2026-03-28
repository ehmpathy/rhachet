# howto: test local rhachet changes

## .tldr

| command | what it runs | when to use |
|---------|--------------|-------------|
| `rhx` | global install | **avoid** — may differ from local |
| `npx rhachet` | local via link | normal operations |
| `./bin/rhx` | local source | only after you change CLI code |

## .the problem

`rhx` runs whatever is installed globally. in this repo, global may not match local.

## .the solution

use `npx rhachet` for normal operations:

```bash
npx rhachet run --skill say-hello
npx rhachet roles boot --repo .this --role any
```

this runs the local version because package.json declares `"rhachet": "link:."`.

## .when to use `./bin/rhx`

only after you change CLI source code (e.g., files in `src/contract/cli/`).

```bash
# you changed src/contract/cli/invokeRun.ts
# now test your change:
./bin/rhx say-hello
./bin/run roles boot --repo .this --role any
```

if you did not change CLI code, do not use `./bin/`. use `npx rhachet` instead.

## .permissions

to use `./bin/rhx` or `./bin/run`, add to `.claude/settings.json`:

```json
"Bash(./bin/rhx:*)",
"Bash(./bin/run:*)"
```

