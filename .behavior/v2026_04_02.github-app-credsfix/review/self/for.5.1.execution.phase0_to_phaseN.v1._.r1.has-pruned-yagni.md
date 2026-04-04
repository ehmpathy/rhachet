# review: has-pruned-yagni

## verdict: pass

## analysis

i re-read the changed files line by line. the fix is minimal.

### files verified

**promptHiddenInput.ts (lines 12-22)** — 11 lines changed
```ts
if (!process.stdin.isTTY) {
  // read ALL stdin content, not just first line
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  const content = chunks.join('');
  // trim final newline if present (stdin often ends with \n)
  return content.endsWith('\n') ? content.slice(0, -1) : content;
}
```
- async iterator reads all chunks until EOF
- joins chunks
- slices final newline only (preserves embedded newlines in json)
- TTY path unchanged (lines 24-81)

**promptVisibleInput.ts (lines 12-22)** — 10 lines changed
```ts
if (!process.stdin.isTTY) {
  // read ALL stdin content, not just first line
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  // trim whitespace to match extant .trim() behavior
  return chunks.join('').trim();
}
```
- same async iterator pattern
- uses `.trim()` to match extant contract
- TTY path unchanged (lines 25-35)

### yagni check

| potential extra | status | why not needed |
|-----------------|--------|----------------|
| error handling for binary content | not added | not requested; would add complexity |
| size limits on stdin | not added | not requested; nodejs handles large streams |
| validation that json is valid | not added | not requested; keyrack validates downstream |
| new cli flags | not added | not requested; fix is internal |
| shared stdin reader utility | not added | only 2 call sites; wet is fine |

### why it holds

the fix does exactly what was requested:
1. reads all stdin (not just first line)
2. preserves embedded newlines
3. handles final newline trim

no extra features, no abstractions, no "future flexibility".
