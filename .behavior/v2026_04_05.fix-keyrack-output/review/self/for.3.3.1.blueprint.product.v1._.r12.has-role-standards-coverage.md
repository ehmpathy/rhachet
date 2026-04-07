# self-review r12: has-role-standards-coverage

## review for coverage of mechanic role standards

### relevant brief categories for this blueprint

| category | what to check for coverage |
|----------|---------------------------|
| `code.prod/evolvable.procedures/` | input types, dependency injection, clear contracts |
| `code.prod/pitofsuccess.errors/` | error messages, exit codes, hints |
| `code.prod/readable.comments/` | .what/.why headers on functions |
| `code.test/` | unit tests, acceptance tests, test coverage by grain |

---

## coverage check: did blueprint forget any required patterns?

### check.1 = error messages with hints

**the rule:** errors should include hints for resolution (rule.require.failloud).

**evidence from blueprint:**

| error scenario | hint specified? |
|----------------|-----------------|
| --value requires --key | no hint shown |
| --env required | no hint shown |
| --owner required | no hint shown |
| strict mode failure | yes: "use --lenient if partial results are acceptable" |

**gap found:** most validation errors don't show hints.

**the alternative: what if no hints were provided?**

without hints:
- user sees "error: --env required"
- user must guess or read --help
- friction increases

with hints:
- user sees "error: --env required. hint: rhx keyrack source --env test --owner ehmpath"
- user can copy-paste and try again
- friction decreases

**fix needed:** implementation should add hints to validation errors. example:
```
error: --env required
hint: rhx keyrack source --env test --owner ehmpath
```

---

### check.2 = .what/.why headers on new functions

**the rule:** every procedure needs .what and .why jsdoc (rule.require.what-why-headers).

**evidence from blueprint:**

| function | .what/.why specified? |
|----------|----------------------|
| `asShellEscapedSecret` | no headers shown |
| keyrack source command | no headers shown |

**gap found:** blueprint doesn't show jsdoc headers.

**the alternative: what if headers were omitted?**

without headers:
- reader must infer purpose from code
- robots spend tokens on comprehension
- maintenance burden increases

**fix needed:** implementation must include headers. example:
```ts
/**
 * .what = transforms secret for safe shell eval
 * .why = prevents command injection in export statements
 */
export const asShellEscapedSecret = (input: { secret: string }): string => { ... };
```

---

### check.3 = test coverage by grain

**the rule:** each grain needs appropriate test coverage (rule.require.test-coverage-by-grain).

| grain | required coverage | blueprint specifies? |
|-------|-------------------|---------------------|
| transformer (asShellEscapedSecret) | unit test | yes |
| contract (CLI commands) | acceptance test | yes |

**evidence from blueprint:**

```
src/domain.operations/keyrack/cli/
├─ [+] asShellEscapedSecret.test.ts    # unit test for transformer

blackbox/cli/
├─ [~] keyrack.get.acceptance.test.ts   # acceptance for CLI
└─ [+] keyrack.source.acceptance.test.ts # acceptance for CLI
```

**verdict:** compliant. blueprint includes both unit and acceptance tests.

---

### check.4 = contract inputs with types

**the rule:** inputs must have explicit types (rule.require.clear-contracts).

**evidence from blueprint:**

| input | type specified? |
|-------|-----------------|
| `--key <keyname>` | string | yes |
| `--env <env>` | string | yes |
| `--output <mode>` | 'value' \| 'json' \| 'vibes' | yes |
| `--value` | boolean | yes |
| `--strict` | boolean | yes |
| `--lenient` | boolean | yes |

contracts table shows all types explicitly.

**verdict:** compliant.

---

### check.5 = dependency injection via context

**the rule:** external deps passed via context (rule.require.dependency-injection).

**analysis:**

`asShellEscapedSecret` is a pure transformer — no external deps needed. no context required.

CLI commands will use extant `getOneKeyForEnv`, `getAllKeysForEnv` which handle their own context.

**verdict:** compliant. pure functions have no deps; orchestrators use extant injected deps.

---

## issues found

### issue.1 = validation errors lack hints

**location:** codepath tree, validate sections

**concern:** `validate: --env required` shows no hint

**fix:** implementation should add hints like:
```
error: --env required
hint: rhx keyrack source --env test --owner ehmpath
```

### issue.2 = jsdoc headers not shown

**location:** blueprint function definitions

**concern:** `asShellEscapedSecret` shows no .what/.why

**fix:** implementation must add jsdoc headers per rule.require.what-why-headers

---

## why it holds (for non-issues)

1. **test coverage by grain** — blueprint includes unit test for transformer and acceptance tests for CLI commands

2. **contract types** — all inputs have explicit types in contracts table

3. **dependency injection** — pure transformer needs no deps; CLI uses extant injected context

## implementation notes

1. add hints to all validation errors
2. add .what/.why jsdoc headers to `asShellEscapedSecret`
3. add .what/.why headers to CLI command action functions
