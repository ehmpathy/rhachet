# self-review: has-preserved-test-intentions (r4)

## question

> did you preserve test intentions?

## deeper analysis

ran `git diff main --name-only -- '*.test.ts'` and found modified tests beyond github.secrets:

### modified test files

| file | change type |
|------|-------------|
| vaultAdapter1Password.integration.test.ts | ConstraintError instead of silent skip |
| vaultAdapter1Password.test.ts | `.get!` non-null assertion |
| other vault adapters | similar patterns |

### change 1: silent skips → ConstraintErrors

**before:**
```ts
if (!opAvailable) {
  expect(true).toBe(true);  // silent skip — FAILHIDE!
  return;
}
```

**after:**
```ts
if (!opAvailable) {
  throw new ConstraintError('op cli not installed', {
    hint: 'install 1password cli: brew install 1password-cli',
  });
}
```

**intention preserved?** YES. the test still verifies behavior when op is available. the change makes the skip VISIBLE rather than silent. this is an improvement — silent skips are failhide.

### change 2: `.get` → `.get!`

**before:**
```ts
vaultAdapter1Password.get({ slug: 'TEST_KEY' })
```

**after:**
```ts
vaultAdapter1Password.get!({ slug: 'TEST_KEY' })
```

**why?** the vault adapter interface now has `get: (...) => ... | null` because write-only vaults (github.secrets) have `get === null`. the `!` assertion tells TypeScript "I know get is not null here."

**intention preserved?** YES. the test still verifies get behavior. the type assertion handles the new interface shape.

### verification

no assertions were weakened:
- tests still check the same behaviors
- error expectations unchanged
- success conditions unchanged

no test cases removed:
- all prior test cases remain
- new github.secrets tests added

no expected values changed to match broken output:
- ConstraintError is a new error type (explicit fail)
- not a changed assertion

## why it holds

1. silent skips replaced with loud ConstraintErrors — improvement, not regression
2. `.get!` assertion handles new interface shape — mechanical, not behavioral
3. all prior test intentions preserved
4. new tests add coverage, do not remove it

## verdict

**holds** — test intentions preserved; changes improve failhide→failloud
