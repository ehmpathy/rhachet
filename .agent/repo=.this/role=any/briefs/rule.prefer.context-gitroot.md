# rule.prefer.context-gitroot

## .what

thread contextual info like repo path through context, not input params.

## .why

- context carries ambient info (cwd, gitroot) that flows through call stack
- input carries operation-specific data (roles, scope, hook)
- reduces parameter clutter
- consistent pattern across codebase

## .pattern

```typescript
// good: gitroot from context
export const genBrainCliConfigArtifact = async (
  input: { adapter: BrainCliConfigAdapter; roles: RoleSlug[]; scope: string },
  context: ContextCli,
): Promise<{ config: RefByUnique<typeof BrainCliConfig> }> => {
  const config = await input.adapter.findsert({ roles: input.roles, scope: input.scope }, context);
  // context.gitroot available inside adapter
};

// bad: repoPath as input param
export const genBrainCliConfigArtifact = async (input: {
  adapter: BrainCliConfigAdapter;
  roles: RoleSlug[];
  scope: string;
  repoPath: string;  // should be context.gitroot
}): Promise<...> => { ... };
```

## .enforcement

repoPath as input param when context available = nitpick
