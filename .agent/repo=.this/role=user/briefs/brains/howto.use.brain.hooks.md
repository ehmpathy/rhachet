# brain hooks

## .what

hooks that fire at brain lifecycle events. enables roles to react to session start, compaction, tool use, and session end.

## .shape

```ts
hooks?: {
  onBrain?: {
    onBoot?: BrainHook[];   // session start, compaction events
    onTool?: BrainHook[];   // before tool use
    onStop?: BrainHook[];   // session end
  };
}
```

## .hook structure

```ts
interface BrainHook {
  command: string;           // shell command to execute
  timeout: IsoDuration;      // e.g., 'PT30S' for 30 seconds
  filter?: {
    what?: string;           // filter which events trigger hook
    when?: 'before' | 'after'; // for onTool only
  };
}
```

## .onBoot filter.what values

`filter.what` controls which boot trigger fires the hook:

| value | fires on | use case |
|-------|----------|----------|
| (none) | SessionStart | backwards compat default |
| `SessionStart` | new session + compaction | same as no filter |
| `PostCompact` | compaction only | verify compaction assumptions |
| `PreCompact` | before compaction | checkpoint state |

## .examples

### hook on every session start

```yaml
hooks:
  onBrain:
    onBoot:
      - command: npx rhachet run --init boot.sh
        timeout: PT30S
```

### hook only on compaction

```yaml
hooks:
  onBrain:
    onBoot:
      - command: npx rhachet run --init postcompact.verify.sh
        timeout: PT30S
        filter:
          what: PostCompact
```

### checkpoint before compaction

```yaml
hooks:
  onBrain:
    onBoot:
      - command: npx rhachet run --init precompact.checkpoint.sh
        timeout: PT30S
        filter:
          what: PreCompact
```

### hook before tool use

```yaml
hooks:
  onBrain:
    onTool:
      - command: npx rhachet run --init validate-tool.sh
        timeout: PT10S
        filter:
          what: Bash
          when: before
```

## .claude code translation

rhachet hooks translate to claude code `.claude/settings.json`:

| rhachet | claude code |
|---------|-------------|
| `onBoot` (no filter) | `SessionStart` |
| `onBoot` + `filter.what=SessionStart` | `SessionStart` |
| `onBoot` + `filter.what=PostCompact` | `PostCompact` |
| `onBoot` + `filter.what=PreCompact` | `PreCompact` |
| `onTool` | `PreToolUse` |
| `onStop` | `Stop` |

## .why

- enables compaction-specific verification
- supports state checkpoint before context wipe
- decouples lifecycle behaviors from roles
- consistent pattern with onTool filter

## .see also

- [howto.use.brain.role](./howto.use.brain.role.md) — role configuration
- [howto.for.suppliers](./howto.for.suppliers.md) — supplier brief overview
