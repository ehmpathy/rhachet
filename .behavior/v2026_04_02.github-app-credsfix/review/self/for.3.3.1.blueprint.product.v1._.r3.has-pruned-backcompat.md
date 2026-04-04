# self-review r3: has-pruned-backcompat

## backwards compat concerns in blueprint

### concern 1: trailing newline trim

**what the blueprint does**: `content.endsWith('\n') ? content.slice(0, -1) : content`

**why**: preserves behavior where `echo "secret" | keyrack set` stores `secret`, not `secret\n`

**explicitly requested?** no — wisher did not mention this

**evidence it's needed?**
- extant readline behavior: `rl.once('line', ...)` strips the line terminator
- if we change this, single-line secrets would gain a trailing `\n`
- this could break downstream consumers that expect no trailing newline

**should we flag?** let me check if the wisher cares...

looking at the criteria:
- usecase.2 says "single-line json via pipe" should store "EXACT json that was piped"
- but does "exact" include the trailing newline from echo?

**ambiguity found**: "exact" could mean:
1. exact bytes including `\n` from shell
2. exact content the user typed (without shell artifacts)

the extant behavior is (2). change would be a break.

**verdict**: keep trailing newline trim — preserves extant contract

### concern 2: promptVisibleInput trims whitespace

**extant code**: `promiseCallback(line.trim())`

**blueprint says**: trim trailing newline only

**inconsistency found**: extant promptVisibleInput trims ALL whitespace, not just trailing newline

**should we preserve full trim?** yes — that's the extant contract

**action needed**: update blueprint to preserve `.trim()` behavior for promptVisibleInput

## issue found and fix

**issue**: blueprint changes promptVisibleInput to only trim trailing newline, but extant code trims all whitespace via `.trim()`

**fix**: update blueprint "after" code for promptVisibleInput to use `.trim()`:

```ts
return content.endsWith('\n') ? content.slice(0, -1).trim() : content.trim();
```

or simpler:
```ts
return content.trim();
```

`.trim()` removes leading and trailing whitespace including newlines. so the trailing newline trim is redundant if we use `.trim()`.

**conclusion**: for promptVisibleInput, just use `.trim()` to match extant behavior. for promptHiddenInput, use the trailing newline trim (extant code returns `line` without trim).

## summary

| concern | requested? | action |
|---------|------------|--------|
| trailing newline trim (hidden) | no, but preserves contract | keep |
| whitespace trim (visible) | no, but extant behavior | update blueprint to use .trim() |

**one fix needed**: promptVisibleInput should use `.trim()` not just trailing newline slice.
