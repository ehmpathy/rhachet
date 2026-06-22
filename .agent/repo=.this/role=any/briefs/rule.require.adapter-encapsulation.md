# rule.require.adapter-encapsulation

## .what

adapters must encapsulate all supplier-specific internals. orchestrators call adapter methods, adapters handle paths, files, and formats.

## .why

- orchestrators remain supplier-agnostic
- swap suppliers without code changes to callers
- tests can mock adapter without supplier knowledge
- single source of truth for supplier-specific logic

## .pattern

```typescript
// good: orchestrator calls adapter, adapter handles internals
const config = await adapter.findsert({ roles, scope }, context);

// bad: orchestrator computes supplier-specific path
const uri = join(context.gitroot, '.agent', '.brain', 'claude', 'config');
await adapter.daos.boots.set.upsert({ uri, roles });
```

## .applies to

- BrainCliConfigAdapter (claude-code, opencode)
- BrainHooksAdapter (legacy)
- any future supplier adapters

## .enforcement

supplier-specific paths/formats in orchestrators = blocker
