# adapters

## .what

an adapter is any mechanism which transforms a payload from ShapeA to ShapeB, to adapt from ContractA to ContractB.

adapters enable rhachet to declare contracts in a uniform way, while the actual implementation varies based on the target system.

## .pattern

```
ContractA (rhachet)  →  Adapter  →  ContractB (target system)
```

the adapter:
1. receives input in rhachet's contract shape
2. transforms it to the target system's contract shape
3. applies the operation to the target system
4. optionally transforms the response back to rhachet's shape

## .examples

### BrainHooksAdapter

enables rhachet Roles to declare `.hooks` via a rhachet contract, which is then translated to apply to whatever brain is requested.

```
RoleHooksOnBrain (rhachet)  →  BrainHooksAdapter  →  brain-specific config
```

for example, with claude-code:
- `onBoot` hooks → `.hooks.SessionStart` entries in `.claude/settings.json`
- `onTool` hooks → `.hooks.PreToolUse` entries in `.claude/settings.json`
- `onStop` hooks → `.hooks.Stop` entries in `.claude/settings.json`

the adapter encapsulates:
- file path (`.claude/settings.json`)
- config format (json with specific structure)
- event name mapping (`onBoot` → `SessionStart`)
- hook shape transformation

### future: DispatchHooksAdapter

today, the only dispatch interface rhachet supports is the rhachet cli itself, so no DispatchHooksAdapter is needed.

in the future, when we support remote dispatch (e.g., via api, queue, or webhook), we may need a DispatchHooksAdapter to translate rhachet dispatch requests into the target system's invocation contract.

## .relationship to suppliers

suppliers may provide adapters as part of their supply:
- brain suppliers provide BrainHooksAdapters (one per supported brain repl cli)
- role suppliers may provide adapters for role-specific integrations (future)

the adapter is a component supplied by the supplier, not a separate concept.

## .why

adapters enable:
- **uniform contract** — roles declare hooks once, in rhachet's shape
- **multi-target support** — same declaration works across different brains
- **encapsulation** — target-specific details are hidden from role authors
- **extensibility** — new targets can be supported by adding adapters
