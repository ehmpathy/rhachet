# self-review r11: has-role-standards-adherance

## review for adherence to mechanic role standards

### relevant brief categories

the blueprint touches these areas, each with applicable rules:

| category | relevance |
|----------|-----------|
| `code.prod/evolvable.procedures/` | input-context pattern, dependency injection, arrow functions |
| `code.prod/evolvable.domain.operations/` | get-set-gen verbs, sync filename to opname |
| `code.prod/pitofsuccess.errors/` | exit code semantics, failfast |
| `code.prod/readable.narrative/` | named transformers, forbid else branches |
| `code.test/frames.behavior/` | given-when-then pattern |
| `lang.terms/` | treestruct, ubiqlang, forbid gerunds |

---

## rule-by-rule check with alternatives analysis

### rule.require.input-context-pattern

**the rule:** functions use `(input, context?)` pattern.

**evidence from blueprint:**
```
asShellEscapedSecret.ts
├─ input: { secret: string }
├─ output: string (shell-safe)
└─ pure transformer (no i/o)
```

**the alternative: what if blueprint used positional args?**
```ts
// deviation
asShellEscapedSecret(secret: string): string

// correct
asShellEscapedSecret(input: { secret: string }): string
```

positional args would violate the pattern because:
- no named parameters — callsite is unclear
- difficult to extend — added params require signature changes
- inconsistent with all other domain operations

**verdict:** blueprint is compliant. shows object input.

---

### rule.require.get-set-gen-verbs

**the rule:** domain operations use get/set/gen verbs.

**analysis:**

| operation | verb | type |
|-----------|------|------|
| `asShellEscapedSecret` | `as` | transformer/cast |

**the alternative: what if we named it `getShellEscapedSecret`?**

this would be incorrect because:
- `get*` implies retrieval or lookup
- `as*` implies transformation/cast
- extant pattern: `asKeyrackKeyOrg`, `asKeyrackKeyEnv`, `asKeyrackKeyName`

`as*` is the established pattern for pure casts. `get/set/gen` are for domain operations with side effects or lookups.

**verdict:** blueprint is compliant. uses correct `as*` pattern for transformer.

---

### rule.require.exit-code-semantics

**the rule:** exit 0 = success, exit 2 = constraint (user fix), exit 1 = malfunction.

**evidence from blueprint:**
```
exit 0 | granted
exit 2 | not granted
```

**the alternative: what if blueprint used exit 1 for not granted?**

this would be incorrect because:
- exit 1 = malfunction (server/system error)
- exit 2 = constraint (user must fix)
- "not granted" is a constraint — user must unlock or configure the key

exit 1 would:
- confuse automated retry logic
- suggest the system broke vs suggest user action is needed
- violate keyrack brief `rule.require.exit-code-semantics.md`

**verdict:** blueprint is compliant. correctly uses exit 2 for constraint errors.

---

### rule.require.failfast

**the rule:** fail fast with clear error messages.

**evidence from blueprint:**
```
validate: --value requires --key
validate: --env required
validate: --owner required
validate: --strict and --lenient mutually exclusive
```

**the alternative: what if validations happened mid-execution?**

```ts
// deviation: validate after fetch
const keys = await getAllKeys();
if (!opts.env) throw new Error('--env required'); // too late!

// correct: validate first
if (!opts.env) throw new Error('--env required');
const keys = await getAllKeys();
```

late validation would:
- waste resources (fetch then fail)
- obscure the real problem (user sees fetch error, not input error)
- violate fail-fast principle

**verdict:** blueprint is compliant. all validations shown before main logic.

---

### rule.require.named-transformers

**the rule:** decode-friction must be extracted to named transformers.

**evidence from blueprint:**
```
keyName = slug.split('.').slice(2).join('.')
```

**the alternative: what if this stayed inline?**

this IS decode-friction because:
- requires mental simulation: "what does slice(2) do here?"
- extant transformer exists: `asKeyrackKeyName({ slug })`
- inline parse duplicates extant code

**issue found:** blueprint shows inline slug parse.

**fix:** implementation must use `asKeyrackKeyName({ slug })` instead.

---

### rule.forbid.else-branches

**the rule:** no else branches — use early returns.

**evidence from blueprint:**
```
if opts.key → get single key
else → get all repo keys
```

**the alternative: what if implementation used if/else?**

```ts
// deviation
if (opts.key) {
  keys = await getOneKey(...);
} else {
  keys = await getAllKeys(...);
}

// correct
if (opts.key) return emitSingle(await getOneKey(...));
return emitAll(await getAllKeys(...));
```

if/else would:
- add nest depth
- obscure the narrative flow
- violate rule.forbid.else-branches

**verdict:** codepath notation acceptable. implementation must use early returns.

---

### rule.require.given-when-then

**the rule:** tests use given/when/then pattern.

**evidence from blueprint:**
```
├─ [+] given key granted, when --value → raw secret, exit 0
├─ [+] given key locked, when --value → stderr locked, exit 2
```

**the alternative: what if tests used describe/it?**

```ts
// deviation
describe('keyrack get --value', () => {
  it('outputs raw secret', async () => { ... });
});

// correct
given('[case1] key granted', () => {
  when('[t0] --value', () => {
    then('raw secret', () => { ... });
  });
});
```

describe/it would:
- obscure preconditions (given)
- blend action and assertion (when vs then)
- violate rule.require.given-when-then

**verdict:** blueprint is compliant. all tests follow given/when/then.

---

### rule.forbid.gerunds

**the rule:** no gerunds (-ing as nouns) in names.

**analysis of blueprint names:**

| name | gerund check |
|------|-------------|
| `asShellEscapedSecret` | `Escaped` = participle (adjective), not gerund |
| `formatKeyrackGetOneOutput` | no -ing suffix |
| `source` | noun, not gerund |
| `--strict`, `--lenient` | adjectives |

**the alternative: what if we named it `asShellEscapeSecret`?**

wait — let me verify: `Escaped` is correct because it describes the result state (adjective). `Escape` would be a verb, and `asShellEscapeSecret` would read as "as shell escape secret" which is grammatically awkward. the participle form `Escaped` works as an adjective: "the escaped secret" = "the secret that was escaped".

**verdict:** blueprint is compliant. `Escaped` is participle (adjective), not gerund.

---

## issues found

### issue.1 = inline slug parse in emit loop

**location:** codepath tree, keyrack source emit section

**concern:** `keyName = slug.split('.').slice(2).join('.')` is inline decode-friction

**fix:** implementation must use extant `asKeyrackKeyName({ slug })` transformer

**why it matters:**
- duplicates extant code
- requires mental simulation
- violates rule.require.named-transformers

---

## why it holds (for non-issues)

1. **input-context pattern** — uses object input `{ secret: string }`, not positional args

2. **get-set-gen verbs** — uses `as*` for pure cast, not `get*` for lookup

3. **exit code semantics** — uses exit 2 for constraint (user must fix), not exit 1 for malfunction

4. **failfast** — all validations precede main logic in codepath tree

5. **given-when-then tests** — all test cases follow the pattern explicitly

6. **no gerunds** — `Escaped` is participle (adjective), not gerund (noun)

## implementation notes

1. use `asKeyrackKeyName({ slug })` instead of inline `slug.split('.').slice(2).join('.')`
2. use early return pattern: `if (opts.key) return ...; return ...;`
3. use arrow function syntax: `export const fn = (input) => { ... };`
