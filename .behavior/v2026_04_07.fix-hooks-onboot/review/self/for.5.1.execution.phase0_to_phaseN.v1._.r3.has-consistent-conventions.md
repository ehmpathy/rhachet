# review: has-consistent-conventions

## verdict: consistent — all names follow extant patterns

## name analysis

### rhachet event names

| extant | added | pattern |
|--------|-------|---------|
| `onBoot` | — | on + lifecycle moment |
| `onTool` | — | on + lifecycle moment |
| `onStop` | — | on + lifecycle moment |
| — | `onTalk` | on + lifecycle moment |

`onTalk` follows the `on<Moment>` pattern. it describes when the hook fires: when the user talks.

### brain adapter event mappings

| rhachet | claude code | opencode |
|---------|-------------|----------|
| `onBoot` | `SessionStart` | `session.created` |
| `onTool` | `PreToolUse` | `tool.execute.before` |
| `onStop` | `Stop` | `session.idle` |
| `onTalk` | `UserPromptSubmit` | `chat.message` |

the claude code and opencode names are dictated by those platforms. rhachet's job is to map `onTalk` → platform-specific names.

### test case labels

extant pattern:
```
given('[case1] ...')
given('[case2] ...')
```

added:
```
given('[case3] ...')  // in parsePluginFileName tests
given('[case4] ...')  // in generatePluginContent tests
given('[case4] ...')  // in syncOneRoleHooksIntoOneBrainRepl tests
```

follows extant sequential case numbers.

### code comments

extant pattern:
```typescript
// extract onBoot hooks
// extract onTool hooks
// extract onStop hooks
```

added:
```typescript
// extract onTalk hooks
```

follows extant `// extract on<Event> hooks` pattern.

## why `onTalk` not `onPrompt` or `onAsk`

vision document (section "what is awkward?") evaluated alternatives:
- `onPrompt` — could confuse with system prompt
- `onAsk` — could confuse with rhachet's ask command
- `onTalk` — short, intuitive, "when the user talks"

decision was made in vision. implementation follows that decision.

## conclusion

all names follow extant conventions. no divergence detected.
