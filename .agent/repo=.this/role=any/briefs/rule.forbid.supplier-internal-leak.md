# rule.forbid.supplier-internal-leak

## .what

zero brain supplier internals may leak out of the adapter layer.

## .why

- supplier internals are implementation details
- callers must not depend on claude-code's directory structure, settings.json format, or CLAUDE.md location
- enables supplier swaps without cascade changes
- adapter is the only place that knows supplier format

## .examples

### forbidden

```typescript
// leaks claude-code directory structure
const configPath = join(gitroot, '.agent', '.brain', 'claude', 'config', 'scope=default');

// leaks settings.json format
const settings = JSON.parse(readFile(join(configPath, 'settings.json')));
settings.hooks.SessionStart.push(hook);

// leaks CLAUDE.md file name
const bootContent = readFile(join(configPath, 'CLAUDE.md'));
```

### allowed

```typescript
// adapter encapsulates all internals
const config = await adapter.findsert({ roles, scope }, context);
await adapter.daos.hooks.set.upsert({ config, hook }, context);
const bootContent = await adapter.daos.boots.get({ by: { config } }, context);
```

## .applies to

- domain.operations/
- contract/cli/
- any code outside adapter layer

## .enforcement

supplier-specific path, format, or file name in non-adapter code = blocker
