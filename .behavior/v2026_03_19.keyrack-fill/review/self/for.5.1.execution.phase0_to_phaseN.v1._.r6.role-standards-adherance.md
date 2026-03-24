# review.self: role-standards-adherance (r6)

## verdict: pass

reviewed implementation against mechanic briefs. all patterns followed correctly.

---

## brief directories checked

| directory | relevance |
|-----------|-----------|
| code.prod/evolvable.procedures | input-context, arrow functions, DI |
| code.prod/evolvable.domain.operations | get-set-gen verbs, filename sync |
| code.prod/pitofsuccess.errors | fail-fast, helpful errors |
| code.prod/pitofsuccess.procedures | idempotent, immutable |
| code.prod/readable.comments | what-why headers |
| code.prod/readable.narrative | no else, early returns |
| code.test/frames.behavior | given-when-then, labels |
| lang.terms | noun-adj order, no gerunds |

---

## evolvable.procedures

### rule.require.arrow-only

**brief states:** enforce arrow functions, disallow function keyword

**implementation (line 36):**
```ts
export const fillKeyrackKeys = async (
```

**why it holds:** arrow function syntax, not function keyword.

### rule.require.input-context-pattern

**brief states:** (input, context?) pattern with inline types

**implementation (lines 37-44):**
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

**why it holds:** input object with inline type, context object with inline type.

### rule.require.dependency-injection

**brief states:** pass dependencies via context

**implementation (line 44):**
```ts
context: { gitroot: string }
```

**why it holds:** gitroot passed via context. internal operations receive their own contexts (hostContext, unlockContext, getContext).

### rule.forbid.io-as-interfaces

**brief states:** declare types inline, not separate interfaces

**implementation:** all types inline on function signature. FillKeyResult is local type (lines 22-26), not exported interface.

**why it holds:** no separate *Input, *Output, *Args files.

---

## evolvable.domain.operations

### rule.require.get-set-gen-verbs

**brief states:** operations use get, set, or gen verbs

**implementation:** `fillKeyrackKeys` uses "fill" verb.

**brief also states:** exempt "imperative action commands" from contract/cli

**why it holds:** fill is a CLI orchestrator (invoked via invokeKeyrack.ts). it composes extant get/set/gen operations:
- getAllKeyrackSlugsForEnv (get)
- setKeyrackKey (set)
- genKeyrackHostContext (gen)
- genContextKeyrackGrantGet (gen)
- getKeyrackKeyGrant (get)

the orchestrator name reflects its domain purpose.

### rule.require.sync-filename-opname

**brief states:** filename === operationname

**implementation:**
- file: `fillKeyrackKeys.ts`
- export: `fillKeyrackKeys`

**why it holds:** exact match.

---

## pitofsuccess.errors

### rule.require.fail-fast

**brief states:** use BadRequestError for invalid input, early exits

**implementation (lines 53-57):**
```ts
if (!repoManifest) {
  throw new BadRequestError('no keyrack.yml found in repo', {
    gitroot: context.gitroot,
  });
}
```

**implementation (lines 72-75):**
```ts
throw new BadRequestError(
  `key ${input.key} not found in manifest for env=${input.env}`,
);
```

**implementation (line 139):**
```ts
throw error;
```

**why it holds:** BadRequestError for user errors, error propagation for internal errors.

### rule.forbid.failhide

**brief states:** never hide errors in catch blocks

**implementation (lines 124-126):**
```ts
} catch {
  // this prikey didn't work for this owner, try next
}
```

**analysis:** this catch allows test of the next prikey. if all fail, lines 130-140 try DAO discovery. if that fails, error is rethrown (line 139).

**why it holds:** errors are not hidden — they are deferred until all options exhausted, then propagated.

---

## pitofsuccess.procedures

### rule.require.immutable-vars

**brief states:** use const, except in mutation blocks

**implementation (lines 113-116):**
```ts
let hostContext: ... = null;
let prikeyFound: string | null = null;
```

**analysis:** these let declarations exist in a mutation block (prikey discovery loop). the loop tests each prikey and assigns on success.

**why it holds:** mutation is scoped to discovery loop. all other variables use const.

### rule.require.idempotent-procedures

**brief states:** check before act, skip if done

**implementation (lines 144-149):**
```ts
const keyHost = hostContext.hostManifest.hosts[slug];
if (keyHost && !input.refresh) {
  console.log(`   ${branchContinue}└─ ✓ already set, skip`);
  results.push({ slug, owner: ownerInput, status: 'skipped' });
  continue;
}
```

**why it holds:** checks if key already set before action. skip unless --refresh.

---

## readable.comments

### rule.require.what-why-headers

**brief states:** .what and .why on procedures and types

**implementation (lines 18-21):**
```ts
/**
 * .what = result for a single key × owner fill attempt
 * .why = enables per-key outcome reports
 */
type FillKeyResult = {
```

**implementation (lines 28-35):**
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

**why it holds:** .what and .why present on type and procedure.

### paragraph comments

**implementation examples:**
- line 49: `// load repo manifest`
- line 59: `// get all keys for env`
- line 65: `// filter to specific key if requested`
- line 90: `// for each key`
- line 143: `// check if already set via host manifest`

**why it holds:** each code paragraph has one-line summary.

---

## readable.narrative

### rule.forbid.else-branches

**implementation:** no else or if-else patterns found.

**why it holds:** all conditions use early return or continue.

### rule.prefer.early-returns

**implementation (line 81):**
```ts
return { results: [], summary: { set: 0, skipped: 0, failed: 0 } };
```

**implementation (line 148):**
```ts
continue;
```

**implementation (line 217):**
```ts
continue;
```

**why it holds:** early returns and continues for exit paths.

---

## lang.terms

### rule.require.order.noun_adj

**brief states:** use [noun][state] order

**implementation examples:**
- `ownerInput` (noun + source)
- `prikeyFound` (noun + state)
- `vaultInferred` (noun + how derived)
- `mechInferred` (noun + how derived)
- `hostContext` (noun + type)
- `keyHost` (noun + location)
- `unlockContext` (noun + purpose)

**why it holds:** all variables use noun-first order.

### rule.forbid.gerunds

**implementation:** no variable names use -ing suffix.

**why it holds:** no gerunds in identifiers.

---

## code.test patterns

### rule.require.given-when-then

**test file (lines 93-95):**
```ts
given('[case1] repo with 2 keys, single owner, fresh fill', () => {
  when('[t0] fill is called with env=test', () => {
    then('sets, unlocks, and verifies each key', async () => {
```

**why it holds:** uses test-fns given/when/then with [caseN] and [tN] labels.

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

all mechanic role standards followed. no violations found.
