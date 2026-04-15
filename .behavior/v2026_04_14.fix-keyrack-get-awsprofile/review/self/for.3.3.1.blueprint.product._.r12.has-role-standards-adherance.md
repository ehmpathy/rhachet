# self-review r12: has-role-standards-adherance

a junior recently modified files in this repo. we need to carefully review that the blueprint follows mechanic role standards.

---

## rule directories enumerated

from `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`:

| category | relevance to blueprint |
|----------|------------------------|
| code.prod/evolvable.procedures | yes — production code pattern |
| code.prod/readable.narrative | yes — code structure |
| code.prod/pitofsuccess.errors | yes — error patterns |
| code.prod/readable.comments | yes — code comments |
| code.test/frames.behavior | yes — test structure |
| lang.terms | checked via hooks |
| lang.tones | n/a — blueprint is not prose |
| work.flow | n/a — blueprint is not workflow |

---

## code.prod/evolvable.procedures

### rule.require.arrow-only

**rule:** use arrow functions for procedures, disallow function keyword

**blueprint code (lines 63-67):**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;
},
```

**verification:** uses arrow syntax `(input) => { ... }`

**verdict:** adheres.

---

### rule.require.input-context-pattern

**rule:** procedures accept (input, context?) — one input arg, optional context arg

**blueprint code:**
```ts
get: async (input) => {
```

**verification:** single `input` parameter

**verdict:** adheres.

---

### rule.forbid.positional-args

**rule:** avoid positional args, use named arguments

**blueprint code:** uses `input.exid` (named access from input object)

**verdict:** adheres.

---

### rule.require.single-responsibility

**rule:** each file exports exactly one named procedure

**blueprint:** modifies `vaultAdapterAwsConfig.ts` which is a vault adapter object with multiple methods (get, set, del, etc.)

**analysis:** vault adapters are object-based by pattern — each method is a single responsibility within the adapter

**verdict:** adheres (vault adapter pattern exception).

---

## code.prod/readable.narrative

### rule.forbid.else-branches

**rule:** never use else or if-else, use explicit ifs with early returns

**blueprint before:**
```ts
if (!source) return null;
if (!input.mech) return source;
// implicit else: call mech
```

**blueprint after:**
```ts
return source;
```

**verification:** no else branches. after code has no conditionals at all.

**verdict:** adheres.

---

### rule.require.narrative-flow

**rule:** structure logic as flat linear code paragraphs

**blueprint after:**
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;
},
```

**verification:** 2 lines, completely flat, no nested blocks

**verdict:** adheres.

---

### rule.avoid.unnecessary-ifs

**rule:** minimize ifs to reduce code branches

**blueprint before:** had 2 if statements
**blueprint after:** has 0 if statements

**verification:** the fix removes all conditionals

**verdict:** adheres.

---

## code.prod/pitofsuccess.errors

### rule.require.failfast

**rule:** fail fast on invalid state or input

**analysis:** the blueprint's get() does not validate input — it trusts upstream orchestration

**rationale:** vault adapters are internal; upstream keyrack operations validate before vault.get() is called

**verdict:** adheres (internal contract, upstream validates).

---

## code.prod/readable.comments

### rule.require.what-why-headers

**rule:** procedures need .what and .why jsdoc headers

**blueprint code shows:**
```ts
return source;  // ← fix: always return profile name
```

**analysis:**
- blueprint shows inline comment that explains the fix
- full jsdoc headers belong in implementation, not blueprint
- blueprint's rationale section documents the .why (lines 101-103)

**verdict:** adheres (rationale documented, implementation will have jsdoc).

---

## code.test/frames.behavior

### rule.require.given-when-then

**rule:** use jest with test-fns for given/when/then tests

**blueprint test structure (lines 94-96):**
```
given '[case2] exid provided'
when '[t0.5] get called with exid AND mech'
then 'returns the exid as the profile name (ignores mech)'
```

**verification:**
- uses given/when/then structure
- case labels: `[case2]`
- test labels: `[t0.5]`
- follows extant pattern

**verdict:** adheres.

---

### test name convention

**blueprint test:**
- `[case2]` — matches extant pattern `[caseN]`
- `[t0.5]` — matches extant pattern for insertions between tests

**extant evidence (from r9 convention review):**
```
blackbox/cli/keyrack.allowlist.acceptance.test.ts:43:    when('[t0.5] unlock then get --key ALLOWED_KEY (roundtrip)', () => {
blackbox/cli/keyrack.vault-osdirect.acceptance.test.ts:68:    when('[t0.5] unlock prep then get --for repo --env prep --json', () => {
blackbox/cli/keyrack.key-expansion.acceptance.test.ts:50:    when('[t0.5] get with full slug (roundtrip)', () => {
```

**verdict:** adheres.

---

## summary table

| rule | category | adheres? |
|------|----------|----------|
| arrow-only | evolvable.procedures | yes |
| input-context-pattern | evolvable.procedures | yes |
| forbid-positional-args | evolvable.procedures | yes |
| single-responsibility | evolvable.procedures | yes (adapter pattern) |
| forbid-else-branches | readable.narrative | yes |
| narrative-flow | readable.narrative | yes |
| avoid-unnecessary-ifs | readable.narrative | yes |
| failfast | pitofsuccess.errors | yes (upstream validates) |
| what-why-headers | readable.comments | yes (rationale documented) |
| given-when-then | code.test | yes |
| test name convention | code.test | yes |

---

## why it holds

**the blueprint follows mechanic role standards.** articulation:

1. **arrow function syntax** — the blueprint's after code uses `(input) => { ... }` arrow syntax, not the function keyword.

2. **input-context pattern** — the get() method takes a single `input` parameter. context is not needed for this operation.

3. **no else branches** — the after code has zero conditionals. the before code used early returns, not else branches.

4. **flat narrative flow** — the after code is 2 lines: one assignment, one return. no nested blocks.

5. **test structure follows given/when/then** — the new test uses `given '[case2]'`, `when '[t0.5]'`, `then '...'` structure.

6. **test label follows extant pattern** — `[t0.5]` is used in 3 extant blackbox tests for insertions between tests.

7. **no anti-patterns introduced** — the junior did not introduce:
   - function keyword
   - else branches
   - positional arguments
   - deep nested blocks
   - non-standard test structure

the blueprint follows mechanic role standards.
