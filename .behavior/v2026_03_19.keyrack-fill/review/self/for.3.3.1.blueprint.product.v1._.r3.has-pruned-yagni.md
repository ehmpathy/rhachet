# self-review r3: has-pruned-yagni (deeper question)

## pause. breathe. question harder.

r2 concluded "no YAGNI found" by cross-reference of components against wish/vision. but did we question hard enough? let's apply the adversarial lens: "what if we're wrong?"

---

## challenge: is FillKeyResult type needed?

### the blueprint proposes

```ts
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};
```

### adversarial question

could we just use inline objects? do we need a named type?

### verdict

**yes, needed.** the type is used in:
1. `results: FillKeyResult[]` array
2. `results.filter(r => r.status === 'set')` for summary
3. return type declaration

a named type here improves readability and enables autocomplete. it's not YAGNI — it's DRY applied to type annotations.

---

## challenge: is summary object needed?

### the blueprint proposes

```ts
const summary = {
  set: results.filter(r => r.status === 'set').length,
  skipped: results.filter(r => r.status === 'skipped').length,
  failed: results.filter(r => r.status === 'failed').length,
};
```

### adversarial question

could we just log the results and not return a summary? why compute these counts?

### analysis

the vision specifies:
- "exits 0 when all keys verified"
- "exits 1 if any key fails roundtrip"

to determine exit code, we need to know if any failed. could do:

```ts
const hasFailed = results.some(r => r.status === 'failed');
process.exit(hasFailed ? 1 : 0);
```

but we also output: `🔐 keyrack fill complete (${summary.set + summary.skipped}/${slugs.length} keys verified)`

the summary is needed for the output string.

### verdict

**yes, needed.** summary serves both:
1. exit code logic
2. output message

could we inline? yes, but summary is cleaner than to compute twice.

---

## challenge: is results array needed?

### the blueprint proposes

```ts
const results: FillKeyResult[] = [];
// ... push results in loop
return { results, summary };
```

### adversarial question

do we need to return results? could we just log and exit?

### analysis

the CLI layer (`invokeKeyrack.ts`) will:
1. call `fillKeyrackKeys`
2. exit based on return value

if we only return summary, CLI can still determine exit code. but results enable:
- future: machine-readable output (--json flag)
- future: per-key report in CI
- tests: assert specific key outcomes

### verdict

**needed for testability.** without results, integration tests can't verify which keys were set vs skipped. the array enables assertions like:

```ts
expect(results).toContainEqual({ slug: 'CLOUDFLARE_API_TOKEN', owner: 'default', status: 'set' });
```

---

## challenge: is genMockKeyrackRepoManifest.ts needed?

### the blueprint proposes

```
.test/assets/genMockKeyrackRepoManifest.ts
```

### adversarial question

could we inline test fixtures? do we need a generator?

### analysis

the integration tests will have multiple scenarios:
- fill single owner (fresh fill, partial fill, fail-fast)
- fill multiple owners (both fresh, mixed state)
- error cases (no prikey, key not found)

each scenario needs a manifest. if we inline:

```ts
const manifest = {
  org: 'ehmpathy',
  keys: {
    'ehmpathy.test.CLOUDFLARE_API_TOKEN': { vault: 'os.secure' },
    'ehmpathy.test.AWS_PROFILE': { vault: 'aws.iam.sso' },
  },
};
```

repeated across 6+ test cases, with key change per scenario.

### verdict

**needed.** generator avoids duplication:

```ts
const manifest = genMockKeyrackRepoManifest({
  org: 'ehmpathy',
  keys: ['CLOUDFLARE_API_TOKEN', 'AWS_PROFILE'],
  env: 'test',
});
```

one generator, N test cases.

---

## challenge: is "warn when vault inferred" needed?

### the blueprint proposes

```ts
if (!keySpec?.vault) {
  console.log(`      warn: vault inferred as ${vault}`);
}
```

### adversarial question

is this warn necessary? users might not care about inference.

### analysis

the vision says vault inference "may surprise" — explicitly flagged as a risk. the wish says "infer the vault... when not prescribed."

inference is correct behavior, but silent inference could confuse users when the inferred vault differs from expectation.

### verdict

**needed.** the warn is a pit-of-success guardrail. if user didn't expect os.secure, they see the warn and can add explicit vault to manifest.

---

## challenge: are integration tests really integration?

### the blueprint proposes

```
fillKeyrackKeys.play.integration.test.ts

these tests mock:
- daoKeyrackRepoManifest → return test manifest
- daoKeyrackHostManifest → simulate empty/partial/full state
- promptHiddenInput → return test values
- setKeyrackKey, unlockKeyrackKeys, getKeyrackKeyGrant → spy for verification
```

### adversarial question

if we mock all the DAOs, is this really integration test? or is it unit test with extra steps?

### analysis

the test verifies:
1. orchestrator correctly loops keys × owners
2. skips when already set
3. calls primitives in correct order
4. handles errors appropriately

it mocks external dependencies (filesystem, user input) but tests the orchestration logic as a unit.

**true integration** would hit real filesystem, real keyrack set, real unlock/get. but that requires:
- actual prikeys
- actual keyrack storage
- interactive input

### verdict

**name imprecise but approach correct.** the "integration" term is about test of multiple components composed together (orchestrator + primitives), not about hit of real external systems.

could rename to `fillKeyrackKeys.test.ts` (unit test), but the extant pattern uses `.play.integration.test.ts` for journey-style tests that verify multi-step flows.

---

## challenge: could we simplify the prikey iteration?

### the blueprint proposes

```ts
const prikeysToTry = [null, ...input.prikeys];
let hostContext: KeyrackHostContext | null = null;
let prikeyFound: string | null = null;

for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({ owner, prikey });
    prikeyFound = prikey;
    break;
  } catch {
    continue;
  }
}
```

### adversarial question

is this loop needed? could we just pass null and let DAO discover?

### analysis

if we always pass `null`:
- DAO does discovery internally
- user's `--prikey` flags are ignored

the wish explicitly says `--prikey` "extends the set of prikeys we should consider."

if we only pass user's prikeys:
- discovery doesn't happen
- user must always specify prikeys

### verdict

**needed.** the loop implements the wish semantics: discover first (null), then try supplied prikeys as fallback.

---

## conclusion

r3 challenged each potentially-YAGNI component. all components trace to:
- explicit wish/vision requirements
- testability requirements
- pit-of-success guardrails

**no hidden YAGNI found.** the blueprint is minimal.

| component | challenge | verdict |
|-----------|-----------|---------|
| FillKeyResult type | could inline? | needed for readability + DRY |
| summary object | could skip? | needed for output + exit code |
| results array | could skip? | needed for testability |
| genMockKeyrackRepoManifest | could inline? | needed to avoid duplication |
| vault warn | could skip? | needed for pit-of-success |
| integration test mocks | misnamed? | name imprecise but approach correct |
| prikey iteration loop | could simplify? | needed for wish semantics |

