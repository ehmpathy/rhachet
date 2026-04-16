# review.self: has-role-standards-adherance

## question: does implementation adhere to role standards?

### mechanic role standards

#### input-context pattern
```typescript
// ✓ follows (input, context?) pattern
export const findRolesWithBootableButNoHook = (input: {
  registry: RoleRegistry;
}): RoleBootHookViolation[] => { ... }
```

#### arrow functions only
```typescript
// ✓ all functions use arrow syntax
export const findRolesWithBootableButNoHook = (...) => { ... }
export const assertRegistryBootHooksDeclared = (...) => { ... }
```

#### failfast via helpful-errors
```typescript
// ✓ uses BadRequestError for user-fixable errors
throw new BadRequestError('bootable roles lack boot hooks', { ... });
```

#### what-why headers
```typescript
/**
 * .what = finds roles with bootable content (briefs.dirs or skills.dirs) that lack a valid boot hook
 * .why = prevents common footgun where roles have content but never boot it
 */
```

#### treestruct output
```
// ✓ follows rule.require.treestruct-output
🐢 bummer dude...

🐚 repo introspect
   └─ ...
```

### ergonomist role standards

#### turtle vibes
- ✓ uses "bummer dude..." for blocked state
- ✓ uses 🐢 🐚 emojis appropriately

#### no surprises
- ✓ behavior is predictable — roles without hooks fail
- ✓ error message explains why and how to fix

### architect role standards

#### bounded contexts
- ✓ transformer is pure, no side effects
- ✓ orchestrator composes transformer and throws

#### single responsibility
- ✓ `findRolesWithBootableButNoHook` — finds violations only
- ✓ `assertRegistryBootHooksDeclared` — asserts and throws only

### verdict

implementation adheres to all role standards. no deviations detected.

