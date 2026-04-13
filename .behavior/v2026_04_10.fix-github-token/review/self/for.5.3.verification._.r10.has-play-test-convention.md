# self-review: has-play-test-convention (round 10)

## pause

i examined the repo's test name conventions.

## repo convention analysis

```
$ git ls-files '*.test.ts' | head -30
blackbox/cli/act.acceptance.test.ts
blackbox/cli/keyrack.roundtrip.acceptance.test.ts
blackbox/cli/keyrack.fill.acceptance.test.ts
...
```

this repo uses:
- `*.acceptance.test.ts` — acceptance tests (blackbox, subprocess)
- `*.integration.test.ts` — integration tests (real deps, in-process)
- `*.test.ts` — unit tests

**no `.play.` convention in this repo.**

## fallback convention

the guide asks: "if not supported, is the fallback convention used?"

the fallback for journey tests in this repo is:
- `keyrack.roundtrip.acceptance.test.ts` — covers set → unlock → get flow
- `keyrack.fill.acceptance.test.ts` — covers fill scenarios

these are journey-style tests without the `.play.` suffix.

## does this fix need a journey test?

the criteria specified 7 usecases. let me check coverage:

| usecase | covered by |
|---------|-----------|
| 1. fill prompts for mech | integration test case2 |
| 2. fill with ephemeral | mech adapter tests (separate) |
| 3. fill with permanent | integration test case2 |
| 4. manifest explicit mech | code path analysis |
| 5. vault single mech | code path analysis |
| 6. pem tilde expansion | pre-extant |
| 7. parity with set | integration test case2 |

the integration test with snapshot provides journey-style coverage without the `.play.` suffix.

## should i add a `.play.` test?

no, because:
1. repo does not use `.play.` convention
2. integration test already covers the journey
3. acceptance tests cover blackbox scenarios
4. a new convention would be out of scope for this fix

## why it holds

1. **repo convention** — uses `.acceptance.test.ts` and `.integration.test.ts`, not `.play.`
2. **coverage extant** — integration test case2 covers the prompt → select → set → verify journey
3. **snapshot visibility** — tree structure captured for PR review
4. **no new convention needed** — fix uses extant test patterns

## verdict

`.play.` convention not used in this repo. fallback convention (integration + acceptance tests) is followed. no gap.

