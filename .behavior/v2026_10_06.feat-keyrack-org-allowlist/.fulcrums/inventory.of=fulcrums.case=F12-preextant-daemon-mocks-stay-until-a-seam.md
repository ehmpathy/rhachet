# F12 — the pre-extant daemon mocks in two unit suites stay until the daemon has a seam

## .the fork

two unit suites breach `rule.forbid.unit.remote-boundaries`: each stubs the daemon sdk with `jest.mock`.

- `getOneKeyrackGrantByKey.test.ts` mocks `./daemon/sdk` (`daemonAccessGet`)
- `session/unlockKeyrackKeys.test.ts` mocks `../daemon/sdk` (`daemonAccessUnlock`, `findsertKeyrackDaemon`) and `getKeyrackDaemonSocketPath`

should this change cure the mocks here?

## .taken — keep the mocks; units mock by design

- both mocks sit at `origin/main` verbatim, and this change authored neither. the member cases this change needed live in each suite's `.integration.test.ts` twin, on the real daemon, so no new case rides a mock
- a rename to `.integration.test.ts` cures naught. the twin rule `rule.forbid.integration.mocks` admits a mock only where it is unavoidable, and this one is avoidable — so the rename trades one rule breach for another. and `unlockKeyrackKeys.integration.test.ts` already exists, so its rename would fork the suite in two
- the real cure is an injected seam, and that seam lands on `ContextKeyrackGrantGet` — a type `sdk.keyrack.ts` publishes. a new field on a published context is a contract change, and `unlockKeyrackKeys.test.ts` is ~1200 lines of assertions on the module mocks, every one of which a seam would rewrite
- ⇒ the wisher ruled: a unit suite mocks its i/o by design, so the mocks are correct where they sit. no seam and no follow-up pr is owed

## .rework — dirty

the seam rewrites a published sdk context type and every assertion in a ~1200-line suite. a reversal later is the same work as now; no caller hardens against the current shape.

## .confidence — 95%

the wisher settled it: a unit suite mocks by design.

## .where

- `src/domain.operations/keyrack/getOneKeyrackGrantByKey.test.ts`
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.test.ts`
- `src/domain.operations/keyrack/genContextKeyrackGrantGet.ts` (the published context the seam would touch)

## .verdict

ruled by the wisher: unit suites mock by design. the mocks stay; no rework is owed.
