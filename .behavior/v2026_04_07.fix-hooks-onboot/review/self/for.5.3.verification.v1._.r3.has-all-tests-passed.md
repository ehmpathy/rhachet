# review: has-all-tests-passed (r3)

## verdict: BLOCKER — 4 integration tests fail due to absent credentials

this review identifies a blocker that cannot be resolved by mechanic. foreman intervention required.

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

## what I found (issue)

**issue:** 4 integration tests fail due to absent API credentials.

**why I cannot fix it:**
- credentials must be configured by human (keyrack set requires human)
- mechanic does not have access to OPENAI_API_KEY or XAI_API_KEY
- the `rhx keyrack unlock --owner ehmpath --env test` command shows no keys configured

**what I did instead:**
- created handoff document: `5.3.verification.handoff.v1.to_foreman.md`
- documented all foreman options (configure creds, skip for now, mock creds)
- documented that onTalk-specific tests all pass

---

## what I found (non-issue)

**non-issue:** all onTalk-specific tests pass.

**why it holds:**
- the 4 failures are in stitcher/actor brain tests, not hook tests
- these tests existed before onTalk work
- the failures use fail-fast ConstraintError pattern (not silent bypass)
- onTalk code paths are not touched by these tests

---

## foreman options

documented in `5.3.verification.handoff.v1.to_foreman.md`:

1. **configure credentials** — add OPENAI_API_KEY and XAI_API_KEY to ehmpath keyrack
2. **skip for now** — accept that pre-extant credential tests fail; merge onTalk work
3. **mock credentials** — add test mocks for credential-gated tests (larger refactor)

---

## conclusion

this gate requires zero failures. I have 4 failures I cannot fix. handoff submitted. awaits foreman decision.
