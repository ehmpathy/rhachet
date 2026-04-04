# self-review r10: has-role-standards-coverage

## approach

reviewed blueprint for absent patterns that should be present. focus on what might be MISSING, not what's wrong with what exists.

## rule directories checked

| directory | relevance | verdict |
|-----------|-----------|---------|
| code.prod/pitofsuccess.errors | error handle, fail-fast | checked |
| code.prod/pitofsuccess.typedefs | type safety | checked |
| code.prod/pitofsuccess.procedures | idempotency | checked |
| code.prod/evolvable.procedures | hooks, wrappers | checked |
| code.prod/readable.narrative | early returns | already checked in r9 |
| code.test | test coverage | checked |
| code.prod/evolvable.domain.objects | not relevant (infra code) | skip |
| code.prod/evolvable.repo.structure | not relevant (no new files) | skip |
| code.prod/readable.persistence | not relevant (no persistence) | skip |

## coverage analysis

### check 1: error handle (rule.require.fail-fast)

**question**: should the fix include error handle for stdin read failures?

**analysis**: the async iterator pattern:
```ts
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
```

**what happens on error**: if stdin read fails, the async iterator throws. the promise rejects. the caller receives the error.

**is explicit error handle needed?** no — fail-fast is the correct behavior. if stdin read fails, we WANT the error to propagate. we should NOT catch and swallow.

**extant code behavior**: the readline pattern also lets errors propagate (no try/catch around readline).

**why it holds**:

the rule says "errors should propagate, not be caught and swallowed." the fix adheres:
1. no try/catch around the async iterator
2. if `process.stdin` emits error, the for-await throws
3. the promise returned by promptHiddenInput rejects
4. caller sees the error with full stack trace

this is correct — if stdin breaks mid-read, the caller must know. swallowing would cause silent data loss.

### check 2: type safety (rule.require.shapefit)

**question**: are types correct and complete?

**analysis**:
- `chunks: string[]` — correctly typed array
- `chunk as string` — cast at boundary (see r9 investigation)
- `content: string` — inferred from join
- return type: `Promise<string>` — already declared

**is explicit type annotation needed?** no — inference handles local variables correctly. the function return type is already declared.

**why it holds**:

the rule says "types must fit; mismatches signal defects." let me verify each type:

1. `chunks: string[]` — explicit, correct. we accumulate strings.
2. `chunk` — inferred from async iterator. TypeScript sees `Buffer | string`. after `setEncoding('utf8')`, chunks ARE strings at runtime.
3. `as string` — cast needed because TypeScript's type for stdin iteration doesn't narrow based on setEncoding. this is a documented stdlib boundary.
4. `content` — inferred from `chunks.join('')` which returns `string`. correct.
5. return — function returns `Promise<string>`, already declared, unchanged.

no `any` usage. no type errors. the one cast is at stdlib boundary with clear reason.

### check 3: hooks/wrappers (rule.require.hook-wrapper-pattern)

**question**: should the fix use withLogTrail or other hooks?

**analysis**: this is infrastructure code (src/infra/), not domain operations. the function:
- does not perform business logic
- does not need trace log
- is a low-level stdin utility

**extant code**: no hooks present. this is appropriate for infra utilities.

**why it holds**: hooks are for domain operations that benefit from observability. stdin prompt utilities are too low-level — every keyrack command would emit "entered promptHiddenInput" which is noise, not signal.

### check 4: test coverage

**question**: are sufficient tests proposed?

**blueprint proposes**:
- unit tests for promptHiddenInput: single-line, multi-line, empty
- unit tests for promptVisibleInput: single-line, multi-line, empty
- acceptance test for keyrack stdin roundtrip

**r7 found**: large content and special characters tests would be good additions

**are base tests sufficient?** yes — the core usecases (multi-line fix, single-line regression, empty edge) are covered. additional tests for large content and special chars are additive improvements.

**why it holds**: test matrix covers the behavior declaration criteria. additional edge case tests can be added at execution time.

### check 5: validation

**question**: should input be validated before process?

**analysis**: the input is `{ prompt: string }`. the fix modifies stdin read, not prompt usage. no new validation needed.

**why it holds**: the function contract remains unchanged. the prompt is displayed via `process.stdout.write(input.prompt)` in the TTY branch (unchanged). validation of prompt content is not the function's responsibility.

### check 6: idempotency (rule.require.idempotent-procedures)

**question**: does the fix need idempotency considerations?

**analysis**: `promptHiddenInput` and `promptVisibleInput` are:
- reader functions (read stdin, return content)
- NOT mutators (do not modify state)
- NOT operations (do not have side effects on external systems)

**idempotency rule applicability**: the rule applies to MUTATION operations — procedures that modify state and could be called twice. stdin read is inherently NOT idempotent (you can only read stdin once per execution), but that's expected behavior, not a violation.

**why it holds**: idempotency rules apply to upsert/findsert/delete operations. a stdin reader has no state to upsert. the function reads input once and returns it — this is correct behavior for an input prompt utility.

### check 7: documentation updates

**question**: should jsdoc .notes be updated to mention multiline stdin support?

**analysis**: the extant .notes describe TTY behavior. the piped stdin behavior is implicit (if not TTY, read from stdin).

**is update needed?** optional — could add `.note = supports multi-line stdin when piped` but this may be obvious from context.

**why it holds**: the fix is a bug correction, not a feature addition. "now works correctly" does not require documentation. the function already claimed to read stdin — now it does so fully.

## absent pattern check

| pattern | should be present? | status |
|---------|-------------------|--------|
| error handle | no (fail-fast correct) | ok |
| type annotations | no (inference sufficient) | ok |
| hooks/wrappers | no (infra code) | ok |
| idempotency | not applicable (reader, not mutator) | ok |
| validation | no (unchanged contract) | ok |
| doc updates | optional (bug fix, not feature) | ok |
| base tests | yes | present |
| edge case tests | nice to have | noted for execution |

## findings

no absent patterns found that MUST be present. the blueprint:
- maintains fail-fast semantics (no swallowed errors)
- uses correct types (no `any`, proper inference)
- does not add unnecessary hooks to infra code
- includes sufficient base test coverage

edge case tests (large content, special chars) are additive and noted for execution.

## summary

no gaps in role standards coverage.
