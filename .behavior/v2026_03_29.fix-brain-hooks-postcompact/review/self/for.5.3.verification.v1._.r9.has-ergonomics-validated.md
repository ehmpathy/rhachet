# self-review: has-ergonomics-validated (r9)

## question

does the actual input/output match what felt right at repros?

## no repros artifact — vision defines planned ergonomics

no repros artifact exists (this is internal adapter code). the vision document (1.vision.md) defines the planned ergonomics for the role definition contract.

## step 1: extract planned input from vision

from 1.vision.md lines 33-43, the planned YAML input:

```yaml
hooks:
  onBrain:
    onBoot:
      - command: npx rhachet run --init postcompact.trust-but-verify.sh
        timeout: PT30S
        filter:
          what: PostCompact
```

the key ergonomic decisions:
- `event: onBoot` (not a new event type)
- `filter.what: PostCompact` (filter determines boot trigger)
- `timeout: PT30S` (iso duration format)

## step 2: extract actual input from test cases

from translateHook.test.ts lines 113-120 (case5):

```ts
const hook: BrainHook = {
  author: 'repo=test/role=tester',
  event: 'onBoot',
  command: 'echo "post"',
  timeout: 'PT30S',
  filter: { what: 'PostCompact' },
};
```

## step 3: compare planned vs actual input

| field | planned (vision YAML) | actual (test case) | match? |
|-------|----------------------|-------------------|--------|
| event | `onBoot` | `'onBoot'` | YES |
| command | `npx rhachet run --init ...` | `'echo "post"'` | YES (different command, same structure) |
| timeout | `PT30S` | `'PT30S'` | YES |
| filter.what | `PostCompact` | `'PostCompact'` | YES |

**planned input structure matches actual BrainHook interface.**

## step 4: extract planned output from vision

from 1.vision.md lines 195-218, the planned JSON output:

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

key ergonomic decisions:
- event is `PostCompact` (from filter.what)
- matcher is `*` (boot events have no subject to match)
- timeout is 30000ms (converted from PT30S)

## step 5: extract actual output from test assertions

from translateHook.test.ts lines 125-135 (case5 assertions):

```ts
then('returns array with one entry', () => {
  expect(result).toHaveLength(1);
});

then('event is PostCompact', () => {
  expect(result[0]?.event).toEqual('PostCompact');
});

then('entry matcher is wildcard', () => {
  expect(result[0]?.entry.matcher).toEqual('*');
});
```

and from translateHook.ts lines 55-80, the actual output structure:

```ts
const buildEntry = (matcher: string): ClaudeCodeHookEntry => ({
  matcher,
  hooks: [{ type: 'command', command: hook.command, timeout: timeoutMs }],
});

if (hook.event === 'onBoot') {
  const bootTrigger = hook.filter?.what ?? 'SessionStart';
  // ...
  return [{ event: bootTrigger, entry: buildEntry('*') }];
}
```

## step 6: compare planned vs actual output

| field | planned (vision JSON) | actual (implementation) | match? |
|-------|----------------------|------------------------|--------|
| event key | `PostCompact` | `result[0]?.event = 'PostCompact'` | YES |
| matcher | `*` | `buildEntry('*')` | YES |
| hooks[0].type | `command` | `{ type: 'command' }` | YES |
| hooks[0].timeout | `30000` | `timeoutMs` (parsed from PT30S) | YES |

**planned output structure matches actual translateHookToClaudeCode output.**

## step 7: verify supplier brief consistency

read `.agent/repo=.this/role=user/briefs/brains/howto.use.brain.hooks.md`:

the brief documents:
- input: `filter.what: PostCompact` (same as vision and test)
- output: `PostCompact` event (same as vision and test)
- translation table matches vision exactly

| filter.what | claude code event |
|-------------|-------------------|
| (none) | SessionStart |
| SessionStart | SessionStart |
| PostCompact | PostCompact |
| PreCompact | PreCompact |
| * | all three |

**supplier brief matches vision and implementation.**

## step 8: verify all test cases cover all filter values

from translateHook.test.ts:

| test case | filter.what | expected event | lines |
|-----------|-------------|----------------|-------|
| case1 | (none) | SessionStart | 12-43 |
| case5 | PostCompact | PostCompact | 113-137 |
| case6 | PreCompact | PreCompact | 139-159 |
| case7 | SessionStart | SessionStart | 161-181 |
| case8 | * | all three | 183-211 |
| case9 | InvalidEvent | throws | 213-229 |

**all documented filter.what values have test coverage.**

## ergonomics drift assessment

| aspect | planned | actual | drift? |
|--------|---------|--------|--------|
| input: event | onBoot | onBoot | NO |
| input: filter.what | PostCompact | PostCompact | NO |
| input: timeout | PT30S (iso) | PT30S (iso) | NO |
| output: event | PostCompact | PostCompact | NO |
| output: matcher | * | * | NO |
| output: timeout | 30000ms | 30000ms | NO |
| default (no filter) | SessionStart | SessionStart | NO |
| wildcard | expands to 3 | expands to 3 | NO |
| invalid | fails fast | throws | NO |

**no ergonomics drift detected.**

## conclusion

- [x] extracted planned input from 1.vision.md lines 33-43
- [x] extracted actual input from translateHook.test.ts lines 113-120
- [x] compared planned vs actual input (match)
- [x] extracted planned output from 1.vision.md lines 195-218
- [x] extracted actual output from translateHook.ts lines 55-80 and test assertions
- [x] compared planned vs actual output (match)
- [x] verified supplier brief consistency with vision and implementation
- [x] verified all filter.what values have test coverage

**why it holds:** the implementation exactly matches the ergonomics planned in the vision. the input structure (`event: 'onBoot'` + `filter: { what: 'PostCompact' }`) produces the output structure (`{ event: 'PostCompact', entry: { matcher: '*', ... } }`) as designed. specific line numbers in test file (113-120 for input, 125-135 for output assertions) confirm the ergonomics. supplier brief documents these same ergonomics. no drift occurred between plan and implementation.

