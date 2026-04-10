# self-review: has-journey-tests-from-repros (r5)

## the question

> did you implement each journey sketched in repros?

## the answer: no repros artifact exists

this behavior route has no `3.2.distill.repros.experience.*.md` artifact.

**why no repros:** this behavior is a feature request, not a bug fix. the repros phase distills user-reported incidents into reproducible scenarios. there was no incident — the feature did not exist before.

**the journeys were defined directly in criteria** (`2.1.criteria.blackbox.md`), which is the authoritative source for this review.

## verification: criteria journeys → test file coverage

I read the test file (`execUpgrade.test.ts` lines 565-688) and verified each criteria journey has a test.

### usecase.1: default upgrade (rhx invocation)

| criteria journey | test location | verified |
|-----------------|---------------|----------|
| `rhx upgrade` → upgrades local + global | line 646-660 `'invoked via global install (rhx)'` | ✓ |
| `rhx upgrade --which local` → local only | line 566-576 `'--which local flag'` | ✓ |
| `rhx upgrade --which global` → global only | line 578-615 `'--which global flag'` | ✓ |
| `rhx upgrade --which both` → local + global | line 617-629 `'--which both flag'` | ✓ |

**actual test code (line 651-659):**
```typescript
then('defaults to both local and global', async () => {
  const result = await execUpgrade({}, context);

  expect(mockExecNpmInstall).toHaveBeenCalled();
  expect(mockExecNpmInstallGlobal).toHaveBeenCalledWith({
    packages: ['rhachet'],
  });
  expect(result.upgradedGlobal).toEqual({ upgraded: true });
});
```

### usecase.2: npx invocation

| criteria journey | test location | verified |
|-----------------|---------------|----------|
| `npx rhachet upgrade` → local only | line 631-644 `'invoked via npx'` | ✓ |

**actual test code (line 637-643):**
```typescript
then('defaults to local only', async () => {
  const result = await execUpgrade({}, context);

  expect(mockExecNpmInstall).toHaveBeenCalled();
  expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
  expect(result.upgradedGlobal).toBeNull();
});
```

### usecase.3: global upgrade fails

| criteria journey | test location | verified |
|-----------------|---------------|----------|
| global fails → local succeeds + warns | line 663-687 `'global upgrade fails with permission error'` | ✓ |

**actual test code (line 671-685):**
```typescript
then(
  'warns and continues — local not blocked by global failure',
  async () => {
    const result = await execUpgrade({ which: 'both' }, context);

    // local upgrade should succeed
    expect(result.upgradedSelf).toBe(true);

    // global upgrade should report failure
    expect(result.upgradedGlobal).toEqual({
      upgraded: false,
      error: 'global install failed: npm ERR! code EACCES',
    });
  },
);
```

### usecase.4 & 5: already current / version mismatch

| criteria journey | test location | verified |
|-----------------|---------------|----------|
| global not installed → skip | line 603-614 `'global rhachet is not installed'` | ✓ |

**actual test code (line 608-613):**
```typescript
then('skips global upgrade silently', async () => {
  const result = await execUpgrade({ which: 'global' }, context);

  expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
  expect(result.upgradedGlobal).toBeNull();
});
```

### usecase.6: output clarity

| criteria journey | test location | verified |
|-----------------|---------------|----------|
| output shows --which flag | `upgrade.acceptance.test.ts.snap` | ✓ |

the snapshot captures the CLI help output which includes `--which <which>`.

## conclusion

every criteria journey maps to a test:

| usecase | journeys | tests |
|---------|----------|-------|
| 1 | 4 | 4 |
| 2 | 1 | 1 |
| 3 | 1 | 1 |
| 4 & 5 | 1 | 1 |
| 6 | 1 | 1 (snapshot) |

**total: 8 journeys, 8 tests.**

no repros artifact required — feature request, not bug fix. all journeys verified against criteria source.
