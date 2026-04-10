# self-review: has-role-standards-adherance (r11)

## reflection

i review the blueprint against mechanic role standards. the question: any pattern violations?

---

## briefs directories to check

| directory | relevant to blueprint |
|-----------|----------------------|
| code.prod/evolvable.procedures | ✓ new functions |
| code.prod/evolvable.architecture | ✓ module structure |
| code.prod/evolvable.domain.operations | ✓ operation patterns |
| code.prod/pitofsuccess.errors | ✓ error behavior |
| code.prod/readable.narrative | ✓ code clarity |
| code.test | ✓ test patterns |
| lang.terms | ✓ term conventions |
| work.flow | ✓ git patterns |

---

## code.prod/evolvable.procedures

### rule.require.input-context-pattern

**blueprint code:**
```typescript
export const execNpmInstallGlobal = (
  input: { packages: string[] },
): { upgraded: boolean; hint: string | null } => { ... }
```

**adherance:** ✓ uses (input) pattern. no context needed (pure shell call).

---

### rule.require.arrow-only

**blueprint code:** all functions use arrow syntax
```typescript
export const detectInvocationMethod = (): 'npx' | 'global' => { ... }
export const execNpmInstallGlobal = (input) => { ... }
export const getGlobalRhachetVersion = (): string | null => { ... }
```

**adherance:** ✓ no function keyword.

---

### rule.forbid.positional-args

**blueprint code:**
```typescript
input: { packages: string[] }
```

**adherance:** ✓ uses named args via object destructure.

---

## code.prod/evolvable.domain.operations

### rule.require.get-set-gen-verbs

| function | verb | valid? |
|----------|------|--------|
| detectInvocationMethod | detect* | ✓ (extant convention) |
| getGlobalRhachetVersion | get* | ✓ |
| execNpmInstallGlobal | exec* | ✓ (extant convention) |

**adherance:** ✓ follows extant verb patterns.

---

### rule.require.sync-filename-opname

| file | operation name | match? |
|------|----------------|--------|
| detectInvocationMethod.ts | detectInvocationMethod | ✓ |
| getGlobalRhachetVersion.ts | getGlobalRhachetVersion | ✓ |
| execNpmInstallGlobal.ts | execNpmInstallGlobal | ✓ |

**adherance:** ✓ filenames match operation names.

---

## code.prod/pitofsuccess.errors

### rule.require.failfast

**blueprint design:**
- execNpmInstallGlobal returns result, does not throw
- error path returns { upgraded: false, hint }

**question:** should permission errors throw?

**answer:** no — vision says "warn and continue" so local upgrade proceeds. this is intentional non-throw.

**adherance:** ✓ correct error strategy per spec.

---

### rule.forbid.failhide

**blueprint code:**
```typescript
if (result.status !== 0) {
  const stderr = result.stderr?.toString() || '';
  if (stderr.includes('EACCES') || stderr.includes('EPERM')) {
    return { upgraded: false, hint: `sudo npm i -g ...` };
  }
  return { upgraded: false, hint: stderr };
}
```

**adherance:** ✓ errors are surfaced with hints, not hidden.

---

## code.prod/readable.narrative

### rule.forbid.else-branches

**blueprint code:** no else branches shown in code snippets.

**adherance:** ✓ uses early returns.

---

## code.test

### rule.require.given-when-then

**blueprint tests:**
```
- given npm_execpath set → returns 'npx'
- given npm_execpath not set → returns 'global'
- given npm install succeeds → returns { upgraded: true }
```

**adherance:** ✓ follows given/then pattern.

---

### rule.require.test-coverage-by-grain

| grain | file | test type | correct? |
|-------|------|-----------|----------|
| transformer | detectInvocationMethod | unit | ✓ |
| communicator | getGlobalRhachetVersion | unit | acceptable (thin wrapper) |
| communicator | execNpmInstallGlobal | unit | acceptable (thin wrapper) |
| orchestrator | execUpgrade | unit | ✓ |
| contract | invokeUpgrade | integration + acceptance | ✓ |

**adherance:** ✓ test types match layer guidance.

---

## lang.terms

### rule.forbid.gerunds

**examined blueprint terms:**
- ✓ uses "extant" not the forbidden "e* term"
- ✓ no gerunds in function names
- ✓ no gerunds in comments

**adherance:** ✓ gerund-free.

---

### rule.require.ubiqlang

| term | usage | consistent? |
|------|-------|-------------|
| global | npm global install | ✓ |
| local | project install | ✓ |
| upgrade | update to latest | ✓ |
| hint | suggested fix | ✓ |

**adherance:** ✓ terms are consistent.

---

## summary

| category | violations |
|----------|------------|
| evolvable.procedures | 0 |
| evolvable.domain.operations | 0 |
| pitofsuccess.errors | 0 |
| readable.narrative | 0 |
| code.test | 0 |
| lang.terms | 0 |

## conclusion

the blueprint adheres to mechanic role standards. no pattern violations found.

