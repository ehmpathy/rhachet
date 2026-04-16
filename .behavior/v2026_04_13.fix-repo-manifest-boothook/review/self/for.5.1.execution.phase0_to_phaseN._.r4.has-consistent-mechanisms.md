# review.self: has-consistent-mechanisms

## question: do the mechanisms follow repo conventions?

### file structure

| file | location | convention |
|------|----------|------------|
| `findRolesWithBootableButNoHook.ts` | `src/domain.operations/manifest/` | ✓ transformer in domain.operations |
| `assertRegistryBootHooksDeclared.ts` | `src/domain.operations/manifest/` | ✓ orchestrator in domain.operations |
| test fixtures | `blackbox/.test/assets/` | ✓ per code.test.accept.blackbox.md |

### name conventions

| item | pattern | follows convention |
|------|---------|-------------------|
| `findRolesWithBootableButNoHook` | verb + noun hierarchy | ✓ treestruct |
| `assertRegistryBootHooksDeclared` | verb + noun hierarchy | ✓ treestruct |
| `RoleBootHookViolation` | noun + adjective | ✓ domain object |
| `BootHookViolationReason` | noun hierarchy | ✓ type union |

### input-context pattern

```typescript
// transformer — input only (pure)
export const findRolesWithBootableButNoHook = (input: {
  registry: RoleRegistry;
}): RoleBootHookViolation[] => { ... }

// orchestrator — input only (no context needed)
export const assertRegistryBootHooksDeclared = (input: {
  registry: RoleRegistry;
}): void => { ... }
```

both follow the `(input, context?)` pattern. neither requires context since they are pure operations.

### error handlers

uses `BadRequestError` from helpful-errors — consistent with other guards in `invokeRepoIntrospect.ts`:
- `assertRegistrySkillsExecutable` throws `BadRequestError`
- `assertRegistryBriefsSourcesExist` throws `BadRequestError`

### verdict

all mechanisms follow repo conventions. no deviations detected.

