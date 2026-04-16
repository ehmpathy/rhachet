# review.self: has-consistent-conventions (round 4)

## deeper dive: read the actual code line by line

### findRolesWithBootableButNoHook.ts — name conventions

```typescript
// line 1-3: imports
import type { RoleRegistry } from '@src/domain.objects/roles/RoleRegistry';
```

**check**: import path uses `@src/` alias — matches extant convention.

```typescript
// line 5-8: type export
export type BootHookViolationReason =
  | 'no-hook-declared'
  | 'absent-roles-boot-command'
  | 'wrong-role-name';
```

**check**: type union names use kebab-case string literals — matches error reason conventions in codebase.

```typescript
// line 10-17: interface export
export interface RoleBootHookViolation {
  roleSlug: string;
  reason: BootHookViolationReason;
  hasBriefsDirs: boolean;
  hasSkillsDirs: boolean;
}
```

**check**: interface name follows `[Noun][Adjective]` pattern (`Role` + `BootHookViolation`).

### assertRegistryBootHooksDeclared.ts — message conventions

```typescript
// error message template
const message = `
🐢 bummer dude...

🐚 repo introspect
   └─ ✋ bootable roles lack boot hooks
      └─ roles
${roleLines}
`.trim();
```

**check**: uses lowercase prose ("bootable roles lack boot hooks") — matches `rule.prefer.lowercase`.

**check**: uses turtle vibes header — matches `rule.require.treestruct-output`.

**check**: uses treestruct tree markers (`└─`, `├─`) — matches extant guards.

### acceptance test — case name conventions

```typescript
given('[case9] rhachet-roles package with bootable content but no boot hook', () => {
```

**check**: case number sequential (`case9` after `case8`).

**check**: description is lowercase except for proper nouns.

### fixture name conventions

```
blackbox/.test/assets/with-roles-package-no-hook/
```

**check**: matches extant fixture pattern (`with-*`).

### conclusion

all conventions verified line by line. no divergence found.

- import paths: ✓ `@src/` alias
- type names: ✓ `[Noun][Adjective]` pattern
- string literals: ✓ kebab-case
- prose: ✓ lowercase
- tree markers: ✓ treestruct
- test cases: ✓ sequential numbers
- fixtures: ✓ `with-*` pattern

