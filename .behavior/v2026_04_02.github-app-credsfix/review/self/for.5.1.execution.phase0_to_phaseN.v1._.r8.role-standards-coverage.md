# review: role-standards-coverage

## verdict: pass

## rule directories checked

| directory | relevance |
|-----------|-----------|
| code.prod/pitofsuccess.errors | error handle patterns |
| code.prod/pitofsuccess.procedures | idempotency, validation |
| code.prod/evolvable.procedures | dependency injection, input-context |
| code.prod/readable.comments | what-why headers |
| code.test/frames.behavior | bdd structure |
| code.test/lessons.howto | test patterns |
| lang.terms | name conventions |

## coverage check: what should be present?

### error handle (pitofsuccess.errors)

**question**: is error handle needed for these functions?

**analysis**:
- `promptHiddenInput` reads stdin via async iterator
- if stdin read fails, node.js throws naturally
- caller handles errors (keyrack set wraps in try/catch)
- no silent swallow of errors

**decision**: no explicit error wrap needed. errors propagate naturally via async/await.

**why this holds**: rule.require.fail-fast says "throw on invalid state". the functions do throw — via natural node.js error propagation. use of explicit `try/catch` would violate rule.forbid.failhide since there's no additional context to add.

### input validation (pitofsuccess.procedures)

**question**: should input be validated at runtime?

**analysis**:
- input is `{ prompt: string }` — simple typed object
- typescript enforces at compile time
- no complex invariants to validate
- not a boundary layer (infra, not contract)

**decision**: no runtime validation needed.

**why this holds**: rule.require.fail-fast validates at boundaries. these are internal infra functions called by keyrack commands. the boundary validation happens in the CLI layer, not here.

### idempotency (pitofsuccess.procedures)

**question**: should these functions be idempotent?

**analysis**:
- read-only operations (stdin consumed once)
- no state mutation
- no external writes
- idempotency not applicable to read operations

**decision**: idempotency requirement does not apply.

**why this holds**: rule.require.idempotent-procedures applies to mutations (set, gen, del). these are infra utilities that read stdin, not domain operations that mutate state.

### dependency injection (evolvable.procedures)

**question**: should external dependencies be injected via context?

**analysis**:
- functions use `process.stdin` directly
- stdin is process-level global (not injectable)
- node.js readline is imported (module dependency)
- no database, network, or service dependencies

**decision**: no context injection needed.

**why this holds**: rule.require.dependency-injection targets mockable dependencies like databases and services. `process.stdin` is a process-level resource that cannot be meaningfully injected. the test pattern uses spawn-based isolation instead.

### test coverage (code.test)

**question**: are all required test types present?

| test type | status | evidence |
|-----------|--------|----------|
| unit tests | n/a | stdin test requires spawn isolation |
| integration tests | present | promptHiddenInput.integration.test.ts |
| acceptance tests | present | keyrack.set.acceptance.test.ts [case5] |

**decision**: test coverage is complete.

**why this holds**:
- unit tests are not feasible for stdin behavior (`process.stdin` is global)
- integration tests exercise the function via spawn
- acceptance tests verify end-to-end roundtrip via CLI

### type coverage (pitofsuccess.typedefs)

**question**: are all types explicit?

| file | input type | return type | status |
|------|------------|-------------|--------|
| promptHiddenInput.ts | `{ prompt: string }` | `Promise<string>` | explicit |
| promptVisibleInput.ts | `{ prompt: string }` | `Promise<string>` | explicit |
| invokeWithStdin | `string` | `{ stdout, stderr, status }` | explicit |

**decision**: types are complete.

**why this holds**: rule.require.shapefit requires explicit types. all functions have typed parameters and return types. no `any` usage.

### comment coverage (readable.comments)

**question**: are .what/.why headers present?

| file | .what | .why | status |
|------|-------|------|--------|
| promptHiddenInput.ts | "prompts user for input with hidden echo" | "enables secure passphrase entry without exposure" | present |
| promptVisibleInput.ts | "prompts user for input with visible echo" | "enables interactive input for non-secret values" | present |
| __test_promptHiddenInput.ts | "test runner for promptHiddenInput" | "enables integration tests to invoke with piped stdin" | present |
| integration tests | "integration tests for promptHiddenInput stdin behavior" | "tests the fix for multiline stdin truncation" | present |

**decision**: comment coverage is complete.

---

## patterns that should be present

### pattern: async/await for stream reads

**required by**: modern node.js async patterns

**present**: yes — `for await (const chunk of process.stdin)`

### pattern: encode before read

**required by**: stdin yields Buffer without encoded form

**present**: yes — `process.stdin.setEncoding('utf8')` before iteration

### pattern: spawn isolation for stdin tests

**required by**: `process.stdin` is global, cannot isolate in jest

**present**: yes — `__test_*.ts` runners + `spawnSync` in tests

### pattern: final newline handle

**required by**: piped stdin often includes final newline from shell

**present**: yes — `content.endsWith('\n') ? content.slice(0, -1) : content`

---

## gaps checked and found none

| potential gap | checked | result |
|---------------|---------|--------|
| absent error handle | yes | not needed — errors propagate naturally |
| absent input validation | yes | not needed — compile-time types suffice |
| absent idempotency | yes | not applicable — read operation |
| absent context injection | yes | not needed — no mockable dependencies |
| absent tests | yes | integration + acceptance present |
| absent types | yes | all explicit |
| absent comments | yes | all headers present |
| absent newline handle | yes | explicitly handled |
| absent encode | yes | setEncoding called |

---

## deep dive: file-by-file coverage analysis

### promptHiddenInput.ts — what patterns are applied?

**lines 1-7: jsdoc header**
```ts
/**
 * .what = prompts user for input with hidden echo (for passwords)
 * .why = enables secure passphrase entry without exposure to shell history or process lists
 *
 * .note = uses raw mode to read character by character without echo
 * .note = handles backspace, enter, ctrl+c, ctrl+d
 */
```
- .what header: present
- .why header: present
- .note for edge cases: present (backspace, ctrl+c, ctrl+d)

**lines 8-10: function signature**
```ts
export const promptHiddenInput = async (input: {
  prompt: string;
}): Promise<string> => {
```
- explicit input type: `{ prompt: string }`
- explicit return type: `Promise<string>`
- arrow function: yes
- input-context pattern: yes (input object)

**lines 12-22: stdin branch**
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
- set encode before iteration: present
- async iterator: present
- final newline handle: present
- const only (no let): present

**why no error wrap is correct here:**
the async iterator throws naturally if stdin read fails. the caller (`keyrack set`) catches exceptions at the CLI boundary. use of `try/catch` here would add no context — it would just re-throw. rule.forbid.failhide says "never catch and swallow". we don't swallow; we don't even catch.

### promptVisibleInput.ts — what patterns are applied?

identical patterns to promptHiddenInput:
- .what/.why headers: present (lines 3-8)
- explicit types: present
- set encode before iteration: present (line 16)
- async iterator: present (line 17)
- final newline handle: via `.trim()` (line 21)

### __test_promptHiddenInput.ts — what patterns are applied?

**lines 3-6: jsdoc header**
```ts
/**
 * .what = test runner for promptHiddenInput
 * .why = enables integration tests to invoke with piped stdin
 */
```
- .what/.why headers: present

**lines 9-12: main function**
```ts
const main = async (): Promise<void> => {
  const result = await promptHiddenInput({ prompt: '' });
  process.stdout.write(result);
};
```
- arrow function: yes
- explicit return type: yes
- no error swallow: errors propagate to catch block

**lines 14-17: error handle**
```ts
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```
- fail-fast: yes (exits 1 on error)
- error visible: yes (logged to stderr)

### promptHiddenInput.integration.test.ts — what patterns are applied?

**lines 6-11: jsdoc header**
```ts
/**
 * .what = integration tests for promptHiddenInput stdin behavior
 * .why = tests the fix for multiline stdin truncation
 *
 * .note = uses spawn to test actual stdin via pipe since process.stdin is global
 */
```
- .what/.why headers: present
- .note for rationale: present (explains spawn pattern)

**lines 33-103: test structure**
- given/when/then: present
- [caseN] labels: present
- [tN] labels: present
- useThen: present (no redundant spawn calls)

**why spawn isolation is correct:**
`process.stdin` is a singleton. multiple jest tests would share stdin, contaminate each other. spawn creates isolated child processes with their own stdin. this is the only correct pattern for stdin behavior tests.

### keyrack.set.acceptance.test.ts — what patterns are applied?

**lines 290-390: [case5] block**
- given/when/then: present
- [caseN] label: `[case5]`
- [tN] labels: `[t0]`, `[t1]`
- useBeforeAll: present (no redundant CLI invocations)
- roundtrip verification: present (set → unlock → get → verify exact match)

**why acceptance test is correct:**
criteria.blackbox specifies: "secret field contains the EXACT json that was piped". the test asserts:
```ts
expect(parsed.grant.key.secret).toEqual(multilineJson);
```
this verifies byte-for-byte fidelity, which is the fix objective.

---

## coverage summary by standard

| standard | required for | present in | status |
|----------|--------------|------------|--------|
| .what/.why headers | all files | all 6 files | covered |
| explicit types | all functions | all functions | covered |
| arrow functions | all functions | all functions | covered |
| input-context pattern | domain functions | promptHiddenInput, promptVisibleInput | covered |
| fail-fast | all code | natural propagation + exit(1) | covered |
| given/when/then | all tests | all test files | covered |
| useThen/useBeforeAll | tests with expensive ops | all test files | covered |
| set encode | stdin reads | both prompt functions | covered |
| async iterator | stdin reads | both prompt functions | covered |
| final newline handle | stdin reads | both prompt functions | covered |
| spawn isolation | stdin tests | integration tests | covered |

---

## no gaps found

all relevant mechanic standards are applied:
- error handle: natural propagation (appropriate)
- validation: compile-time types (appropriate for internal infra)
- test: integration + acceptance (appropriate for stdin behavior)
- types: explicit (present)
- comments: .what/.why headers (present)
- stream handle: encode + async iterator (present)
- newline handle: explicit trim of final newline (present)

the review verified no patterns were forgotten. each file was traced line-by-line to confirm all required patterns are present.
