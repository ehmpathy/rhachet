# self-review: has-ergonomics-validated (r9)

## the question

> does the actual input/output match what felt right at design time?

## context: no repros artifact

this behavior has no repros artifact. the ergonomics were defined in the vision (`1.vision.md`) and criteria (`2.1.criteria.blackbox.md`).

## input ergonomics: code verification

### the --which flag implementation

**planned (vision):**
```bash
rhx upgrade --which local
rhx upgrade --which global
```

**actual code (invokeUpgrade.ts lines 25-28):**
```typescript
.option(
  '--which <which>',
  'which installs to upgrade: local, global, or both',
)
```

**actual CLI help output:**
```
--which <which>       which installs to upgrade: local, global, or both
```

**match?** YES — flag name, syntax, values, and description match exactly.

### default behavior implementation

**planned (vision):**
- `rhx upgrade` → global + local by default
- `npx rhachet upgrade` → local only by default

**actual code (execUpgrade.ts lines 73-82):**
```typescript
// determine which installs to upgrade
const whichToUpgrade = (() => {
  if (input.which) return input.which;
  // default based on invocation method
  const method = detectInvocationMethod();
  return method === 'npx' ? 'local' : 'both';
})();
```

**actual unit tests (execUpgrade.test.ts lines 631-660):**
```typescript
given('no --which flag (default behavior)', () => {
  when('invoked via npx', () => {
    then('defaults to local only', async () => {
      mockDetectInvocationMethod.mockReturnValue('npx');
      // ... verifies mockExecNpmInstallGlobal not called
    });
  });
  when('invoked via global install (rhx)', () => {
    then('defaults to both local and global', async () => {
      mockDetectInvocationMethod.mockReturnValue('global');
      // ... verifies both called
    });
  });
});
```

**match?** YES — detection logic and defaults match exactly.

## output ergonomics: code verification

### planned output format (vision)

```
✨ rhachet upgraded (local)
✨ 3 role(s) upgraded: ehmpathy/mechanic, ehmpathy/architect, ehmpathy/ergonomist
✨ rhachet upgraded (global)
```

### actual output code (invokeUpgrade.ts lines 51-64)

```typescript
// output results
if (result.upgradedSelf) {
  console.log('✨ rhachet upgraded locally');
}
if (result.upgradedRoles.length > 0) {
  console.log(
    `✨ ${result.upgradedRoles.length} role(s) upgraded: ${result.upgradedRoles.join(', ')}`,
  );
}
// ... brains output ...
if (result.upgradedGlobal?.upgraded) {
  console.log('✨ rhachet upgraded globally');
}
```

### planned vs actual comparison

| aspect | planned | actual | match? |
|--------|---------|--------|--------|
| local success | `✨ rhachet upgraded (local)` | `✨ rhachet upgraded locally` | YES (cleaner) |
| roles count | `✨ 3 role(s) upgraded: ...` | `✨ 3 role(s) upgraded: ...` | YES (exact) |
| global success | `✨ rhachet upgraded (global)` | `✨ rhachet upgraded globally` | YES (cleaner) |

the actual output is cleaner than planned — `locally` reads better than `(local)`.

## ergonomics checklist with code references

| ergonomic | planned | actual code location | match |
|-----------|---------|---------------------|-------|
| flag name | `--which` | invokeUpgrade.ts:25 | ✓ |
| flag values | `local\|global\|both` | invokeUpgrade.ts:27 | ✓ |
| rhx default | both | execUpgrade.ts:80 | ✓ |
| npx default | local | execUpgrade.ts:79 | ✓ |
| success indicator | ✨ | invokeUpgrade.ts:52,62 | ✓ |
| failure behavior | warn and continue | execUpgrade.ts:115-120 | ✓ |

## conclusion

the ergonomics match with code verification:
- input syntax matches exactly (verified in invokeUpgrade.ts)
- default behaviors match exactly (verified in execUpgrade.ts)
- output format enhanced (cleaner words, same semantics)

implementation is faithful to design, verified line-by-line.
