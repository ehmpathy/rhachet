# review.self: role-standards-adherance (r7)

## verdict: pass (after fix)

found 1 issue: dead imports. fixed. implementation now adheres to all mechanic standards.

---

## issue: dead imports

### found

**fillKeyrackKeys.ts lines 5-6 (before fix):**
```ts
import { promptHiddenInput } from '@src/infra/promptHiddenInput';
import type { KeyrackHostVault } from '@src/domain.objects/keyrack';
```

**analysis:**
- `promptHiddenInput` — never called anywhere in the file
- `KeyrackHostVault` — type never referenced anywhere in the file

these imports were likely leftovers from the blueprint. the blueprint proposed `promptHiddenInput` directly, but the implementation delegates prompts to `setKeyrackKey` internally.

### fixed

removed both dead imports:

```ts
// removed: import { promptHiddenInput } from '@src/infra/promptHiddenInput';
// removed: import type { KeyrackHostVault } from '@src/domain.objects/keyrack';
```

### verification

ran integration tests after fix — all 10 tests pass.

---

## brief directories checked

| directory | relevance |
|-----------|-----------|
| code.prod/evolvable.procedures | arrow functions, input-context, DI |
| code.prod/evolvable.domain.operations | get-set-gen verbs, filename sync |
| code.prod/pitofsuccess.errors | fail-fast, no hidden errors |
| code.prod/pitofsuccess.procedures | idempotent, immutable |
| code.prod/readable.comments | .what/.why headers, paragraph comments |
| code.prod/readable.narrative | no else, early returns |
| lang.terms | noun-adj order, no gerunds |
| code.test/frames.behavior | given-when-then, labels |

---

## line-by-line check: fillKeyrackKeys.ts

### evolvable.procedures

**rule.require.arrow-only**

line 34 (after fix):
```ts
export const fillKeyrackKeys = async (
```

why it holds: arrow function syntax, not function keyword.

**rule.require.input-context-pattern**

lines 35-42 (after fix):
```ts
input: {
  env: string;
  owners: string[];
  prikeys: string[];
  key: string | null;
  refresh: boolean;
},
context: { gitroot: string },
```

why it holds: first arg is input object with inline type, second arg is context object with inline type.

**rule.require.dependency-injection**

line 42: `context: { gitroot: string }`

why it holds: gitroot passed via context. internal operations receive their contexts (hostContext, unlockContext, getContext) via DI pattern.

**rule.forbid.io-as-interfaces**

why it holds: types declared inline on function signature. FillKeyResult is local type (lines 20-24), not exported interface.

---

### evolvable.domain.operations

**rule.require.get-set-gen-verbs**

implementation has "fill" verb for `fillKeyrackKeys`.

brief states: "exempt imperative action commands from contract/cli"

why it holds: fill is a CLI orchestrator (invoked via invokeKeyrack.ts). it composes extant get/set/gen operations:
- getAllKeyrackSlugsForEnv (get)
- setKeyrackKey (set)
- genKeyrackHostContext (gen)
- genContextKeyrackGrantGet (gen)
- getKeyrackKeyGrant (get)

**rule.require.sync-filename-opname**

- file: `fillKeyrackKeys.ts`
- export: `fillKeyrackKeys`

why it holds: exact match.

---

### pitofsuccess.errors

**rule.require.fail-fast**

lines 51-55:
```ts
if (!repoManifest) {
  throw new BadRequestError('no keyrack.yml found in repo', {
    gitroot: context.gitroot,
  });
}
```

lines 70-73:
```ts
throw new BadRequestError(
  `key ${input.key} not found in manifest for env=${input.env}`,
);
```

line 137:
```ts
throw error;
```

why it holds: BadRequestError for user errors, error propagation for internal errors.

**rule.forbid.failhide**

lines 122-124:
```ts
} catch {
  // this prikey didn't work for this owner, try next
}
```

analysis: this catch allows test of the next prikey. if all fail, lines 128-138 try DAO discovery. if that fails, error is rethrown (line 137).

why it holds: errors are not hidden — they are deferred until all options exhausted, then propagated.

---

### pitofsuccess.procedures

**rule.require.immutable-vars**

lines 111-114:
```ts
let hostContext: ... = null;
let prikeyFound: string | null = null;
```

analysis: these let declarations exist in a mutation block (prikey discovery loop). the loop tests each prikey and assigns on success.

why it holds: mutation is scoped to discovery loop. all other variables have const.

**rule.require.idempotent-procedures**

lines 142-147:
```ts
const keyHost = hostContext.hostManifest.hosts[slug];
if (keyHost && !input.refresh) {
  console.log(`   ${branchContinue}└─ ✓ already set, skip`);
  results.push({ slug, owner: ownerInput, status: 'skipped' });
  continue;
}
```

why it holds: checks if key already set before action. skip unless --refresh.

---

### readable.comments

**rule.require.what-why-headers**

lines 16-19:
```ts
/**
 * .what = result for a single key × owner fill attempt
 * .why = enables per-key outcome reports
 */
type FillKeyResult = {
```

lines 26-33:
```ts
/**
 * .what = fills keyrack keys from repo manifest for specified owners
 * .why = eliminates adhoc fill commands; manifest becomes source of truth
 *
 * .note = for each key × each owner: set → unlock → get (roundtrip verification)
 * .note = skips already-configured keys unless --refresh
 * .note = outputs tree-format progress to console
 */
```

why it holds: .what and .why present on type and procedure.

**paragraph comments**

examples:
- line 47: `// load repo manifest`
- line 57: `// get all keys for env`
- line 63: `// filter to specific key if requested`
- line 88: `// for each key`
- line 141: `// check if already set via host manifest`

why it holds: each code paragraph has one-line summary.

---

### readable.narrative

**rule.forbid.else-branches**

checked full file: no else or if-else patterns found.

why it holds: all conditions have early return or continue.

**rule.prefer.early-returns**

line 79:
```ts
return { results: [], summary: { set: 0, skipped: 0, failed: 0 } };
```

line 146:
```ts
continue;
```

line 215:
```ts
continue;
```

why it holds: early returns and continues for exit paths.

---

### lang.terms

**rule.require.order.noun_adj**

variable names checked:
- `ownerInput` (noun + source)
- `prikeyFound` (noun + state)
- `vaultInferred` (noun + how derived)
- `mechInferred` (noun + how derived)
- `hostContext` (noun + type)
- `keyHost` (noun + location)
- `unlockContext` (noun + purpose)

why it holds: all variables have noun-first order.

**rule.forbid.gerunds**

checked all variable names: no gerund suffix found.

why it holds: no gerunds in identifiers.

---

### code.test patterns

**rule.require.given-when-then**

test file line 93-95:
```ts
given('[case1] repo with 2 keys, single owner, fresh fill', () => {
  when('[t0] fill is called with env=test', () => {
    then('sets, unlocks, and verifies each key', async () => {
```

why it holds: test-fns given/when/then with [caseN] and [tN] labels.

**10 test cases cover all criteria scenarios:**

| case | scenario |
|------|----------|
| case1 | fresh fill single owner |
| case2 | partial fill (some skipped) |
| case3 | refresh bypasses skip |
| case4 | multiple owners |
| case5 | no prikey fails |
| case6 | key not found |
| case7 | no manifest |
| case8 | roundtrip fails |
| case9 | specific key only |
| case10 | no keys for env |

---

## summary

| category | patterns checked | status |
|----------|------------------|--------|
| evolvable.procedures | 4 | pass |
| evolvable.domain.operations | 2 | pass |
| pitofsuccess.errors | 2 | pass |
| pitofsuccess.procedures | 2 | pass |
| readable.comments | 2 | pass |
| readable.narrative | 2 | pass |
| lang.terms | 2 | pass |
| code.test | 1 | pass |

| issue | status | action |
|-------|--------|--------|
| dead imports (promptHiddenInput, KeyrackHostVault) | fixed | removed unused imports |

all mechanic role standards followed. dead code removed. 10 tests pass.
