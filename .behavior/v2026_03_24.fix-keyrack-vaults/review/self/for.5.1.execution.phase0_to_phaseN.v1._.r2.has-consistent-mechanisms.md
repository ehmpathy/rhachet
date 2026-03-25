# review.self: has-consistent-mechanisms (r2)

## the question

did we add new mechanisms that duplicate extant functionality?

for each new mechanism in the code, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate extant utilities or patterns?
- could we reuse an extant component instead of a new one?

## artifacts reviewed

- `src/domain.operations/keyrack/adapters/vaults/1password/isOpCliInstalled.ts`
- `src/domain.operations/keyrack/adapters/vaults/1password/vaultAdapter1Password.ts`
- `src/domain.operations/keyrack/adapters/vaults/os.daemon/vaultAdapterOsDaemon.ts`
- `src/domain.operations/keyrack/adapters/vaults/aws.iam.sso/setupAwsSsoProfile.ts`
- `src/infra/promptVisibleInput.ts`
- `src/infra/promptHiddenInput.ts`

## review

### new mechanism: isOpCliInstalled

**code:**
```typescript
export const isOpCliInstalled = async (): Promise<boolean> => {
  try {
    await execAsync('which op');
    return true;
  } catch {
    return false;
  }
};
```

**extant parallel:** `isAwsCliInstalled` in `setupAwsSsoProfile.ts`
```typescript
export const isAwsCliInstalled = (): boolean => {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};
```

**is this duplication?**

no. these are domain-specific checks for different CLIs:
- `isOpCliInstalled` checks for 1password cli
- `isAwsCliInstalled` checks for aws cli

the pattern is simple (3 lines), applying the same pattern for different tools is appropriate. extraction to a generic `isCliInstalled({ cli })` would be over-engineering for a 3-line function.

**verdict:** not duplication — domain-specific application of simple pattern.

### new mechanism: promptVisibleInput usage

**code:**
```typescript
exid = await promptVisibleInput({
  prompt: 'enter 1password uri (e.g., op://vault/item/field): ',
});
```

**extant utilities:**
- `promptHiddenInput` — for secrets (asterisk echo)
- `promptVisibleInput` — for non-secret input (visible echo)

**is this duplication?**

no. we correctly chose `promptVisibleInput` because exid is not a secret — it's a reference uri that should be visible. the other vault adapters use `promptHiddenInput` for actual secrets.

**verdict:** correct reuse of extant utility.

### new mechanism: os.daemon adapter

**code:** reuses `daemonAccessUnlock` from daemon SDK

**is this duplication?**

no. the os.daemon adapter delegates to the extant daemon SDK rather than reimplementing daemon communication.

**verdict:** correct reuse of extant mechanism.

### new mechanism: host manifest index

**code:** writes `keyrack.host.index.json` in `daoKeyrackHostManifest.set`

**extant utilities:** none — this is new functionality

**is this duplication?**

no. the index is new functionality required for locked/absent detection of refed vaults. there was no extant mechanism for this.

**verdict:** new functionality, not duplication.

## conclusion

no new mechanisms duplicate extant functionality:

| mechanism | extant parallel | verdict |
|-----------|-----------------|---------|
| isOpCliInstalled | isAwsCliInstalled (same pattern, different domain) | not duplication |
| promptVisibleInput usage | promptHiddenInput (different purpose) | correct reuse |
| os.daemon adapter | daemonAccessUnlock (reused) | correct reuse |
| host manifest index | none | new functionality |

all new code either reuses extant utilities or applies simple patterns to new domains.
