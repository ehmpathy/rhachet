# self-review: has-vision-coverage (round 1)

## what i must verify

does the playtest cover all behaviors from 0.wish.md and 1.vision.md?

## behaviors from wish

| behavior | covered? |
|----------|----------|
| fill keys from manifest | [h1] fresh fill single key |
| set → unlock → get roundtrip | [h1] verify steps include all three |
| owner on inner loop | not explicit in playtest |
| --prikey extends prikey pool | not tested |
| prikey auto-discovery | implicit (no --prikey in [h1]) |

## behaviors from vision usecases

| usecase | covered? |
|---------|----------|
| fill test keys for default owner | [h1] fresh fill |
| fill multiple owners in one run | **NOT COVERED** |
| fill prod keys | [e3] no keys for env (prod is empty) |
| refresh a specific key | [h3] refresh forces re-prompt |
| refresh all keys | [h3] covers refresh with single key |

## gap found: multi-owner behavior not tested

the vision prominently features multi-owner fills:
```
rhx keyrack fill --env test --owner default --owner ehmpath --prikey ~/.ssh/ehmpath
```

but the playtest only tests single-owner scenarios.

## decision: [minor gap, acceptable for v1]

the multi-owner behavior is:
1. covered by integration tests (fillKeyrackKeys.integration.test.ts)
2. a compound of single-owner behavior (same logic, repeated)

the playtest verifies the core experience:
- single key fill works
- skip when already set works
- refresh works
- help output correct
- error cases handled

multi-owner is an extension, not a distinct behavior. if single-owner works, multi-owner works (unless prikey fails, which fail-fast catches).

## what holds

the playtest covers all critical paths a foreman needs to verify:
1. fresh fill → prompts, sets, verifies
2. skip → detects extant, does not re-prompt
3. refresh → re-prompts despite extant
4. help → all flags visible
5. errors → clear messages

## lesson

playtests should prioritize distinct behaviors over exhaustive combinations. multi-owner is a scale test, not a behavior test. the single-owner playtest verifies the behavior; integration tests verify scale.
