# handoff: bhuild guard apikeys → keyrack

## context

the `v2026_03_24.fix-testcreds` behavior eliminates the `use.apikeys.sh` pattern in favor of keyrack.

this affects guard files that source the deleted file before peer reviews.

## the problem

guard files in bhuild templates contain:

```yaml
peer:
  - bash -c ". .agent/repo=.this/role=any/skills/use.apikeys.sh && npx rhachet run --repo bhrain --skill review ..."
```

this pattern:
1. sources `use.apikeys.sh` to load API keys into environment
2. then runs the peer review command

after the fix-testcreds behavior, `use.apikeys.sh` no longer exists. guards that reference it will malfunction.

## the fix

replace the source pattern with direct command invocation:

```yaml
peer:
  # .note = keyrack passthrough handles credentials via env vars; no source needed
  - npx rhachet run --repo bhrain --skill review ...
```

keyrack passthrough works because:
- keyrack checks environment variables first (before vault lookup)
- CI environments set credentials via env vars
- local environments have keyrack unlocked

no source command is needed.

## files to update in bhuild

search for guards that reference `use.apikeys.sh`:

```bash
grep -r "use.apikeys.sh" .
```

for each match:
1. remove the `bash -c ". .agent/repo=.this/role=any/skills/use.apikeys.sh && ..."` wrapper
2. run the command directly
3. add comment about keyrack passthrough

## example diff

before:
```yaml
peer:
  - bash -c ". .agent/repo=.this/role=any/skills/use.apikeys.sh && npx rhachet run --repo bhrain --skill review --rules '...' --mode hard 2>&1"
```

after:
```yaml
peer:
  # .note = keyrack passthrough handles credentials via env vars; no source needed
  - npx rhachet run --repo bhrain --skill review --rules '...' --mode hard
```

## verification

after update:
1. run `npx rhx route.stone.set --stone $stone --as passed` in a repo with the behavior
2. confirm peer review runs without "No such file" error
3. confirm credentials are available via keyrack passthrough

## related

- rhachet behavior: `v2026_03_24.fix-testcreds`
- files eliminated: `use.apikeys.sh`, `use.apikeys.json`
- new pattern: keyrack get with passthrough
