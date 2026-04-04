# self-review r8: has-behavior-declaration-adherance

## approach

reviewed the blueprint line-by-line against vision and criteria to verify what is proposed matches the spec correctly — not just that requirements are addressed, but that they are addressed correctly.

read extant source files to verify blueprint accurately represents changes and preserves correct behaviors.

## source code review

### promptHiddenInput.ts extant code (lines 14-35)

```ts
if (!process.stdin.isTTY) {
  const rl = readline.createInterface({...});
  return new Promise((resolve) => {
    let resolved = false;
    rl.once('line', (line) => {        // <-- line 23: THE BUG - only first line
      if (resolved) return;
      resolved = true;
      rl.close();
      resolve(line);                   // <-- line 27: returns raw line (no trim)
    });
    // ...close handler
  });
}
```

**observations**:
1. `rl.once('line', ...)` at line 23 is the bug — reads only first line
2. `resolve(line)` at line 27 returns raw line without trim
3. TTY branch (lines 38-95) is completely separate

### promptVisibleInput.ts extant code (lines 13-33)

```ts
if (!process.stdin.isTTY) {
  const rl = readline.createInterface({...});
  return new Promise((resolve) => {
    let resolved = false;
    rl.once('line', (line) => {        // <-- line 21: SAME BUG
      if (resolved) return;
      resolved = true;
      rl.close();
      resolve(line.trim());            // <-- line 25: returns WITH .trim()
    });
    // ...close handler
  });
}
```

**observations**:
1. `rl.once('line', ...)` at line 21 has same bug
2. `resolve(line.trim())` at line 25 applies `.trim()` — must preserve
3. TTY branch (lines 36-46) is completely separate

### blueprint proposed changes

**promptHiddenInput after**:
```ts
if (!process.stdin.isTTY) {
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  const content = chunks.join('');
  return content.endsWith('\n') ? content.slice(0, -1) : content;
}
```

**verification**:
- fixes bug: reads all content via async iterator
- preserves behavior: readline strips final newline; slice does same

**promptVisibleInput after**:
```ts
if (!process.stdin.isTTY) {
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  return chunks.join('').trim();
}
```

**verification**:
- fixes bug: reads all content via async iterator
- preserves behavior: extant uses `.trim()` at line 25; blueprint does same

## vision match verification

### vision: "stdin → keyrack should be like `cat > file`"

**blueprint proposes**:
```ts
const chunks: string[] = [];
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
const content = chunks.join('');
```

**adherance check**: yes, this is a raw passthrough pattern.
- no parse
- no escape
- no transformation
- bytes in, same bytes out

### vision: "bytes in, same bytes out"

**blueprint proposes**: chunk accumulation with join

**adherance check**: yes
- `chunks.push(chunk as string)` — stores raw
- `chunks.join('')` — concatenates without separator
- no alteration to content

### vision: promptHiddenInput final newline behavior

**blueprint proposes**:
```ts
return content.endsWith('\n') ? content.slice(0, -1) : content;
```

**adherance check**: yes, matches extant behavior
- extant code returns `line` from readline
- readline strips the final newline
- new code must do the same for compatibility

### vision: promptVisibleInput trim behavior

**blueprint proposes**:
```ts
return chunks.join('').trim();
```

**adherance check**: yes, matches extant behavior
- extant code at line 28: `promiseCallback(line.trim())`
- new code must do the same for compatibility

### vision: TTY branch untouched

**blueprint proposes**: `[RETAIN] interactive TTY keypress handler`

**adherance check**: yes
- the `if (!process.stdin.isTTY)` branch is scoped change
- TTY path has no modifications

## criteria match verification

### usecase.1: multiline json via stdin

**criteria expects**:
- keyrack reports success
- secret field contains EXACT json that was piped
- json is parseable with all original fields

**blueprint delivers**:
- async iterator reads all content (fix)
- no transformation (raw passthrough)
- acceptance test validates roundtrip

**adherance check**: yes, correctly implements

### usecase.2: single-line json via stdin

**criteria expects**:
- same as usecase.1 but with compact json

**blueprint delivers**:
- same pattern handles both (no special case)

**adherance check**: yes, correctly implements

### usecase.3: interactive prompt

**criteria expects**:
- user can type and press enter
- keyrack stores typed secret

**blueprint delivers**:
- TTY branch unchanged

**adherance check**: yes, correctly preserves

### usecase.4: empty stdin

**criteria expects**:
- stores empty string OR fail-fast with clear error

**blueprint delivers**:
- empty array → `chunks.join('')` → `''`
- stores empty string

**adherance check**: yes, correctly implements (chose store empty string path)

### usecase.5: large content

**criteria expects**:
- stores full content, no truncation

**blueprint delivers**:
- chunk-based stream with no limits
- chunks array has no size cap

**adherance check**: yes, correctly implements

### usecase.6: special characters

**criteria expects**:
- preserved byte-for-byte

**blueprint delivers**:
- `setEncoding('utf8')` for consistent decode
- no transformation on chunks
- raw passthrough

**adherance check**: yes, correctly implements

## potential deviations investigated

### deviation check 1: does `setEncoding('utf8')` alter bytes?

**investigation**: `setEncoding` converts buffer chunks to strings. the raw bytes are decoded as utf8. this is consistent with extant readline behavior which also assumes utf8.

**verdict**: not a deviation — matches extant behavior

### deviation check 2: does `as string` cast hide issues?

**investigation**: with `setEncoding('utf8')`, chunks ARE strings. the cast is for typescript type narrow, not runtime behavior.

**verdict**: not a deviation — type annotation only

### deviation check 3: does slice for final newline differ from trim?

**investigation**:
- promptHiddenInput: slice removes ONLY final `\n`
- promptVisibleInput: trim removes ALL whitespace

**verdict**: not a deviation — matches respective extant behaviors (verified in r4 backcompat review)

## findings

no deviations found. blueprint correctly implements the vision and criteria.

## summary

| check | result |
|-------|--------|
| raw passthrough pattern | correct |
| final newline behavior (hidden) | matches extant |
| trim behavior (visible) | matches extant |
| TTY branch preservation | correct |
| usecase.1-6 implementation | all correct |
| potential deviations | none found |
