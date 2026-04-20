# behavior-declaration-adherence review (r5) — keyrack firewall

## review question

for each changed file, check against vision/criteria/blueprint:
- does the implementation match what the spec describes?
- did the implementer misinterpret or deviate from the spec?

---

## vaultAdapterOsEnvvar.ts — adherence check

### blueprint spec (lines 146-199)

```typescript
get: async (input: { slug: string; mech?: KeyrackGrantMechanism }): Promise<KeyrackKeyGrant | null> => {
  const keyName = asKeyrackKeyName({ slug: input.slug });
  const source = process.env[keyName] ?? null;
  if (source === null) return null;

  const inferredMech = inferKeyrackMechForGet({ value: source });

  if (input.mech && inferredMech !== 'PERMANENT_VIA_REPLICA' && input.mech !== inferredMech) {
    throw new ConstraintError('mech mismatch: host manifest and blob disagree', { ... });
  }

  const mech = input.mech ?? inferredMech;
  const mechAdapter = getMechAdapter(mech);
  const { secret, expiresAt } = await mechAdapter.deliverForGet({ source });
  const grade = inferKeyGrade({ vault: 'os.envvar', mech });
  const { env, org } = asKeyrackSlugParts({ slug: input.slug });

  return new KeyrackKeyGrant({ slug, key: { secret, grade }, source: { vault: 'os.envvar', mech }, env, org, expiresAt });
}
```

### actual implementation (lines 71-117)

**comparison**:

| spec line | actual line | match? |
|-----------|-------------|--------|
| `asKeyrackKeyName({ slug })` | line 72: `asKeyrackKeyName({ slug: input.slug })` | **exact** |
| `process.env[keyName] ?? null` | line 73: `process.env[keyName] ?? null` | **exact** |
| `return null` if source null | line 74: `if (source === null) return null` | **exact** |
| `inferKeyrackMechForGet({ value })` | line 77: `inferKeyrackMechForGet({ value: source })` | **exact** |
| mech mismatch check | lines 80-94: same logic with ConstraintError | **exact** |
| `mech = input.mech ?? inferredMech` | line 97: same | **exact** |
| `getMechAdapter(mech)` | line 100: same | **exact** |
| `deliverForGet({ source })` | line 101: same | **exact** |
| `inferKeyGrade({ vault, mech })` | line 104: `inferKeyGrade({ vault: 'os.envvar', mech })` | **exact** |
| `asKeyrackSlugParts({ slug })` | line 107: same | **exact** |
| `return new KeyrackKeyGrant(...)` | lines 109-116: same fields | **exact** |

**verdict**: implementation adheres exactly to blueprint spec.

---

## asKeyrackFirewallSource.ts — adherence check

### blueprint spec (lines 226-294)

```typescript
export const asKeyrackFirewallSource = (input: { slug: string }): KeyrackFirewallSource => {
  const match = input.slug.match(/^(\w+)\((\w+):\/\/(.*)?\)$/);
  if (!match) throw new ConstraintError('invalid --from slug format', { ... });

  const [, format, protocol, path] = match;
  if (format !== 'json') throw new ConstraintError('unsupported --from format', { ... });
  if (protocol === 'env') { ... return { type: 'env', format: 'json', envVar: path }; }
  if (protocol === 'stdin') { return { type: 'stdin', format: 'json' }; }
  throw new ConstraintError('unsupported --from protocol', { ... });
};
```

### actual implementation (lines 19-63)

**comparison**:

| spec element | actual | match? |
|--------------|--------|--------|
| regex pattern | line 23: `/^(\w+)\((\w+):\/\/(.*)?\)$/` | **exact** |
| invalid format error | lines 24-30: ConstraintError with slug, hint, examples | **exact** |
| format validation | lines 35-41: `format !== 'json'` throws | **exact** |
| env protocol | lines 44-51: checks path, returns `{ type: 'env', envVar: path }` | **exact** |
| stdin protocol | lines 54-55: returns `{ type: 'stdin', format: 'json' }` | **exact** |
| unknown protocol error | lines 58-62: ConstraintError | **exact** |

**verdict**: implementation adheres exactly to blueprint spec.

---

## inferKeyrackMechForGet.ts — adherence check

### blueprint spec (lines 201-222)

```typescript
export const inferKeyrackMechForGet = (input: { value: string }): KeyrackGrantMechanism => {
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

### actual implementation (lines 7-19)

**comparison**: line-for-line identical to blueprint spec.

**verdict**: implementation adheres exactly to blueprint spec.

---

## invokeKeyrack.ts firewall command — adherence check

### blueprint codepath (lines 85-131)

```
npx rhachet keyrack firewall --env test --from '...' --into '...'
├─ asKeyrackFirewallSource({ slug })
├─ read secrets JSON from source (env var or stdin)
├─ inject into process.env
├─ PHASE 0: load manifest, filter slugs
├─ PHASE 1: collect attempts via getKeyrackKeyGrant
├─ PHASE 2: validate, fail fast if blocked
└─ PHASE 3: emit via getKeyrackFirewallOutput
```

### actual implementation (lines 1373-1508)

| codepath step | actual lines | match? |
|---------------|--------------|--------|
| parse --from | line 1408: `asKeyrackFirewallSource({ slug: opts.from })` | **exact** |
| read from env | lines 1412-1419: `process.env[source.envVar!]` | **exact** |
| read from stdin | lines 1420-1426: buffer concat | **exact** |
| parse JSON | lines 1432-1440: `JSON.parse(rawJson)` | **exact** |
| inject into env | lines 1443-1447: `process.env[key] = value` | **exact** |
| load manifest | lines 1450-1456: `daoKeyrackRepoManifest.get()` | **exact** |
| filter slugs | lines 1459-1462: `getAllKeyrackSlugsForEnv()` | **exact** |
| PHASE 1 collect | lines 1471-1475: `getKeyrackKeyGrant()` | **exact** |
| PHASE 2 validate | lines 1477-1486: check blocked, exit 2 | **exact** |
| PHASE 3 emit | lines 1489-1506: `getKeyrackFirewallOutput()` | **exact** |

**verdict**: implementation adheres exactly to blueprint codepath.

---

## mechAdapterReplica.ts — adherence check

### vision spec (lines 344-346)

> ghs_* tokens are GitHub App installation access tokens, which are inherently short-lived (1 hour max). Remove ghs_* from LONG_LIVED_PATTERNS.

### actual implementation (lines 11-29)

LONG_LIVED_PATTERNS contains:
- ghp_* (classic PAT) — blocked
- gho_* (oauth) — blocked
- ghu_* (user-to-server) — blocked
- ghr_* (refresh) — blocked
- AKIA* (AWS) — blocked

ghs_* is NOT in the list. Lines 21-22 have explicit comment:
```
// ghs_* (server-to-server) tokens are NOT blocked — they are ephemeral
```

**verdict**: implementation adheres exactly to vision spec.

---

## conclusion

all changed files checked against behavior declaration:

| file | adherence |
|------|-----------|
| vaultAdapterOsEnvvar.ts | **exact match** to blueprint |
| asKeyrackFirewallSource.ts | **exact match** to blueprint |
| inferKeyrackMechForGet.ts | **exact match** to blueprint |
| invokeKeyrack.ts (firewall) | **exact match** to blueprint codepath |
| mechAdapterReplica.ts | **exact match** to vision (ghs_* not blocked) |

no deviations found. implementation adheres to spec.
