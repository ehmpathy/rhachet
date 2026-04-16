# review.self: has-consistent-conventions

## question: does the implementation follow code conventions?

### turtle vibes treestruct

the error output follows `rule.require.treestruct-output`:

```
🐢 bummer dude...

🐚 repo introspect
   └─ ✋ bootable roles lack boot hooks
      └─ roles
         └─ mechanic
            ├─ hasBriefsDirs: true
            ├─ hasSkillsDirs: true
            ├─ reason: no-hook-declared
            └─ hint: add onBoot hook: npx rhachet roles boot --role mechanic
```

| element | implementation | convention |
|---------|---------------|------------|
| turtle header | `🐢 bummer dude...` | ✓ blocked vibe phrase |
| shell root | `🐚 repo introspect` | ✓ names the command |
| sub.branch | `├─` / `└─` | ✓ tree structure |

### lowercase prose

all error messages use lowercase per `rule.prefer.lowercase`:
- "bootable roles lack boot hooks"
- "add onBoot hook: ..."

### no buzzwords

no buzzwords detected. uses precise terms:
- "bootable" — describes content type
- "hook" — domain term
- "violation" — describes constraint breach

### arrow functions

all functions use arrow syntax per `rule.require.arrow-only`:
```typescript
export const findRolesWithBootableButNoHook = (input: {...}): ... => { ... }
export const assertRegistryBootHooksDeclared = (input: {...}): void => { ... }
```

### verdict

all code conventions followed. no violations detected.

