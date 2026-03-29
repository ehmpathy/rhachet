# self-review: has-ergonomics-validated (r8)

## question

does the actual input/output match what felt right at repros?

## no repros artifact, but vision has planned ergonomics

no repros artifact exists (this is internal adapter code). however, 1.vision.md documents the planned ergonomics for the role definition contract.

## planned input (from 1.vision.md lines 33-43)

```yaml
hooks:
  onBrain:
    onBoot:
      - command: npx rhachet run --init postcompact.trust-but-verify.sh
        timeout: PT30S
        filter:
          what: PostCompact   # only after compaction
```

## actual input (from BrainHook domain object)

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

**comparison:** the planned YAML structure exactly matches what BrainHook accepts. `filter.what` is optional and accepts any string.

## planned output (from 1.vision.md lines 195-218)

```json
{
  "hooks": {
    "PostCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npx rhachet run --init postcompact.trust-but-verify.sh",
            "timeout": 30000
          }
        ]
      }
    ]
  }
}
```

## actual output (from translateHook.ts lines 55-80)

```ts
if (hook.event === 'onBoot') {
  const bootTrigger = hook.filter?.what ?? 'SessionStart';
  // ...
  return [{ event: bootTrigger, entry: buildEntry('*') }];
}
```

where `buildEntry('*')` produces:
```ts
{
  matcher: '*',
  hooks: [{ type: 'command', command: hook.command, timeout: timeoutMs }]
}
```

**comparison:** the actual output matches the planned output exactly:
- event is `PostCompact` (from `filter.what`)
- matcher is `*` (boot events have no subject to match)
- timeout converted to milliseconds (30000)

## supplier brief matches vision

i read the supplier brief at `.agent/repo=.this/role=user/briefs/brains/howto.use.brain.hooks.md`.

the brief documents:
- same YAML input structure as vision
- same filter.what values as criteria
- same translation table as blueprint

| artifact | input structure | output structure | filter values |
|----------|-----------------|------------------|---------------|
| 1.vision.md | `filter.what: PostCompact` | `PostCompact: [...]` | PostCompact, PreCompact, SessionStart, * |
| howto.use.brain.hooks.md | `filter.what: PostCompact` | `PostCompact` event | PostCompact, PreCompact, SessionStart, * |
| translateHook.ts | `hook.filter?.what` | `{ event: bootTrigger }` | VALID_BOOT_EVENTS |

all three are consistent.

## ergonomics drift assessment

| aspect | planned | actual | drifted? |
|--------|---------|--------|----------|
| input structure | `filter.what: PostCompact` | `filter.what: PostCompact` | NO |
| output event | `PostCompact` | `PostCompact` | NO |
| default (no filter) | SessionStart | SessionStart | NO |
| wildcard behavior | expands to 3 events | expands to 3 events | NO |
| invalid filter | fails fast | throws UnexpectedCodePathError | NO |

**no drift detected.**

## conclusion

- [x] compared planned input from vision to actual BrainHook interface
- [x] compared planned output from vision to actual translateHookToClaudeCode
- [x] verified supplier brief matches vision and implementation
- [x] confirmed no ergonomics drift

**why it holds:** the implementation exactly matches the ergonomics planned in the vision. the input structure (`filter.what: PostCompact`) produces the output structure (`{ event: 'PostCompact', ... }`) as designed. the supplier brief documents these same ergonomics. no drift occurred between plan and implementation.

