# behavior-declaration-adherence review (r6) — keyrack firewall

## review question

for each changed file, check against vision/criteria/blueprint:
- does the implementation match what the spec describes?
- did the implementer misinterpret or deviate from the spec?

---

## deep file-by-file verification

### 1. vaultAdapterOsEnvvar.ts

**blueprint spec requirement** (lines 146-199):
- return `KeyrackKeyGrant | null` (not `string | null`)
- call `inferKeyrackMechForGet({ value })` to detect mech from JSON blob
- validate mech consistency (throw if host manifest and blob disagree)
- call `mechAdapter.deliverForGet({ source })` for translation
- construct full `KeyrackKeyGrant` with slug, key, source, env, org, expiresAt

**actual implementation verified** (lines 71-117):

```typescript
// line 77: infers mech from value
const inferredMech = inferKeyrackMechForGet({ value: source });

// lines 80-94: validates mech consistency
if (input.mech && inferredMech !== 'PERMANENT_VIA_REPLICA' && input.mech !== inferredMech) {
  throw new ConstraintError('mech mismatch: host manifest and blob disagree', { ... });
}

// lines 97-101: translates via mech adapter
const mech = input.mech ?? inferredMech;
const mechAdapter = getMechAdapter(mech);
const { secret, expiresAt } = await mechAdapter.deliverForGet({ source });

// lines 104-116: constructs full KeyrackKeyGrant
return new KeyrackKeyGrant({
  slug: input.slug,
  key: { secret, grade },
  source: { vault: 'os.envvar', mech },
  env,
  org,
  expiresAt,
});
```

**why it holds**: every line matches the blueprint. the translation flow (infer → validate → translate → construct) is preserved.

---

### 2. asKeyrackFirewallSource.ts

**blueprint spec requirement** (lines 226-294):
- regex: `/^(\w+)\((\w+):\/\/(.*)?\)$/`
- error messages with `hint` and `examples`
- return `{ type: 'env', format: 'json', envVar }` for env://
- return `{ type: 'stdin', format: 'json' }` for stdin://

**actual implementation verified** (lines 19-63):

- line 23: regex matches exactly
- lines 24-30: ConstraintError with slug, hint, examples
- lines 44-51: env:// returns `{ type: 'env', format: 'json', envVar: path }`
- lines 54-55: stdin:// returns `{ type: 'stdin', format: 'json' }`

**why it holds**: the parser follows the extensible URI pattern from the vision. each branch matches the spec.

---

### 3. inferKeyrackMechForGet.ts

**blueprint spec requirement** (lines 201-222):
```typescript
export const inferKeyrackMechForGet = (input: { value: string }): KeyrackGrantMechanism => {
  try {
    const parsed = JSON.parse(input.value);
    if (parsed.mech && typeof parsed.mech === 'string') {
      return parsed.mech as KeyrackGrantMechanism;
    }
  } catch { /* not JSON */ }
  return 'PERMANENT_VIA_REPLICA';
};
```

**actual implementation**: line-for-line identical.

**why it holds**: the function is a direct copy from the blueprint. the try-catch handles non-JSON, the type guard validates mech field.

---

### 4. getKeyrackFirewallOutput.ts

**blueprint spec requirement** (lines 580-648):
- treestruct output always (for debug experience)
- github.actions: `::add-mask::`, `::notice::`, write to `$GITHUB_ENV`
- json: structured output
- multiline values use heredoc syntax

**actual implementation verified** (lines 38-113):

- lines 43-83: treestruct with grants/blocked/absent counts
- lines 86-92: check for GITHUB_ENV, throw if absent
- line 99: `::add-mask::${secret}`
- lines 102-103: `::notice::` for expiry
- line 107: `writeToGithubEnv` (uses heredoc for multiline, lines 15-28)
- lines 109-111: JSON.stringify for json mode

**why it holds**: each output format matches the vision's debug experience requirements.

---

### 5. mechAdapterReplica.ts — ghs_* fix

**vision spec** (lines 344-346):
> ghs_* tokens are GitHub App installation access tokens, which are inherently short-lived (1 hour max, enforced by GitHub's API). Remove ghs_* from LONG_LIVED_PATTERNS.

**actual implementation** (lines 11-29):

LONG_LIVED_PATTERNS array:
- ghp_* — present (blocked)
- gho_* — present (blocked)
- ghu_* — present (blocked)
- ghs_* — **NOT present** (allowed through)
- ghr_* — present (blocked)
- AKIA* — present (blocked)

Lines 21-22 document the intent:
```
// ghs_* (server-to-server) tokens are NOT blocked — they are ephemeral
// tokens generated from GitHub App installations (short-lived)
```

**why it holds**: the fix explicitly removed ghs_* and added a comment. the vision's research result is implemented.

---

### 6. invokeKeyrack.ts firewall command

**blueprint codepath** (lines 85-131):

```
PHASE 0: load manifest, filter slugs
PHASE 1: collect attempts via getKeyrackKeyGrant
PHASE 2: validate, fail fast if blocked (exit 2, grants: [])
PHASE 3: emit via getKeyrackFirewallOutput
```

**actual implementation** (lines 1373-1508):

- lines 1449-1462: PHASE 0 — manifest load + slug filter
- lines 1471-1475: PHASE 1 — collect via `getKeyrackKeyGrant`
- lines 1477-1486: PHASE 2 — check blocked, exit 2 with `grants: []`
- lines 1489-1506: PHASE 3 — emit via `getKeyrackFirewallOutput`

**why it holds**: the three-phase atomicity model from the blueprint is preserved. no credentials leak on partial failure.

---

## conclusion

| file | adherence | evidence |
|------|-----------|----------|
| vaultAdapterOsEnvvar.ts | **matches spec** | translation flow preserved |
| asKeyrackFirewallSource.ts | **matches spec** | extensible URI pattern |
| inferKeyrackMechForGet.ts | **matches spec** | line-for-line identical |
| getKeyrackFirewallOutput.ts | **matches spec** | all output formats |
| mechAdapterReplica.ts | **matches spec** | ghs_* not in blocked list |
| invokeKeyrack.ts | **matches spec** | three-phase atomicity |

no deviations found.
