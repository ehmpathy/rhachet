# review: has-consistent-mechanisms

## verdict: pass

## analysis

searched codebase for extant stdin utilities or patterns. found no duplication.

### search conducted

| grep pattern | files found | result |
|--------------|-------------|--------|
| `for await.*stdin\|process\.stdin\|chunks\.push` | 9 | 4 are the fix, 5 are different use cases |
| `readAllStdin\|readStdin\|getStdin\|consumeStdin` | 0 | no extant utility |
| `setEncoding.*utf` | 2 | only the two fixed files |
| `for await.*of` | 2 | only the two fixed files |

files examined:
- `src/infra/promptHiddenInput.ts` — the fix
- `src/infra/promptVisibleInput.ts` — the fix
- `setupAwsSsoWithGuide.ts` — uses readline.question for interactive prompts, different use case
- `executeSkill.ts` — uses spawnSync stdin passthrough, different use case
- `executeInit.ts` — uses spawnSync stdin passthrough, different use case

### stdin patterns in codebase

| file | pattern | purpose | reusable? |
|------|---------|---------|-----------|
| promptHiddenInput.ts | async iterator | read all piped stdin (secrets) | no — is the utility |
| promptVisibleInput.ts | async iterator | read all piped stdin (visible) | no — is the utility |
| setupAwsSsoWithGuide.ts | readline.question | interactive TTY prompts | no — different use case |
| executeSkill.ts | spawnSync stdin | passthrough to child | no — different use case |
| executeInit.ts | spawnSync stdin | passthrough to child | no — different use case |

### no extant utility to reuse

grepped for `readFullStdin`, `readStream`, `consumeStdin` — none found.

the async iterator pattern in promptHiddenInput and promptVisibleInput is the canonical way to read piped stdin in this codebase. both files now use the same pattern.

### consistent mechanism

both fixed files use identical async iterator pattern:

```ts
const chunks: string[] = [];
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
```

difference is post-process:
- promptHiddenInput: slices final newline (preserves embedded newlines)
- promptVisibleInput: trims all whitespace (matches extant .trim() contract)

this is consistent with their respective contracts:
- hidden input = secrets, preserve all content except final newline
- visible input = user text, trim whitespace

### could we extract a shared utility?

| option | analysis |
|--------|----------|
| shared `readAllStdin()` | possible, but only 2 call sites with different post-process |
| per wet-over-dry rule | wait for 3+ usages before abstract |

the pattern is 6 lines. extract would save ~3 lines per call site. not worth the abstraction yet.

### no duplication found

- no extant utility that does what we need
- no other files that could share this code
- both promptHiddenInput and promptVisibleInput are the only stdin consumers for cli input

### why it holds

**question: does the codebase already have a mechanism that does this?**

no. grepped for stdin consumption patterns. found:
- `readline.question` in setupAwsSsoWithGuide.ts — interactive prompt, not piped stdin reader
- `spawnSync` stdin passthrough in executeSkill.ts / executeInit.ts — passes stdin to child process, not reads it

neither reads all stdin content. the fix fills a gap.

**question: do we duplicate extant utilities?**

no. before this fix, promptHiddenInput and promptVisibleInput both used `readline.once('line')` which read only one line. the fix replaces both with async iterator pattern. no duplication introduced — we unified two broken patterns into one correct pattern.

**question: could we reuse an extant component?**

no extant component exists. the options:
1. node's `fs.readFileSync('/dev/stdin')` — blocks thread, not async-friendly
2. node's `readline` — designed for line-by-line, not full stream
3. node's async iterator — the correct choice for async full-stream read

the fix uses node's built-in async iterator on readable streams. this is the idiomatic pattern for this use case.

**question: should we extract a shared utility now?**

no. per wet-over-dry rule:
- only 2 call sites
- different post-process (slice newline vs trim)
- 6 lines each, not complex enough to warrant abstraction
- wait for 3rd usage before extract

the review passes because:
1. no extant mechanism to reuse
2. no duplication introduced
3. both files now use the same idiomatic pattern
4. abstraction deferred per wet-over-dry

