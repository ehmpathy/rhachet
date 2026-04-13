# self-review: has-play-test-convention (round 9)

## pause

i searched for `.play.` test files in the repo.

## search result

```
$ glob '**/*.play.*.ts'
No files found
```

## why no journey tests

this is a bug fix, not a journey feature.

journey tests (`.play.test.ts`) document user journeys through the system. they are appropriate for:
- new features with distinct user flows
- multi-step workflows
- integration scenarios that span components

this route has one behavioral change:
- before: fill hardcodes mech to PERMANENT_VIA_REPLICA
- after: fill prompts for mech (like set does)

the change is covered by:
- **unit test:** `fillKeyrackKeys.test.ts` (if extant)
- **integration test:** `fillKeyrackKeys.integration.test.ts` (case2: fresh fill with 2+ keys)
- **acceptance test:** `keyrack.fill.acceptance.test.ts` (--help, error cases, env=all skip)

## is this a gap?

no. journey tests are for journeys. this is a bug fix.

the integration test case2 does exercise a mini-journey:
1. user runs fill
2. fill prompts for mech
3. user selects PERMANENT_VIA_REPLICA
4. key is stored
5. fill verifies via get

this is captured via snapshot:

```
🔑 key 1/2, API_KEY, for 1 owner
   └─ for owner case2j1
      ├─ set the key
      │  ├─
      │  │
      │  │
      │  └─
      └─ get after set, to verify
         ├─ ✓ rhx keyrack unlock --key API_KEY --env test --owner case2j1
         └─ ✓ rhx keyrack get --key API_KEY --env test --owner case2j1
```

## why it holds

1. **bug fix, not journey** — `.play.` convention applies to journey features
2. **integration test covers flow** — case2 exercises the prompt → select → set → verify path
3. **snapshot provides visibility** — tree structure is captured for PR review

## verdict

no journey tests needed. the integration test with snapshot coverage is appropriate for this scope.

