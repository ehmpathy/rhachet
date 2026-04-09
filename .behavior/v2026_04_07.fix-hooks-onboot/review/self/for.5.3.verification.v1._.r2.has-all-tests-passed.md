# review: has-all-tests-passed (r2)

## verdict: BLOCKER — 4 integration tests fail due to absent credentials

cannot pass this gate. foreman intervention required.

---

## test results with proof

### types

```
$ npm run test:types
> exit 0
> types pass
```

### lint

```
$ npm run test:lint
> exit 0
> lint pass
```

### format

```
$ npm run test:format
> exit 0
> format pass
```

### unit

```
$ npm run test:unit
> exit 0
> 285 tests passed
```

### integration

```
$ npm run test:integration
> exit 1
> 186 passed, 2 failed, 12 skipped

$ THOROUGH=true npm run test:integration
> exit 1
> 532 passed, 4 failed, 12 skipped
```

**failures:**

| test file | absent credential |
|-----------|-------------------|
| enweaveOneStitcher.integration.test.ts | OPENAI_API_KEY |
| enweaveOneRoute.integration.test.ts | OPENAI_API_KEY |
| invokeImagineStitcher.integration.test.ts | OPENAI_API_KEY |
| genActor.brain.caseAskable.integration.test.ts | XAI_API_KEY, OPENAI_API_KEY |

### acceptance

```
$ npm run test:acceptance
> exit 0
> 1453 passed, 30 skipped
```

---

## credential unlock attempt

```
$ rhx keyrack unlock --owner ehmpath --env test
> no keys unlocked (credentials not configured for ehmpath owner)
```

the credentials are not configured in the ehmpath keyrack. mechanic cannot configure them — requires human intervention.

---

## why this is a blocker

per the guide:
> "zero tolerance for credential excuses"
> "if creds block tests, that is a BLOCKER — not a deferral"

the 4 integration failures are real failures. they throw `ConstraintError` when credentials are absent. they do not silently skip.

---

## foreman options

documented in `5.3.verification.handoff.v1.to_foreman.md`:

1. **configure credentials** — add OPENAI_API_KEY and XAI_API_KEY to ehmpath keyrack
2. **skip for now** — accept that pre-extant credential tests fail; merge onTalk work
3. **mock credentials** — add test mocks for credential-gated tests (larger refactor)

---

## onTalk-specific tests all pass

all tests related to this work pass:

| suite | onTalk tests | status |
|-------|-------------|--------|
| unit | translateHook [case8, case9] | pass |
| integration | syncOneRoleHooksIntoOneBrainRepl [case4] | pass |
| integration | config.dao (opencode) [case3, case4] | pass |
| integration | genBrainHooksAdapterForClaudeCode [del onTalk] | pass |

the 4 failures do not touch any onTalk code paths.

---

## cannot proceed without foreman

this gate requires zero failures. I have 4 failures I cannot fix (no credentials). handoff submitted. awaits foreman decision.
