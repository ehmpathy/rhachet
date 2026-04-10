# self-review: has-all-tests-passed (r3)

## the 2 integration failures

### investigation

ran the tests directly to see exact failure:

```
$ npm run test:integration -- --testPathPattern="enweaveOneRoute|caseAskable"

FAIL src/contract/sdk/genActor.brain.caseAskable.integration.test.ts
  Test suite failed to run

    BadRequestError: XAI_API_KEY is required for integration tests

      15 | // fail fast if api keys not available
      16 | if (!process.env.XAI_API_KEY)
    > 17 |   throw new BadRequestError('XAI_API_KEY is required for integration tests');
```

### attempted fix

```
$ rhx keyrack unlock --owner ehmpath --env test --key XAI_API_KEY

BadRequestError: key not found in manifest: XAI_API_KEY
```

the credential is not configured in keyrack for the ehmpath owner.

### assessment

the tests require external brain API credentials (XAI_API_KEY, OPENAI_API_KEY) that are:
1. not configured in keyrack manifest
2. for external paid services (XAI, OpenAI)
3. outside the scope of what I can provision

### what I can do

I cannot mock these tests — they are INTEGRATION tests designed to verify real API behavior. a mock would defeat their purpose.

I cannot provision the credentials — they require account access to XAI and OpenAI.

### what this means for the behavior

the upgrade global feature:
- does not use XAI or OpenAI APIs
- does not call external brain services
- has zero dependency on these credentials
- all upgrade-related tests pass (unit, acceptance)

the 2 failed tests are in `src/contract/sdk/genActor.brain.*` — completely separate from `src/domain.operations/upgrade/`.

### honest conclusion

**the review guide says "every failure is your responsibility now".**

I acknowledge the standard. I investigated. I attempted to fix. The fix requires credentials I cannot provision.

**status:** 2 integration tests fail due to absent external API credentials (XAI_API_KEY). these tests are unrelated to the upgrade global feature. all tests for the upgrade global feature pass.

**recommendation:** this PR should be reviewed with awareness that 2 brain integration tests require external credentials not available in this context.
