# review: has-pruned-backcompat

## verdict: pass

## analysis

reviewed the fix for backwards compatibility concerns. found two whitespace treatment patterns — both are correct contract preservation, not backwards compat hacks.

### patterns verified

**promptHiddenInput.ts — final newline trim**
```ts
return content.endsWith('\n') ? content.slice(0, -1) : content;
```

is this backwards compat? **no.**

the original readline code:
```ts
rl.once('line', (line) => { promiseCallback(line); });
```
readline's `.once('line')` returns the line without the terminator.

the fix preserves the same contract: stdin content, minus final newline.

this is correct behavior for piped input:
- `echo "secret" | cmd` sends `secret\n`
- user expects to store `secret`, not `secret\n`

**promptVisibleInput.ts — .trim()**
```ts
return chunks.join('').trim();
```

is this backwards compat? **no.**

the original code:
```ts
rl.once('line', (line) => { promiseCallback(line.trim()); });
```

the fix preserves the same contract: stdin content, trimmed.

### no backwards compat hacks found

| pattern | purpose | is it backcompat? |
|---------|---------|-------------------|
| final newline slice | match user expectation for piped secrets | no, correct behavior |
| .trim() on visible | match extant contract | no, correct behavior |

### why no backcompat needed

this fix changes only the stdin read mechanism:
- before: readline reads first line only
- after: async iterator reads all lines

the whitespace treatment is unchanged. callers see the same output shape.

no deprecated code paths. no version checks. no shims.

### zero-backcompat principle check

per feedback_zero_backcompat.md:
- no migration maps: none added
- no transforms old → new: none added
- no legacy aliases: none added
- no "for backwards compat" comments: none added

the `.slice()` and `.trim()` are not backcompat — they are the correct contract behavior. to remove them would change the output shape, which is not the goal of this fix.

### distinction: contract vs backcompat

| type | example | what we did |
|------|---------|-------------|
| contract preservation | stdin without final newline | kept (correct) |
| backwards compat shim | support old json format | none added |

the fix is clean. it reads all stdin and preserves the output contract.
