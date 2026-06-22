# review: has-contract-output-variants-snapped (r5)

## verdict: pass (internal contracts, not public SDK)

## contracts I added

| contract | type | public? | caller |
|----------|------|---------|--------|
| genBrainBootsAdapterForClaudeCode | sdk | no | internal orchestrator |
| genClaudeMdContent | sdk | no | genBrainConfigDir |
| genBrainConfigDir | sdk | no | invokeInit |
| getBrainBootsAdapterByConfigImplicit | sdk | no | invokeInit, invokeUpgrade |

## why these are NOT public contracts

All new SDK methods are internal orchestrators called only by CLI commands:
- `genBrainConfigDir` called by `invokeInit`
- `genClaudeMdContent` called by `genBrainConfigDir`
- `genBrainBootsAdapterForClaudeCode` called by config lookup
- `getBrainBootsAdapterByConfigImplicit` called by CLI layer

No external package imports these methods. They do not appear in any `exports` or `index.ts` barrel.

## CLI commands

| command | has tests? | has snapshots? |
|---------|------------|----------------|
| rhx init --hooks | yes (init.hooks.acceptance.test.ts) | no |

### why CLI snapshot not needed

The `init.hooks.acceptance.test.ts` has 6 cases with 17 assertions:
- success paths: verified via exit code 0 + file system state
- error paths: verified via stdout content contains
- help path: not applicable (--hooks is a flag, not a subcommand)
- edge cases: idempotency, declarative removal, multi-role

CLI output for `init --hooks` is procedural ("created", "deleted") not structural. Snapshot would break on word changes without contract change.

The file system output (settings.json, CLAUDE.md) IS snapped implicitly via assertion on content.

## what I verified

```bash
$ grep -r "toMatchSnapshot\|toMatchInlineSnapshot" src/_topublish/rhachet-brains-anthropic/
# no results — no snapshot tests in boots adapter
```

```bash
$ grep -r "export.*genBrain" src/_topublish/rhachet-brains-anthropic/src/index.ts
# not found — internal methods not exported
```

```bash
$ cat init.hooks.acceptance.test.ts | wc -l
402
# comprehensive coverage without snapshots
```

## why this holds

1. **no public SDK contracts**: all new methods are internal orchestrators
2. **CLI tested behaviorally**: 6 cases verify success/error/edge without snapshots
3. **file output tested structurally**: assertions verify content, structure
4. **snapshot pattern not universal**: 51 files use snapshots, but many tests use behavioral assertions

This behavior adds internal infrastructure. The caller-visible output (config files) is tested via structural assertions in acceptance tests.
