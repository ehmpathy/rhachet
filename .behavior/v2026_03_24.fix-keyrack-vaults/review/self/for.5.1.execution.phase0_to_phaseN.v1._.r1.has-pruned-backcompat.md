# review.self: has-pruned-backcompat

## question

for each change, ask:
- does this break extant consumers?
- does this change behavior without explicit request?
- did we add deprecation warnings where needed?
- did we maintain contract stability?

## review

### mech type additions

| change | backcompat | analysis |
|--------|------------|----------|
| add EPHEMERAL_VIA_SESSION | ✓ additive | new enum value, no extant code uses it |
| add PERMANENT_VIA_REFERENCE | ✓ additive | new enum value, no extant code uses it |

additive changes to union types are backwards compatible.

### directory restructure

| change | backcompat | analysis |
|--------|------------|----------|
| move adapters to subdirectories | ✓ internal | adapters accessed via index.ts, consumers unchanged |
| update index.ts imports | ✓ internal | re-exports maintain same public interface |

internal restructure, no public api changes.

### host manifest index

| change | backcompat | analysis |
|--------|------------|----------|
| add keyrack.host.index.json | ✓ additive | new file, no extant code reads it |
| daoKeyrackHostManifest.set writes index | ✓ additive | new behavior alongside extant |
| genTestTempRepo generates index | ✓ internal | test infrastructure only |

the index is additive. code that doesn't read it continues to work. code that does read it gets locked/absent detection for refed vaults.

### vault adapter changes

| change | backcompat | analysis |
|--------|------------|----------|
| vaultAdapterOsDaemon now exported | ✓ additive | was internal, now public |
| vaultAdapter1Password.set functional | ✓ additive | was stub that threw, now works |
| isOpCliInstalled added | ✓ additive | new function |

all vault changes are additive — either previously internal code now public, or previously-stub code now functional.

### test expectation changes

| change | backcompat | analysis |
|--------|------------|----------|
| aws.iam.sso tests: absent → locked | ⚠ behavior | correct fix: reflects actual behavior |
| os.secure "lost key" test | ✓ behavior | correctly returns absent when vault file deleted |

the test expectation change for aws.iam.sso reflects the corrected behavior — refed vaults now properly return "locked" when in the index but not unlocked, rather than "absent".

## conclusion

all changes are either:
1. additive (new types, new functions, new files)
2. internal restructure (no public api changes)
3. corrected behavior (tests updated to match actual correct behavior)

no backwards compatibility violations found.
