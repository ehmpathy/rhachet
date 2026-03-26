# howto: test local rhachet upgrades

## .what

when you develop rhachet itself, use `./bin/rhx` and `./bin/run` to test local changes before they're published to npm.

## .why

- `npx rhachet` uses the installed npm version from `node_modules/`
- `./bin/rhx` and `./bin/run` use the local source code directly
- local tests catch issues before release

## .paths

| command | resolves to | use case |
|---------|-------------|----------|
| `npx rhachet` | `node_modules/.bin/rhachet` | test installed version |
| `./bin/rhx` | local bun binary | test local skills |
| `./bin/run` | local bun/jit dispatcher | test local CLI commands |

## .examples

### test a local skill

```bash
# via npm (uses installed version)
npx rhachet run --skill say-hello

# via local binary (uses local source)
./bin/rhx say-hello
```

### test a local CLI command

```bash
# via npm (uses installed version)
npx rhachet enroll claude --roles mechanic

# via local binary (uses local source)
./bin/run enroll claude --roles mechanic
```

### test with JIT path (for commands that need npm package imports)

```bash
# JIT path transpiles typescript on demand
./bin/run.jit enroll claude --roles mechanic --mode plan
```

## .when to use each

| scenario | command |
|----------|---------|
| verify installed package works | `npx rhachet` |
| develop new skill | `./bin/rhx` |
| develop new CLI command | `./bin/run` |
| debug npm import issues | `./bin/run.jit` |

## .permissions

the `.claude/settings.json` must include these permissions:

```json
"Bash(./bin/rhx:*)",
"Bash(./bin/run:*)"
```

if the permission is not present, the command will be blocked. in that case:
1. the first attempt will show the block message
2. retry the same command — the second attempt triggers a human approval prompt
3. human can grant the permission, which adds it to settings

alternatively, add the permissions to `.claude/settings.json` directly.
