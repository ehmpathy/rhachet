# self-review: has-critical-paths-frictionless (r7)

## the question

> are the critical paths frictionless in practice?

## context: no repros artifact

this behavior has no repros artifact — it is a feature request, not a bug fix. the critical paths are defined in the criteria file (`2.1.criteria.blackbox.md`).

## the critical paths

from the criteria, the critical paths are:

1. **default upgrade via rhx** — `rhx upgrade` upgrades local + global
2. **explicit local** ��� `rhx upgrade --which local` upgrades local only
3. **explicit global** — `rhx upgrade --which global` upgrades global only
4. **npx invocation** — `npx rhachet upgrade` upgrades local only (no global attempt)

## manual verification limitations

I cannot run these paths manually because:
- global npm install requires system-level permissions
- actual npm installs would modify the development environment
- the test environment is isolated from production npm state

## verification via test results

the critical paths were verified via unit tests (`npm run test:unit`):

### path 1: default upgrade via rhx

```typescript
// execUpgrade.test.ts line 646-660
given('no --which flag (default behavior)', () => {
  when('invoked via global install (rhx)', () => {
    then('defaults to both local and global', async () => {
      expect(mockExecNpmInstall).toHaveBeenCalled();
      expect(mockExecNpmInstallGlobal).toHaveBeenCalled();
    });
  });
});
```

**friction check:** no extra flags needed. user runs `rhx upgrade`, both local and global are upgraded.

### path 2: explicit local

```typescript
// execUpgrade.test.ts line 566-576
given('--which local flag', () => {
  then('upgrades local only, skips global', async () => {
    expect(mockExecNpmInstall).toHaveBeenCalled();
    expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
  });
});
```

**friction check:** single flag `--which local`. clear and explicit.

### path 3: explicit global

```typescript
// execUpgrade.test.ts line 578-615
given('--which global flag', () => {
  then('upgrades global only, skips local', async () => {
    expect(mockExecNpmInstall).not.toHaveBeenCalled();
    expect(mockExecNpmInstallGlobal).toHaveBeenCalled();
  });
});
```

**friction check:** single flag `--which global`. clear and explicit.

### path 4: npx invocation

```typescript
// execUpgrade.test.ts line 631-644
given('no --which flag (default behavior)', () => {
  when('invoked via npx', () => {
    then('defaults to local only', async () => {
      expect(mockExecNpmInstall).toHaveBeenCalled();
      expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
    });
  });
});
```

**friction check:** no flags needed. npx users get sensible default (no global attempt for npx).

## friction assessment

| path | friction | notes |
|------|----------|-------|
| rhx upgrade | none | just works — both upgraded |
| --which local | minimal | one explicit flag |
| --which global | minimal | one explicit flag |
| npx upgrade | none | sensible default (local only) |

## edge case: global fails

```typescript
// execUpgrade.test.ts line 663-687
given('global upgrade fails with permission error', () => {
  then('warns and continues — local not blocked by global failure', async () => {
    expect(result.upgradedSelf).toBe(true);
    expect(result.upgradedGlobal).toEqual({
      upgraded: false,
      error: 'global install failed: npm ERR! code EACCES',
    });
  });
});
```

**friction check:** if global fails, local still succeeds. user is warned but not blocked.

## conclusion

the critical paths are frictionless:
- default behavior "just works" for both rhx and npx users
- explicit control via `--which` flag when needed
- failures are handled gracefully (warn and continue)
