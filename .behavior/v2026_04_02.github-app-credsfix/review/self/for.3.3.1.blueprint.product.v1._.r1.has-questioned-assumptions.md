# self-review r1: has-questioned-assumptions

## assumption 1: async iterator will read all stdin

**what we assume**: `for await (const chunk of process.stdin)` reads all content until EOF

**what if opposite were true?** we'd miss content, same as before

**evidence**: node.js docs confirm readable streams are async iterable and iterate until stream ends

**verdict**: holds — this is documented node.js behavior

## assumption 2: function can be made async

**what we assume**: we can change the non-TTY branch to use `await` inside the function

**evidence needed**: check if function is already async or returns Promise

**verification**: read promptHiddenInput.ts line 10:
```ts
export const promptHiddenInput = async (input: {...}): Promise<string> =>
```

both functions are already `async`, so `for await` works without signature change.

**verdict**: holds — verified via code inspection

## assumption 3: final newline trim is correct behavior

**what we assume**: content.slice(0, -1) when content ends with `\n` is correct

**what if opposite?** multiline content could intentionally end with newline

**evidence**: extant code returns `line` from readline, which excludes final newline. this preserves that contract.

**alternative**: could trim only final `\n` if single-line, but this adds complexity

**verdict**: holds — preserves extant contract; multiline json rarely ends with significant final newline

## assumption 4: chunks are strings after setEncoding

**what we assume**: after `process.stdin.setEncoding('utf8')`, chunks are strings

**what if opposite?** Buffer chunks would require .toString()

**evidence**: node.js docs confirm setEncoding causes data to be emitted as strings

**verdict**: holds — documented behavior

## assumption 5: no need for timeout

**what we assume**: stdin will eventually close (EOF or process termination)

**what if opposite?** could hang forever on incomplete pipe

**evidence**: extant code has no timeout; this is acceptable for CLI tools

**verdict**: holds — matches extant behavior; timeout is out of scope

## summary

all 5 assumptions verified. no hidden technical assumptions found that would invalidate the blueprint.
