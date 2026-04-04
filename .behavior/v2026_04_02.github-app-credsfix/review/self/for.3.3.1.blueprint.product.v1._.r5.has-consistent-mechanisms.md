# self-review r5: has-consistent-mechanisms (deeper)

## deeper search for extant patterns

### search: chunks + join pattern

found usages of `join('')` in codebase:
- `withStdoutPrefix.test.ts:24` — test assertion
- `sshPrikeyToAgeIdentity.ts:141` — joined base64 lines
- `fillKeyrackKeys.ts:169` — joined arg strings
- `sourceAllKeysIntoEnv.ts:99` — joined strings
- `genRhachetUseConfig.ts:9` — joined strings

**verdict**: `join('')` is standard pattern. not a custom utility.

### search: setEncoding pattern

found in `promptHiddenInput.ts:45` — the interactive TTY branch.

the TTY branch already uses `setEncoding('utf8')`. the piped branch will now also use it.

**verdict**: consistent with extant code in same file.

### search: async iteration on streams

no extant usage of `for await (const chunk of stream)` found.

this is a new pattern. but it's a standard Node.js API, not a custom mechanism.

**verdict**: uses standard API, not a reinvention.

## alternative consideration: could we DRY the two files?

both promptHiddenInput and promptVisibleInput will have similar piped-stdin branches:

```ts
// promptHiddenInput
const chunks: string[] = [];
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
const content = chunks.join('');
return content.endsWith('\n') ? content.slice(0, -1) : content;

// promptVisibleInput
const chunks: string[] = [];
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
return chunks.join('').trim();
```

**could extract**: `readAllStdin(): Promise<string>` utility

**should we?** no — rule.prefer.wet-over-dry:
- only 2 usages
- slight difference in post-process (slice vs trim)
- abstraction would need parameter for trim behavior
- premature abstraction

**verdict**: keep inline, per wet-over-dry rule.

## summary

| check | result |
|-------|--------|
| duplicates extant utility? | no |
| uses standard API? | yes (Node.js async iteration) |
| consistent with file patterns? | yes (setEncoding already used in same file) |
| should extract utility? | no (only 2 usages, per wet-over-dry) |

no mechanism consistency issues. blueprint is approved.
