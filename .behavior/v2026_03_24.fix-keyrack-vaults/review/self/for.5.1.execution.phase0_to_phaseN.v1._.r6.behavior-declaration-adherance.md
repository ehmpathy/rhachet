# review.self: behavior-declaration-adherance (r6)

## the question

does each changed file adhere to the vision, criteria, and blueprint specifications?

## review method

deeper analysis of the codepath flow across files, not just individual file checks.

---

## codepath flow analysis

### flow 1: keyrack set --key K --vault os.daemon --env E

**vision says:**
> key lives in daemon memory only. no disk writes. no bash history.

**codepath traced:**

1. `setKeyrackKeyHost.ts:61` calls `adapter.set({ slug, env, org, ... })`
2. `vaultAdapterOsDaemon.set:66-68` prompts via `promptHiddenInput()` — secret never in args
3. `vaultAdapterOsDaemon.set:85-96` calls `daemonAccessUnlock()` — stores in daemon memory
4. `setKeyrackKeyHost.ts:83` checks `if (input.vault !== 'os.daemon')` — **skips daemon relock**
5. `setKeyrackKeyHost.ts:129` writes to host manifest — but only CONFIG, not secret

**why it holds:**
- secret comes from stdin, not args → no bash history ✓
- secret goes to daemon via unix socket → memory only ✓
- host manifest stores vault type and mech, not secret value ✓
- daemon relock skipped for os.daemon vault → correct behavior ✓

---

### flow 2: keyrack set --key K --vault 1password --env E

**vision says:**
> keyrack stores the pointer, not the secret. roundtrip validated via `op read $exid`.

**codepath traced:**

1. `setKeyrackKeyHost.ts:61` calls `adapter.set({ slug, env, org, exid, ... })`
2. `vaultAdapter1Password.set:93-94` checks `isOpCliInstalled()`
3. if absent → `vaultAdapter1Password.set:95-119` prints instructions, `process.exit(2)`
4. `vaultAdapter1Password.set:124-127` prompts for exid via `promptVisibleInput()` (not hidden)
5. `vaultAdapter1Password.set:139-155` validates via `execOp(['read', exid])`
6. `vaultAdapter1Password.set:158` returns `{ exid }`
7. `setKeyrackKeyHost.ts:76` captures exid from setResult
8. `setKeyrackKeyHost.ts:108` stores exid in keyHost
9. `setKeyrackKeyHost.ts:129` writes keyHost to manifest — stores pointer, not secret

**why it holds:**
- op cli check happens first → fail fast ✓
- exid is prompted (not secret) → promptVisibleInput is correct choice ✓
- roundtrip validation happens before storage → broken exids fail at set time ✓
- adapter returns exid, caller stores it → pointer only, no secret in keyrack ✓

---

### flow 3: keyrack unlock --env E (for 1password key)

**vision says:**
> 1password prompts for auth. secret fetched and cached in daemon.

**codepath traced:**

1. unlock flow calls `adapter.get({ slug, exid })` on 1password adapter
2. `vaultAdapter1Password.get:62-66` validates exid exists
3. `vaultAdapter1Password.get:69` calls `execOp(['read', input.exid])`
4. op cli prompts for biometric/auth (or uses OP_SERVICE_ACCOUNT_TOKEN)
5. `vaultAdapter1Password.get:70` returns `stdout.trim()` — the secret
6. unlock flow sends secret to daemon via `daemonAccessUnlock()`
7. secret lives in daemon memory for session

**why it holds:**
- exid is required for get → validates manifest entry ✓
- op cli handles auth (biometric or service account) ✓
- secret returns to caller, flows to daemon ✓
- daemon is session-scoped → ephemeral lifespan ✓

---

### flow 4: op cli not installed

**criteria says:**
> displays "op cli not found", displays ubuntu install instructions, exits with code 2

**code at vaultAdapter1Password.ts:93-120:**
```typescript
const opInstalled = await isOpCliInstalled();
if (!opInstalled) {
  console.log('');
  console.log('🔐 keyrack set');
  console.log('   └─ ✗ op cli not found');
  console.log('');
  console.log('   to install on ubuntu:');
  // ... steps 1-4
  console.log('      - alternative: op signin');
  console.log('');
  process.exit(2);
}
```

**why it holds:**
- message matches criteria ✓
- ubuntu install instructions present ✓
- exit 2 (constraint error) ✓

---

### flow 5: invalid exid roundtrip

**criteria says:**
> roundtrip validation via `op read $exid` fails, displays error, exits with code 2

**code at vaultAdapter1Password.ts:138-155:**
```typescript
try {
  await execOp(['read', exid]);
} catch (error) {
  console.log('');
  console.log('🔐 keyrack set');
  console.log('   └─ ✗ invalid 1password reference: op read failed');
  // ... verify instructions
  process.exit(2);
}
```

**why it holds:**
- roundtrip via op read ✓
- error message matches criteria ✓
- exit 2 (constraint error) ✓

---

## adapter map verification

**genContextKeyrackGrantUnlock.ts:80-87:**
```typescript
const vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter> = {
  'os.envvar': vaultAdapterOsEnvvar,
  'os.direct': vaultAdapterOsDirect,
  'os.secure': vaultAdapterOsSecure,
  'os.daemon': vaultAdapterOsDaemon,
  '1password': vaultAdapter1Password,
  'aws.iam.sso': vaultAdapterAwsIamSso,
};
```

**why it holds:**
- all vault types have adapters ✓
- os.daemon uses vaultAdapterOsDaemon ✓
- 1password uses vaultAdapter1Password ✓
- import paths reflect directory restructure (os.daemon/, 1password/) ✓

---

## mech type verification

**inferMechFromVault.ts:**
```typescript
if (input.vault === '1password') {
  return 'PERMANENT_VIA_REFERENCE';  // line 27
}

if (input.vault === 'os.daemon') {
  return 'EPHEMERAL_VIA_SESSION';    // line 32
}
```

**genContextKeyrackGrantUnlock.ts:97-99:**
```typescript
PERMANENT_VIA_REFERENCE: mechAdapterReplica, // 1password: passthrough
EPHEMERAL_VIA_SESSION: mechAdapterReplica,   // os.daemon: passthrough
```

**why it holds:**
- vault → mech inference is correct ✓
- both new mechs use passthrough adapter (mechAdapterReplica) ✓
- this is correct because:
  - 1password: vault adapter fetches secret, mech adapter passes through
  - os.daemon: secret already in daemon, mech adapter passes through

---

## setKeyrackKeyHost special cases

**line 83: skip daemon relock for os.daemon:**
```typescript
if (input.vault !== 'os.daemon') {
  await daemonAccessRelock({ slugs: [input.slug], owner: context.owner });
}
```

**why it holds:**
- os.daemon's set() already stored to daemon
- relock would clear what we just set
- other vaults need daemon invalidated so get() shows "locked" not stale value
- the `!==` condition correctly exempts os.daemon ✓

---

## conclusion

traced five key codepaths across multiple files. each flow matches vision/criteria/blueprint:

| flow | vision | criteria | blueprint |
|------|--------|----------|-----------|
| os.daemon set | ✓ memory only | ✓ daemon store | ✓ adapter + skip relock |
| 1password set | ✓ pointer only | ✓ exid prompt + validate | ✓ return { exid } |
| 1password unlock | ✓ fetch via op | ✓ daemon cache | ✓ get + daemonAccessUnlock |
| op cli absent | n/a | ✓ exit 2 + instructions | ✓ isOpCliInstalled |
| invalid exid | n/a | ✓ exit 2 + error | ✓ roundtrip catch |

no deviations found. implementation adheres to spec.
