# review.self: behavior-declaration-coverage (round 5)

## deeper review: trace each wish phrase to code

### wish phrase 1: "repo introspect should failfast"

**trace to code:**

```typescript
// invokeRepoIntrospect.ts, line ~45
assertRegistryBootHooksDeclared({ registry });
```

this call happens BEFORE manifest generation. if it throws, manifest is never written.

**verdict**: ✓ covered — failfast happens at introspect time.

### wish phrase 2: "guard against roles that dont have a boot hook declared"

**trace to code:**

```typescript
// findRolesWithBootableButNoHook.ts, line 51-57
const hasOnBootHooks =
  role.hooks?.onBrain?.onBoot !== undefined &&
  role.hooks.onBrain.onBoot.length > 0;

if (!hasOnBootHooks) {
  return { ...baseViolation, reason: 'no-hook-declared' };
}
```

checks both `undefined` and empty array cases.

**verdict**: ✓ covered — guard checks hook declaration.

### wish phrase 3: "check theres an explicit onBoot hook to boot that role"

**trace to code:**

```typescript
// findRolesWithBootableButNoHook.ts, line 65-72
const hasRolesBootCommand = onBootHooks.some((hook) =>
  /\broles\s+boot\b/.test(hook.command),
);

// line 74-81
const rolePattern = new RegExp(`--role\\s+${roleSlug}(?:\\s|$)`);
const bootsThisRole = onBootHooks.some((hook) =>
  rolePattern.test(hook.command),
);
```

two checks:
1. hook contains `roles boot` command
2. hook contains `--role <this-role-slug>`

**verdict**: ✓ covered — checks hook boots THIS role explicitly.

### wish phrase 4: "make it clear, not magic"

**trace to code:**

the guard throws an error. it does NOT:
- auto-add hooks
- auto-fix the registry
- silently skip broken roles

**verdict**: ✓ covered — behavior is explicit, not magic.

### wish phrase 5: "role authors will know they need to add it"

**trace to code:**

```typescript
// assertRegistryBootHooksDeclared.ts
hint: add onBoot hook: npx rhachet roles boot --role ${v.roleSlug}
```

error message includes exact command to add.

**verdict**: ✓ covered — hint tells author exactly what to do.

### wish phrase 6: "if they want to make their role not bootable"

**trace to code:**

```typescript
// findRolesWithBootableButNoHook.ts, line 30-44
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;
const hasBootableContent = hasBriefsDirs || hasSkillsDirs;

if (!hasBootableContent) continue;
```

roles without `briefs.dirs` or `skills.dirs` are skipped — they don't need boot hooks.

**verdict**: ✓ covered — non-bootable roles are not flagged.

### conclusion

every phrase from the wish is traced to specific code. no gaps found.

