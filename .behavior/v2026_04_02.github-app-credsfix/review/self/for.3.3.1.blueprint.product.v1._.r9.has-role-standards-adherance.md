# self-review r9: has-role-standards-adherance

## rule directories checked

relevant rule categories for this blueprint:

| directory | relevance |
|-----------|-----------|
| code.prod/evolvable.procedures | arrow functions, input-context pattern |
| code.prod/readable.narrative | early returns, no else branches |
| code.prod/readable.comments | what-why headers |
| code.test/frames.behavior | given/when/then pattern |

## blueprint code analysis

### check 1: arrow functions (rule.require.arrow-only)

**extant code already uses arrow functions**:
```ts
export const promptHiddenInput = async (input: {...}): Promise<string> => {...}
export const promptVisibleInput = async (input: {...}): Promise<string> => {...}
```

**blueprint preserves this**: yes, no function keyword introduced

**why it holds**: the blueprint modifies internal logic (the piped stdin branch), not the function declaration. the fix code uses:
- `for await (const chunk of process.stdin)` — not a function declaration
- `chunks.push(...)` — method call
- `chunks.join('')` — method call
- no new functions declared, no `function` keyword anywhere

**verdict**: compliant

### check 2: input-context pattern (rule.require.input-context-pattern)

**extant signature**:
```ts
promptHiddenInput(input: { prompt: string }): Promise<string>
promptVisibleInput(input: { prompt: string }): Promise<string>
```

**blueprint changes**: internal logic only, signature unchanged

**why it holds**: the fix is scoped to HOW stdin is read, not WHAT the function accepts. the signature `(input: { prompt: string })` remains intact because:
1. the function still needs only a prompt string
2. no new dependencies need injection via context
3. the async iterator uses process.stdin directly (node global, not injected)

if context were needed (e.g., a custom stdin stream for testing), that would require signature change. but process.stdin is a process global — injection not needed.

**verdict**: compliant — signature already follows (input, context?) pattern

### check 3: what-why headers (rule.require.what-why-headers)

**extant headers**:
```ts
/**
 * .what = prompts user for input with hidden echo (for passwords)
 * .why = enables secure passphrase entry without exposure to shell history
 * .note = uses raw mode to read character by character without echo
 * .note = handles backspace, enter, ctrl+c, ctrl+d
 */
```

**blueprint changes**: internal logic only, headers unchanged

**why it holds**: the .what and .why describe the function's PURPOSE, not its implementation details. the fix changes HOW stdin is read but not:
- WHAT the function does (prompts for hidden input)
- WHY the function exists (secure passphrase entry)

the .note lines describe TTY handling which remains unchanged. no header updates needed for a stdin-reading implementation fix.

**verdict**: compliant — headers already present

### check 4: no else branches (rule.forbid.else-branches)

**blueprint proposed code**:
```ts
if (!process.stdin.isTTY) {
  // read all stdin
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  const content = chunks.join('');
  return content.endsWith('\n') ? content.slice(0, -1) : content;
}
// TTY branch follows (early return above)
```

**analysis**: uses early return pattern, no else branch

**why it holds**: the function structure is:
```ts
if (!process.stdin.isTTY) {
  // piped stdin path
  return ...;  // early return
}
// TTY path (implicit else via early return)
```

the fix maintains this structure. the piped path ends with `return content...` which is an early return. the TTY path that follows is not wrapped in an else block — it's reached only when the if condition fails.

this is the preferred pattern: guard clause (if piped, handle and return) followed by main path (TTY handling).

**verdict**: compliant

### check 5: test patterns (rule.require.given-when-then)

**blueprint proposes unit tests with structure**:
- given/when/then from test-fns
- labels like `[case1]`, `[t0]`

**blueprint proposes acceptance test added to extant file** (per r6 convention result)

**why it holds**: the test structure follows BDD:
```ts
given('[case1] scenario', () => {
  when('[t0] action', () => {
    then('outcome', () => {...});
  });
});
```

this matches rule.require.given-when-then exactly. the `[caseN]` and `[tN]` labels enable easy test identification. adding to extant file (keyrack.set.acceptance.test.ts) groups related tests together.

**verdict**: compliant — uses BDD patterns

### check 6: ternary vs if for final newline

**blueprint uses ternary**:
```ts
return content.endsWith('\n') ? content.slice(0, -1) : content;
```

**analysis**: this is a transform, not a branch. ternary is appropriate for single-expression returns.

**why it holds**: the rule forbids `if/else` BRANCHES because they create hidden implicit flows. but a ternary for a VALUE transform is different:
- no code paths with side effects
- single expression that evaluates to a value
- the "branch" is which value to return, not which code to execute

this ternary says "return content without final newline if present, else return as-is" — a pure value computation. this is acceptable use of conditional expression.

**verdict**: compliant — ternary for transform is acceptable

### check 7: async function pattern

**blueprint proposes**:
```ts
if (!process.stdin.isTTY) {
  // async iterator usage
  for await (const chunk of process.stdin) {...}
}
```

**extant function already async**: `async (input: {...}): Promise<string>`

**analysis**: async iterator requires async function. extant is already async.

**verdict**: compliant — no signature change needed

## potential violations investigated

### investigation 1: `as string` cast

**blueprint uses**: `chunks.push(chunk as string)`

**rule.forbid.as-cast says**: allowed only at external org code boundaries with documentation

**analysis**: this is a node process.stdin boundary. with `setEncoding('utf8')`, chunks are strings but TypeScript types them as `Buffer | string`. the cast is for type narrow at a stdlib boundary.

**verdict**: acceptable — boundary cast with clear reason

### investigation 2: variable names

**blueprint uses**: `chunks`, `chunk`, `content`

**rule.require.ubiqlang analysis**:
- `chunks` — standard node stream term
- `chunk` — loop variable for stream iteration
- `content` — descriptive of what's accumulated

**verdict**: compliant — uses appropriate terms

## summary

| rule | status |
|------|--------|
| arrow functions | compliant |
| input-context pattern | compliant |
| what-why headers | compliant |
| no else branches | compliant |
| test patterns | compliant |
| ternary usage | compliant |
| async function | compliant |
| as cast | acceptable (boundary) |
| variable names | compliant |

no violations found. blueprint adheres to mechanic role standards.
