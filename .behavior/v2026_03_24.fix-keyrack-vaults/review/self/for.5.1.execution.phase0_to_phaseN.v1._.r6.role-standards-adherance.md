# review.self: role-standards-adherance (r6)

## the question

does the code follow mechanic role standards correctly?

## rule directories reviewed

| directory | relevance |
|-----------|-----------|
| evolvable.procedures | ✓ functions, args, patterns |
| pitofsuccess.errors | ✓ fail fast, helpful errors |
| pitofsuccess.procedures | ✓ idempotent mutations |
| readable.comments | ✓ .what/.why headers |
| readable.narrative | ✓ no else, early returns |
| evolvable.architecture | ✓ bounded contexts |

---

## vaultAdapterOsDaemon.ts

### rule.require.arrow-only

| method | signature | verdict |
|--------|-----------|---------|
| unlock | `async () =>` | ✓ arrow |
| isUnlocked | `async () =>` | ✓ arrow |
| get | `async (input) =>` | ✓ arrow |
| set | `async (input) =>` | ✓ arrow |
| del | `async (input) =>` | ✓ arrow |

### rule.require.what-why-headers

| method | .what | .why | verdict |
|--------|-------|------|---------|
| vaultAdapterOsDaemon (module) | ✓ line 15 | ✓ line 16 | ✓ |
| unlock | ✓ line 23 | ✓ line 24 | ✓ |
| isUnlocked | ✓ line 33 | ✓ line 34 | ✓ |
| get | ✓ line 41 | ✓ line 42 | ✓ |
| set | ✓ line 59 | ✓ line 60 | ✓ |
| del | ✓ line 100 | ✓ line 101 | ✓ |

### rule.forbid.else-branches

no `else` keywords in file. ✓

### rule.require.narrative-flow

```
get:
  line 48: if (!result) return null;         // early return
  line 52: if (!keyEntry) return null;       // early return
  line 55: return keyEntry.key.secret;       // main path
```

flat narrative, no nests. ✓

### rule.require.input-context-pattern

all methods use input object pattern. ✓

---

## vaultAdapter1Password.ts

### rule.require.arrow-only

all methods use arrow functions. ✓

### rule.require.what-why-headers

all methods have .what and .why. ✓

### rule.forbid.else-branches

no `else` keywords in file. ✓

### rule.require.fail-fast

```
line 93-94: check isOpCliInstalled() FIRST
line 94:    if (!opInstalled) { ... process.exit(2) }
```

fail fast before any other operations. ✓

### rule.require.helpful-errors

| line | error type | verdict |
|------|------------|---------|
| 63-66 | UnexpectedCodePathError | ✓ |
| 132-135 | BadRequestError | ✓ |

both errors include metadata context. ✓

### rule.require.exit-code-semantics

| line | exit code | semantic |
|------|-----------|----------|
| 119 | 2 | constraint (user must install op cli) |
| 154 | 2 | constraint (user must fix exid) |

correct semantics — exit 2 = constraint. ✓

### rule.require.narrative-flow

```
set:
  line 94:  if (!opInstalled) { ... process.exit(2) }  // guard
  line 124: if (!exid) { exid = prompt }               // conditional prompt
  line 131: if (!exid || !exid.startsWith) throw       // validate
  line 139: try op read catch { exit(2) }              // roundtrip
  line 158: return { exid }                            // main path
```

flat narrative with early guards. ✓

---

## isOpCliInstalled.ts

### rule.require.arrow-only

```typescript
export const isOpCliInstalled = async (): Promise<boolean> => {
```

✓ arrow function

### rule.require.what-why-headers

```typescript
/**
 * .what = checks if 1password cli is installed
 * .why = fail fast before 1password operations
 */
```

✓ both present

### rule.require.single-responsibility

file exports exactly one function. ✓

---

## conclusion

all key implementation files follow mechanic role standards:

| standard | vaultAdapterOsDaemon | vaultAdapter1Password | isOpCliInstalled |
|----------|---------------------|----------------------|------------------|
| arrow-only | ✓ | ✓ | ✓ |
| what-why headers | ✓ | ✓ | ✓ |
| no else branches | ✓ | ✓ | ✓ |
| narrative flow | ✓ | ✓ | ✓ |
| fail fast | ✓ | ✓ | n/a |
| helpful errors | n/a | ✓ | n/a |
| exit code semantics | n/a | ✓ | n/a |
| single responsibility | ✓ | ✓ | ✓ |

no violations found.
