# self-review r4: has-pruned-backcompat (verification)

## r3 found an issue — verify it was fixed

### issue found in r3

promptVisibleInput extant code uses `.trim()` but blueprint only trimmed trailing newline.

### fix applied

updated blueprint promptVisibleInput "after" section to use `.trim()`:

```ts
return chunks.join('').trim();
```

### verification

read the updated blueprint section:

- promptHiddenInput: uses `content.endsWith('\n') ? content.slice(0, -1) : content`
  - matches extant: returns line without trailing newline

- promptVisibleInput: uses `chunks.join('').trim()`
  - matches extant: returns `line.trim()`

both now preserve extant behavior.

## deeper review: any other backcompat concerns?

### concern 3: empty stdin behavior

**extant behavior**: readline `close` event returns `''`

**blueprint behavior**: async iterator on empty stdin returns `''` (join of empty array)

**match?** yes — both return empty string

### concern 4: charset backward compat

**extant behavior**: readline uses process.stdin default charset

**blueprint behavior**: explicit `setEncoding('utf8')`

**match?** mostly — stdin default is utf-8 on most systems. explicit is safer.

**risk?** low — if someone had non-utf8 stdin before, it was already broken with readline

### concern 5: timing/async behavior

**extant behavior**: readline is event-based, returns on first line

**blueprint behavior**: async iterator waits for EOF

**match?** no — but this is the fix itself, not backcompat

**the change is**: read all content instead of first line only. this is the intended fix.

## summary

| concern | extant | blueprint | status |
|---------|--------|-----------|--------|
| promptHiddenInput newline | strip final `\n` | strip final `\n` | match |
| promptVisibleInput trim | `.trim()` | `.trim()` | match (fixed in r4) |
| empty stdin | `''` | `''` | match |
| charset | implicit utf-8 | explicit utf-8 | acceptable |
| EOF wait | first line | all content | intended change |

no backcompat issues remain. blueprint is ready.
