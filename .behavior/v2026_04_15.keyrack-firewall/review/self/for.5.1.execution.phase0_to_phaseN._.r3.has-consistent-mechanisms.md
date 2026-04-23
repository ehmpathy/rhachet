# consistent mechanisms review (r3) — keyrack firewall

## review question

for each new mechanism in the code, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate prior utilities or patterns?
- could we reuse a prior component instead of a new one?

---

## deep code inspection

### asKeyrackSlugParts.ts — found issue, fixed

**initial state**: duplicated env extraction logic (`parts[1] ?? ''`)

**prior mechanism**: `asKeyrackKeyEnv.ts` already extracts env from slug

**fix applied**:
```typescript
// before (duplicate logic)
const parts = input.slug.split('.');
const env = parts[1] ?? '';

// after (reuses prior transformer)
const env = asKeyrackKeyEnv({ slug: input.slug });
```

**verification**: unit tests pass (4/4)

### vault adapter consistency — verified

**checked**: all 6 readable vaults for consistent patterns

| vault | inferKeyGrade call | asKeyrackSlugParts call |
|-------|-------------------|------------------------|
| os.envvar | `inferKeyGrade({ vault: 'os.envvar', mech })` ✓ | `asKeyrackSlugParts({ slug })` ✓ |
| os.secure | `inferKeyGrade({ vault: 'os.secure', mech })` ✓ | `asKeyrackSlugParts({ slug })` ✓ |
| os.direct | `inferKeyGrade({ vault: 'os.direct', mech })` ✓ | `asKeyrackSlugParts({ slug })` ✓ |
| os.daemon | `inferKeyGrade({ vault: 'os.daemon', ... })` ✓ | uses daemon cache (env/org stored) |
| aws.config | `inferKeyGrade({ vault: 'aws.config', mech })` ✓ | `asKeyrackSlugParts({ slug })` ✓ |
| 1password | `inferKeyGrade({ vault: '1password', mech })` ✓ | `asKeyrackSlugParts({ slug })` ✓ |

**note on os.daemon**: the `get` method correctly uses daemon cache which already has env/org. the `set` method has manual slug parse (`parts[0] ?? 'unknown'`) but this is prior code outside the scope of this behavior.

### inferKeyrackMechForGet.ts — verified no duplication

**searched**: `inferKeyrack` patterns in codebase

**found**:
- `inferKeyrackMechForSet.ts` — prompts user for mech when set runs (different direction)
- `inferKeyrackEnvForSet.ts` — prompts user for env when set runs (different concern)

**conclusion**: `inferKeyrackMechForGet` is a new capability — detects mech from JSON blob for get operations. no duplication.

### getKeyrackFirewallOutput.ts — verified no duplication

**searched**: github actions output patterns

**found**: no prior `::add-mask::` or `$GITHUB_ENV` write logic

**conclusion**: new capability for CI output format. no duplication.

### asKeyrackFirewallSource.ts — verified no duplication

**searched**: URI/slug parse patterns

**found**:
- `asKeyrackKeySlug.ts` — constructs slug from parts (inverse direction)
- no prior `json(env://VAR)` style parse

**conclusion**: new capability for `--from` parse. no duplication.

---

## conclusion

found one issue in initial implementation: `asKeyrackSlugParts.ts` duplicated env extraction instead of calling `asKeyrackKeyEnv.ts`. fixed by import and call to the prior transformer.

all other new components are new capabilities that don't duplicate prior mechanisms:
- `inferKeyrackMechForGet.ts` — new direction (detect mech from JSON on get)
- `getKeyrackFirewallOutput.ts` — new output format (github actions)
- `asKeyrackFirewallSource.ts` — new input parse (`--from` slugs)

vault adapters follow consistent patterns for `inferKeyGrade` and `asKeyrackSlugParts` calls.
