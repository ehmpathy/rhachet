# behavior-declaration-coverage review (r5) — keyrack firewall

## review question

for each requirement in vision, criteria, and blueprint:
- is it implemented?
- why does the implementation hold?

---

## vision requirements — deep verification

### the core flow (vision lines 34-56)

**requirement**: CLI reads secrets → filters via keyrack.yml → translates via mech → outputs to github.actions

**verification**: traced the full flow in `invokeKeyrack.ts:1373-1508`

1. **read secrets** (lines 1411-1440): `source.type === 'env'` reads from process.env, `source.type === 'stdin'` reads from stdin buffer. both parse JSON into `secrets: Record<string, string>`.

2. **inject into process.env** (lines 1443-1447): each `[key, value]` pair is set on `process.env[key]`. this enables vaultAdapterOsEnvvar to find them.

3. **filter via keyrack.yml** (lines 1449-1462): `daoKeyrackRepoManifest.get()` loads manifest, then `getAllKeyrackSlugsForEnv()` returns only slugs declared for `--env`. keys in github secrets but not in manifest are skipped.

4. **translate via mech** (line 1472-1475): `getKeyrackKeyGrant()` is called with filtered slugs. inside, vaultAdapterOsEnvvar calls `inferKeyrackMechForGet()` to detect mech from JSON blob, then `mechAdapter.deliverForGet()` to translate.

5. **output to github.actions** (lines 1489-1506): `getKeyrackFirewallOutput()` emits `::add-mask::` for each grant, writes to `$GITHUB_ENV`, and shows `::notice::` for expiry.

**why it holds**: the flow matches the vision diagram exactly. each step is traceable.

### the ghs_* fix (vision lines 344-346)

**requirement**: remove `ghs_*` from LONG_LIVED_PATTERNS because ghs_* tokens are short-lived (1 hour)

**verification**: read `mechAdapterReplica.ts:11-29`

```
const LONG_LIVED_PATTERNS = [
  /^ghp_[a-zA-Z0-9]{36}$/,  // blocked
  /^gho_[a-zA-Z0-9]{36}$/,  // blocked
  /^ghu_[a-zA-Z0-9]{36}$/,  // blocked
  // ghs_* NOT listed
  /^ghr_[a-zA-Z0-9]{36}$/,  // blocked
  /^AKIA[A-Z0-9]{16}$/,     // blocked
];
```

lines 21-22 have explicit comment:
```
// ghs_* (server-to-server) tokens are NOT blocked — they are ephemeral
// tokens generated from GitHub App installations (short-lived)
```

**why it holds**: ghs_* pattern is absent from the array. the comment documents the intent.

---

## criteria requirements — deep verification

### usecase.3 — credential blocked (criteria lines 46-69)

**requirement**: ghp_* and AKIA* tokens must be blocked with clear error and fix suggestion

**verification**: 

1. **blocked detection**: `mechAdapterReplica.ts:35-50` loops through LONG_LIVED_PATTERNS. `matchesLongLivedPattern()` returns the pattern description (e.g., "github classic pat (ghp_*)").

2. **blocked status**: `mechAdapterReplica.ts:60-75` validate method adds reasons array with the matched pattern description.

3. **clear error in output**: `getKeyrackFirewallOutput.ts:72-76` emits:
```
${prefix} ${keyName}
${contPrefix}├─ status: blocked 🚫
${contPrefix}└─ reasons: ${attempt.reasons.join(', ')}
```

**why it holds**: the chain from pattern match → validate → output is complete. each step adds context.

### usecase.7 — fail fast (criteria lines 144-162)

**requirement**: if any secret is blocked, exit 2, none exported

**verification**: `invokeKeyrack.ts:1477-1486`

```typescript
// PHASE 2: VALIDATE (fail fast if any blocked)
const blocked = attempts.filter((a) => a.status === 'blocked');
if (blocked.length > 0) {
  // emit output with blocked keys visible
  getKeyrackFirewallOutput({
    attempts,
    grants: [],  // <- empty grants array
    into: opts.into as 'github.actions' | 'json',
  });
  process.exit(2);
}
```

**why it holds**: 
1. blocked check happens BEFORE phase 3 (emit)
2. `grants: []` ensures no secrets are passed to output
3. `getKeyrackFirewallOutput` only writes to $GITHUB_ENV for grants array
4. exit 2 prevents any further code from run

### usecase.9 — absent keys don't fail (criteria lines 183-198)

**requirement**: if a key is declared in keyrack.yml but absent from secrets, report absent but don't fail

**verification**: 

1. absent keys get status 'absent' from `getKeyrackKeyGrant` (when os.envvar returns null)

2. `invokeKeyrack.ts:1477-1486` only checks for `blocked`, not `absent`:
```typescript
const blocked = attempts.filter((a) => a.status === 'blocked');
if (blocked.length > 0) { process.exit(2); }
```

3. `getKeyrackFirewallOutput.ts:77-80` shows absent keys in treestruct:
```typescript
} else if (attempt.status === 'absent') {
  console.log(`${prefix} ${keyName}`);
  console.log(`${contPrefix}└─ status: absent 🫧`);
}
```

**why it holds**: absent keys are logged but don't trigger exit 2. the exit only happens for blocked keys.

---

## blueprint components — deep verification

### inferKeyrackMechForGet.ts (blueprint lines 201-222)

**requirement**: detect mech field from JSON blob value, return PERMANENT_VIA_REPLICA for non-JSON

**verification**: read file directly

```typescript
export const inferKeyrackMechForGet = (input: {
  value: string;
}): KeyrackGrantMechanism => {
  try {
    const parsed = JSON.parse(input.value);
    if (parsed.mech && typeof parsed.mech === 'string') {
      return parsed.mech as KeyrackGrantMechanism;
    }
  } catch {
    // not JSON, passthrough
  }
  return 'PERMANENT_VIA_REPLICA';
};
```

**why it holds**:
1. `JSON.parse` wrapped in try-catch handles non-JSON values
2. `parsed.mech && typeof parsed.mech === 'string'` guards against malformed blobs
3. default return is PERMANENT_VIA_REPLICA (passthrough mechanism)

### vaults return KeyrackKeyGrant | null (blueprint lines 321-349)

**requirement**: all 6 readable vaults return KeyrackKeyGrant | null, not string | null

**verification**: checked `KeyrackHostVaultAdapter.ts:20`:
```typescript
}) => Promise<KeyrackKeyGrant | null>;
```

**why it holds**: the interface type enforces the contract. TypeScript compilation would fail if any vault returned string.

---

## test coverage — deep verification

### acceptance test case4 (lines 388-648)

**coverage**:
- t0: safe key granted via json(env://...) → exercises full happy path
- t1: blocked key (ghp_*) → exercises firewall + exit 2
- t2: absent key → exercises absent handle path
- t3: stdin input → exercises json(stdin://...) source
- t4-t6: flag validation → exercises CLI guards

**why it holds**: the 7 test cases cover the primary paths through the firewall command. each tests a distinct branch in the code.

---

## conclusion

**no gaps found.**

each requirement traced to specific code locations with line numbers. the implementation matches the behavior declaration.
