# self-review r10: has-play-test-convention

## deeper pass: verify journey test file convention

r9 documented that no journey tests exist for this feature. this pass verifies each criterion from the guide with explicit evidence.

---

## guide criteria checklist

the guide asks three questions:
1. are journey tests in the right location?
2. do they have the `.play.` suffix?
3. if not supported, is the fallback convention used?

---

## question 1: are journey tests in the right location?

**answer: N/A — no journey tests exist for this feature**

this feature modifies `translateHook.ts`, which is **internal adapter code**. it translates rhachet `BrainHook` objects to claude code `ClaudeCodeHookEntry` format.

| feature type | test type needed | journey test needed? |
|--------------|-----------------|---------------------|
| CLI command | acceptance/journey | YES |
| SDK export | acceptance/integration | YES |
| internal adapter | unit | NO |

`translateHook.ts` is in the third category. users never interact with this function directly. the only tests needed are unit tests.

---

## question 2: do they have the `.play.` suffix?

**answer: N/A — no journey tests exist**

evidence from glob search:

```
$ Glob pattern: **/*.play.test.ts
No files found

$ Glob pattern: **/*.play.*.test.ts
No files found
```

no `.play.` test files exist anywhere in the repo for this feature or any other feature.

---

## question 3: is the fallback convention used?

**answer: N/A — no journey tests needed**

since this is internal adapter code, the appropriate test type is **unit tests**, not journey tests.

the changed test file:
- `translateHook.test.ts` — unit test (44 tests, all pass)

unit test files use `.test.ts` suffix, which is correct.

---

## why no journey tests is correct

**the feature boundary determines the test type.**

| layer | example | test type |
|-------|---------|-----------|
| CLI | `invokeEnroll.ts` | journey/acceptance |
| SDK | `genActor.ts` | integration |
| internal | `translateHook.ts` | unit |

`translateHook.ts` is called by `genBrainHooksAdapterForClaudeCode.ts`, which is called at role sync time. users never invoke `translateHook` directly.

---

## evidence: no user-visible contract

searched for references to `translateHook`:

```
$ Grep pattern: translateHook
  src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts
  src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
  src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts
```

only three files reference `translateHook`:
1. the function itself
2. its unit test
3. the adapter that calls it

**no CLI, no SDK export, no user-visible contract** = no journey test needed.

---

## evidence: repo convention for internal adapters

checked other internal adapter tests in the same directory:

```
src/_topublish/rhachet-brains-anthropic/src/hooks/
├── config.dao.test.ts              (unit test)
├── getBrainHooks.test.ts           (unit test)
├── genBrainHooksAdapterForClaudeCode.test.ts (unit test)
└── translateHook.test.ts           (unit test)
```

all four test files use `.test.ts` suffix. this is consistent with the repo's convention for internal code.

---

## explicit answers to guide questions

| guide question | answer | why |
|----------------|--------|-----|
| right location? | N/A | no journey tests exist |
| `.play.` suffix? | N/A | no journey tests exist |
| fallback used? | N/A | unit tests used instead |

---

## conclusion

**no journey tests needed for internal adapter code.**

the feature:
1. modifies `translateHook.ts` — an internal function
2. has no user-visible contract (not CLI, not SDK)
3. is tested via unit tests (44 tests pass)
4. follows repo convention for internal adapters (`.test.ts`)

journey tests are for user-visible contracts. internal adapters are tested via unit tests. the convention is satisfied by correctly matching the test type to the feature boundary.

holds.

