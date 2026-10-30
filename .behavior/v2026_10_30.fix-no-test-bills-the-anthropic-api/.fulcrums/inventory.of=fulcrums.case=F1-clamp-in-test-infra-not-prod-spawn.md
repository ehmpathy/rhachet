# F1 — the clamp lives in test infra; prod clone spawn keeps the key

## .the fork
- (a) test infra refuses `ANTHROPIC_API_KEY` in the env every suite and spawn inherits (one guard in jest globalSetup, after `keyrack.source`)
- (b) `asBrainCliSpawnEnv` strips `ANTHROPIC_API_KEY` from every clone, prod included

## .taken
(a), plus a loud notice at enroll. the wish bounds the cure to tests and unlocks. a human who
exports a key for a clone has chosen to pay per api call; (b) would override that choice
silently, which is a surprise in prod. the notice is the fail-safe for the seat path: `rhx enroll`
names the key, says the clone bills the api, and names `unset ANTHROPIC_API_KEY`, then starts the
clone as asked. a peer review (r2, experience-coverage) found the seat path had no fail-safe
without it.

## .rework
clean: (b) is a one-line filter in `asBrainCliSpawnEnv` plus its unit test, if the wisher wants it.

## .confidence = 80%
low because crew seats are enrolled clones: if a seat's shell exports the key, (a) does not
reach the seat's own claude. the measure step checks whether any seat env held the key.

## .where
`jest.integration.globalSetup.ts`, `jest.acceptance.globalSetup.ts`
