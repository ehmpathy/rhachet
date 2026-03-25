# review.self: role-standards-coverage (r8)

## the question

are all relevant mechanic standards applied? are there patterns that should be present but are absent?

## review method

line-by-line code inspection of each changed file against mechanic briefs directories.

---

## rule directories checked

| directory | subdirectories checked |
|-----------|------------------------|
| code.prod/evolvable.procedures | ✓ arrow-only, input-context, named-args, single-responsibility, hook-wrapper |
| code.prod/evolvable.architecture | ✓ bounded-contexts, directional-deps |
| code.prod/pitofsuccess.errors | ✓ fail-fast, helpful-error-wrap, exit-code-semantics |
| code.prod/pitofsuccess.procedures | ✓ idempotent-procedures, immutable-vars |
| code.prod/pitofsuccess.typedefs | ✓ shapefit, forbid-as-cast |
| code.prod/readable.comments | ✓ what-why-headers |
| code.prod/readable.narrative | ✓ forbid-else, early-returns, narrative-flow |
| code.test/frames.behavior | ✓ given-when-then |

---

## vaultAdapterOsDaemon.ts — line-by-line

### lines 1-14: imports

```typescript
import { daemonAccessUnlock } from '../../daemon/daemonAccessUnlock';
import { daemonAccessGet } from '../../daemon/daemonAccessGet';
// ...
```

imports from peer modules within bounded context. ✓ directional-deps

### lines 15-16: module header

```typescript
/**
 * .what = vault adapter for ephemeral daemon storage
 * .why = keys live in daemon memory only, no disk persistence
 */
```

✓ what-why-headers

### lines 21-100: adapter object

each method has:
- .what/.why header
- arrow function
- input object pattern (where args needed)
- no else branches
- early returns

**why it holds:**
- set() prompts via promptHiddenInput (not passed in args — secret never in bash history)
- set() stores via daemonAccessUnlock (upsert to daemon)
- get() returns null early if daemon has no result
- del() removes from daemon

---

## vaultAdapter1Password.ts — line-by-line

### lines 1-14: imports

```typescript
import { execOp } from './execOp';
import { isOpCliInstalled } from './isOpCliInstalled';
// ...
```

imports within same bounded context (1password/). ✓ directional-deps

### lines 15-16: module header

```typescript
/**
 * .what = vault adapter for 1password cli integration
 * .why = keyrack stores pointer (exid), 1password is source of truth
 */
```

✓ what-why-headers

### lines 93-120: op cli check

```typescript
const opInstalled = await isOpCliInstalled();
if (!opInstalled) {
  console.log('');
  console.log('🔐 keyrack set');
  console.log('   └─ ✗ op cli not found');
  // ... install instructions ...
  process.exit(2);
}
```

**why it holds:**
- fail-fast at entry point (line 93-94)
- exit 2 for constraint error (user must install op cli)
- helpful message with step-by-step install instructions
- no hidden failures

### lines 124-127: exid prompt

```typescript
if (!exid && process.stdin.isTTY) {
  exid = await promptVisibleInput({
    prompt: 'enter 1password uri (e.g., op://vault/item/field): ',
  });
}
```

**why it holds:**
- named args to promptVisibleInput
- visible prompt (not hidden — exid is not secret)
- only prompts in TTY mode (ci-safe)

### lines 131-135: exid validation

```typescript
if (!exid || !exid.startsWith('op://')) {
  throw new BadRequestError('exid required and must start with op://', {
    exid,
  });
}
```

**why it holds:**
- fail-fast on invalid exid
- helpful error with metadata
- early return pattern

### lines 139-155: roundtrip validation

```typescript
try {
  await execOp(['read', exid]);
} catch (error) {
  console.log('');
  console.log('🔐 keyrack set');
  console.log('   └─ ✗ invalid 1password reference: op read failed');
  // ... verify instructions ...
  process.exit(2);
}
```

**why it holds:**
- validates exid before store (not at unlock time)
- exit 2 for constraint error
- helpful message with verify steps

---

## isOpCliInstalled.ts — line-by-line

### lines 1-6: imports

```typescript
import { promisify } from 'util';
import { exec } from 'child_process';
```

minimal imports. ✓

### lines 7-9: header

```typescript
/**
 * .what = checks if 1password cli is installed
 * .why = fail fast before 1password operations
 */
```

✓ what-why-headers

### lines 12-18: function

```typescript
export const isOpCliInstalled = async (): Promise<boolean> => {
  try {
    await execAsync('which op');
    return true;
  } catch {
    return false;
  }
};
```

**why it holds:**
- single responsibility (one check)
- arrow function
- try/catch for shell command (appropriate here — which fails if not found)
- returns boolean (no null/undefined ambiguity)

---

## test files — given-when-then check

### vaultAdapterOsDaemon.test.ts

```typescript
describe('vaultAdapterOsDaemon', () => {
  given('[case1] daemon is active', () => {
    when('[t0] set is called', () => {
      then('stores to daemon', async () => {
        // ...
      });
    });
  });
});
```

✓ given-when-then pattern

### vaultAdapter1Password.test.ts

```typescript
describe('vaultAdapter1Password', () => {
  given('[case1] op cli is installed', () => {
    when('[t0] set is called with valid exid', () => {
      then('returns exid', async () => {
        // ...
      });
    });
  });
});
```

✓ given-when-then pattern

### isOpCliInstalled.test.ts

```typescript
describe('isOpCliInstalled', () => {
  given('[case1] op is in PATH', () => {
    then('returns true', async () => {
      // ...
    });
  });
});
```

✓ given-when-then pattern

---

## patterns that could be absent — deep check

### error wrap with context

| file | check | status |
|------|-------|--------|
| vaultAdapter1Password.ts:133 | BadRequestError with metadata | ✓ includes exid |
| vaultAdapter1Password.ts:63 | UnexpectedCodePathError with metadata | ✓ includes input |

### type safety

| file | check | status |
|------|-------|--------|
| all files | no `as` casts | ✓ zero instances |
| all files | no `any` types | ✓ zero instances |

### null consistency

| file | check | status |
|------|-------|--------|
| vaultAdapterOsDaemon.get | returns `string \| null` | ✓ |
| vaultAdapter1Password.get | returns `string \| null` | ✓ |

### idempotency

| operation | mechanism | status |
|-----------|-----------|--------|
| os.daemon set | daemonAccessUnlock is upsert | ✓ |
| 1password set | returns exid (no side effects) | ✓ |
| os.daemon del | daemonAccessDel is idempotent | ✓ |
| 1password del | manifest upsert | ✓ |

---

## conclusion

all mechanic role standards are present:

| standard | vaultAdapterOsDaemon | vaultAdapter1Password | isOpCliInstalled |
|----------|---------------------|----------------------|------------------|
| what-why-headers | ✓ | ✓ | ✓ |
| arrow-only | ✓ | ✓ | ✓ |
| input-context | ✓ | ✓ | ✓ (no args) |
| named-args | ✓ | ✓ | ✓ |
| forbid-else | ✓ | ✓ | ✓ |
| early-returns | ✓ | ✓ | ✓ |
| fail-fast | ✓ | ✓ | n/a |
| exit-code-semantics | n/a | ✓ (exit 2) | n/a |
| helpful-errors | ✓ | ✓ | n/a |
| idempotent | ✓ | ✓ | n/a |
| type-safety | ✓ | ✓ | ✓ |
| given-when-then tests | ✓ | ✓ | ✓ |

no gaps found. all patterns that should be present are present.
