# review: behavior-declaration-adherence

## verdict: pass

## analysis

reviewed each changed file against vision, criteria, and blueprint. no deviations found.

### files changed

1. src/infra/promptHiddenInput.ts (lines 12-22)
2. src/infra/promptVisibleInput.ts (lines 12-22)
3. src/infra/__test_promptHiddenInput.ts (new)
4. src/infra/__test_promptVisibleInput.ts (new)
5. src/infra/promptHiddenInput.integration.test.ts (new)
6. src/infra/promptVisibleInput.integration.test.ts (new)
7. blackbox/cli/keyrack.set.acceptance.test.ts (added [case5])

### promptHiddenInput.ts adherence

**vision states:** "stdin content, minus final newline"

**implementation:**
```ts
const content = chunks.join('');
return content.endsWith('\n') ? content.slice(0, -1) : content;
```

adherence: correct. removes only final newline, preserves embedded newlines.

**blueprint states:** use async iterator, trim final newline

**implementation:** matches blueprint line-by-line (verified in coverage review)

adherence: correct.

### promptVisibleInput.ts adherence

**vision states:** preserves extant .trim() behavior

**implementation:**
```ts
return chunks.join('').trim();
```

**original code:**
```ts
rl.once('line', (line) => { promiseCallback(line.trim()); });
```

adherence: correct. both use .trim() for visible input.

### test files adherence

**criteria requires:**
- multiline json via stdin test
- single-line regression test
- empty stdin test

**implementation:**
- [t1] multi-line content — matches criteria
- [t0] single-line content — matches criteria
- [t2] empty stdin — matches criteria
- [t3] final newline — extra test, not required but valid

adherence: correct. all required tests present.

### acceptance test adherence

**criteria requires:** keyrack set/get roundtrip for multiline json

**implementation:**
```ts
given('[case5] multiline json via stdin', () => {
  // sets with multiline json
  // unlocks
  // gets and verifies exact match
});
```

adherence: correct. tests full roundtrip.

### deviation check

| potential deviation | actual | verdict |
|---------------------|--------|---------|
| wrong newline treatment | final newline only | matches vision |
| wrong trim behavior | .trim() for visible | matches original |
| absent tests | all criteria usecases covered | matches criteria |
| wrong test pattern | BDD given/when/then | matches extant |

### why each file adheres to spec

**promptHiddenInput.ts — why it holds**

question: does the async iterator pattern correctly read all stdin?
answer: yes. node.js readable streams implement the async iterator protocol. `for await (const chunk of process.stdin)` reads all chunks until EOF. this is documented node.js behavior.

question: does the final newline trim preserve embedded newlines?
answer: yes. `content.endsWith('\n') ? content.slice(0, -1) : content` only removes the last character if it's a newline. embedded newlines (e.g., `\n` in JSON) remain intact.

question: does the TTY branch remain unchanged?
answer: yes. re-read lines 24-81 — the raw mode keypress handler is identical to before. only lines 12-22 changed.

**promptVisibleInput.ts — why it holds**

question: does .trim() match the original behavior?
answer: yes. the original code used `promiseCallback(line.trim())`. the fix uses `return chunks.join('').trim()`. both trim whitespace.

question: is the readline import still used?
answer: yes. the import is used for the TTY branch (lines 25-34). only the piped stdin branch (lines 13-22) avoids readline.

**test files — why they hold**

question: do the tests verify the fix?
answer: yes.
- [t1] pipes multiline JSON via spawnSync, verifies full content returned
- [t0] pipes single-line content, verifies no regression
- [t2] pipes empty string, verifies empty return
- [t3] pipes content with final newline, verifies trim

question: why use spawnSync instead of direct invocation?
answer: process.stdin is global. direct invocation in jest would share stdin across tests. spawnSync creates isolated child processes with their own stdin.

**acceptance test — why it holds**

question: does [case5] test the actual user flow?
answer: yes. it:
1. creates a test repo with keyrack manifest
2. pipes multiline JSON to `keyrack set`
3. runs `keyrack unlock`
4. runs `keyrack get` and verifies exact match

this matches the bug report in the wish: user pipes JSON → keyrack stores → keyrack retrieves → content matches.

### no deviations found

the implementation:
- follows the blueprint line-by-line
- satisfies all criteria usecases
- preserves extant contracts (final newline for hidden, trim for visible)
- adds test coverage as specified

