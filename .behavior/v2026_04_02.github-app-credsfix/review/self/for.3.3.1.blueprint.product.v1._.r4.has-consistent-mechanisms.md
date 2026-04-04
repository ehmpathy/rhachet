# self-review r4: has-consistent-mechanisms

## search for extant stdin utilities

searched codebase for:
- `for await.*stdin`
- `text.*stdin`
- `readStdin`
- `getAllStdin`

**result**: no extant utility for read-all-stdin pattern

the codebase has:
- `promptHiddenInput` and `promptVisibleInput` — the files we fix
- stdin passthrough in executeSkill (different usecase: pipes stdin to child process)
- stdin in test infra (different usecase: test harness)

## new mechanism in blueprint

**mechanism**: async iterator to read all stdin

```ts
const chunks: string[] = [];
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
return chunks.join('');
```

**does codebase have this?** no — this pattern does not exist elsewhere

**should we extract to utility?** no — rule.prefer.wet-over-dry says wait for 3+ usages

we have 2 usages (promptHiddenInput and promptVisibleInput). that's below threshold.

**could we use node:stream/consumers?**

```ts
import { text } from 'node:stream/consumers';
const content = await text(process.stdin);
```

this is simpler (1 line vs 5). but:
1. no extant usage of `node:stream/consumers` in codebase
2. adding new import pattern vs inline code
3. both work correctly

**verdict**: either pattern is acceptable. async iterator is more explicit. keep as-is.

## summary

| mechanism | extant equivalent? | action |
|-----------|-------------------|--------|
| async iterator on stdin | no | keep (no duplication) |
| chunks array + join | no | keep (standard pattern) |
| .trim() for visible | yes (extant behavior) | keep (consistent) |
| final newline trim for hidden | yes (extant behavior) | keep (consistent) |

no duplication found. blueprint is consistent with codebase patterns.
