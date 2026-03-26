# self-review: has-consistent-mechanisms

## summary

reviewed new code for duplication of extant functionality.

**verdict: mechanisms are consistent with extant patterns.**

## analysis

### 1. `getLinkedRoleSlugs` vs `getLinkedRolesWithHooks`

**question**: does `getLinkedRoleSlugs` in `invokeEnroll.ts` duplicate `getLinkedRolesWithHooks`?

**answer**: no, they serve different purposes.

| aspect | `getLinkedRoleSlugs` (new) | `getLinkedRolesWithHooks` (extant) |
|--------|---------------------------|-----------------------------------|
| includes `repo=.this` | yes | no (skips it) |
| npm imports | none (filesystem only) | yes (dynamic import for hooks) |
| returns | `RoleSlug[]` (strings) | `HasRepo<Role>[]` (full objects) |
| use case | role discovery at enroll time | hook application (needs full Role) |
| speed | fast (filesystem only) | slower (npm imports) |

the extant function is designed for hook application where you need the full Role object with `hooks.onBrain`. the new function is designed for enroll-time role discovery where you just need to know what roles exist (and includes native `repo=.this` roles).

**conclusion**: not a duplicate — different purposes, different contracts.

### 2. levenshtein distance usage

**question**: does the typo suggestion logic duplicate extant patterns?

**answer**: no, it follows the extant pattern.

both `computeBrainCliEnrollment.ts` (new) and `getAvailableBrainsInWords.ts` (extant) use:
- `import { distance } from 'fastest-levenshtein'`
- compute distance between strings
- use result for suggestions / sorted display

**conclusion**: consistent with extant pattern — same package, same usage pattern.

### 3. config file generation

**question**: does `genBrainCliConfigArtifact` duplicate extant config generation?

**answer**: partially reuses, partially new.

| aspect | new code | reuse |
|--------|----------|-------|
| settings.json read | custom in new file | fresh (no extant function for this) |
| hook filter by role | custom in new file | fresh (no extant function for this) |
| unique hash generation | custom in new file | fresh (no extant function for this) |
| ClaudeCodeSettings type | reused from `@src/_topublish/rhachet-brains-anthropic` | ✓ |

the new code does introduce new functions, but they serve a new purpose (dynamic config generation with role filter). no extant function provides this capability.

**conclusion**: uses extant types, introduces new functions where needed.

### 4. DomainLiteral pattern

**question**: do new domain objects follow extant patterns?

**answer**: yes.

all new domain objects (`BrainCliEnrollmentSpec`, `BrainCliEnrollmentOperation`, `BrainCliEnrollmentManifest`) extend `DomainLiteral`, consistent with extant pattern throughout the codebase.

**conclusion**: consistent with extant pattern.

## conclusion

the new code:
1. follows extant patterns (levenshtein, DomainLiteral, types)
2. introduces new functions only where extant ones don't serve the purpose
3. does not duplicate extant functionality
