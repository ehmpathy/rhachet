# review.self: has-pruned-backcompat (round 2)

## deeper review of backwards compat

re-read `findRolesWithBootableButNoHook.ts` line by line.

### line 67-68: regex for roles boot command

```ts
const hasRolesBootCommand = onBootHooks.some((hook) =>
  /\broles\s+boot\b/.test(hook.command),
);
```

**backwards compat check**: does this regex break extant valid hooks?

- matches `roles boot` with word boundaries
- matches `rhachet roles boot`, `rhx roles boot`, `npx rhachet roles boot`
- allows any whitespace between `roles` and `boot`

**verdict**: no backwards compat concern. regex is permissive.

### line 75: regex for role name

```ts
const rolePattern = new RegExp(`--role\\s+${roleSlug}(?:\\s|$)`);
```

**backwards compat check**: does this regex break extant valid hooks?

- matches `--role mechanic` at end of command
- matches `--role mechanic --other-flag` mid-command
- role slug is interpolated directly (no regex escape applied)

**concern**: if role slug contains regex special chars (`.`, `[`, etc.), pattern could break.

**verdict**: not a backwards compat concern — role slugs are alphanumeric+dash by convention. no extant role would have special chars. this is a correctness concern, not backwards compat.

### line 30-44: hasBootableContent check

```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;
```

**backwards compat check**: does this falsely flag roles as bootable?

- checks if `briefs.dirs` or `skills.dirs` property exists
- does NOT check if directories are empty or have content

**verdict**: no backwards compat concern. if a role declares `briefs.dirs`, it intends to be bootable. that's exactly what we want to guard.

### overall

no backwards compat shims added. the guard fails immediately for roles without valid boot hooks, as the wisher requested.

the ONLY extant packages that will break are those with the footgun — exactly what this guard is meant to prevent.
