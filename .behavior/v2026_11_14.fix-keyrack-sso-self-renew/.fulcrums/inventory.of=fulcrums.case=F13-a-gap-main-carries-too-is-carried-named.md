# F13 — a gap `origin/main` carries too is carried forward, named, not held

## .the fork

peer review i001 raised four points whose shape is already on `origin/main`:

- the renew acceptance and integration suites put `mock-aws-cli` on `PATH` and set `AWS_SDK_MOCK=1` (r001 blocker.3, r008 nitpick.2, r009 nitpick.3). main does the same in `blackbox/cli/keyrack.status.acceptance.test.ts` (lines 24, 32–33)
- `daemonRenewRecord` (a `domain.objects` file) imports `asKeyrackKeySlugAtReach` from `domain.operations` (r005 blocker.1). main's `daemonKeyStore.ts:3` imports the same cast the same way
- six peer vaults still hand-roll their mech→adapter maps (r001 nitpick.1). that is main's state; this diff only adds callers of the canonical map
- the session-ended texts the proof matches (r002 nitpick.2) come from main's vault gate; this diff moves them into one named predicate and NARROWS the match (i002 r011 #5). main read any `CredentialsProviderError`, or any message with `expired` or `invalid`, as a dead session and opened a browser login. the shared proof reads only the dead-session sentences, and throws a `MalfunctionError` on any other error. so `unlock` and `set` no longer open a blind browser login on an unknown sdk error; they fail loud with it. that is the renew's need (a blip must never read as a lapse), and it is kept for the interactive path too, since a login cannot cure an error that is not a dead session. `isAwsSsoSessionEndedError.test.ts` pins `configured with invalid SSO credentials` as not ended. the first narrow cut matched only the legacy `sso_start_url` sentences and missed every sentence an `sso_session` profile meets (i004 r010 blocker.1, a defect); the match now reads the refresh hint `@aws-sdk/token-providers` ends each session-end sentence with, pinned verbatim by three rows, with its config faults pinned as not ended

- **a** — repair each here, in the sso-renew diff
- **b** — carry each forward at parity, named in the yield, and repair the family in a change of its own

## .taken

b. `rule.forbid.gates-main-does-not-clear`: a gate main does not clear is not a gate on this diff. a repair here would leave the family split (one suite real-aws, its peers mock; one record off the shared cast, its peer on it), which costs every later reader more. the real-aws contract is proven by the live two-expiry proof on #759, and the yield's "carried at parity, named" section lists each.

## .rework

clean for each, as a change of its own: reclassify the mock suites or add a credentialed real-aws case; move `asKeyrackKeySlugAtReach` beside the domain objects for both the store and the record; repoint six vaults onto the canonical map.

## .confidence — 80%, why not higher

the renew is a new outbound call, and a reviewer may rule that new external behavior owes its own real-call clamp even where its peers have none.

## .where

- `blackbox/cli/keyrack.status.renew.acceptance.test.ts`
- `src/domain.operations/keyrack/daemon/daemonSsoRenew.integration.test.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/isAwsSsoSessionEndedError.ts`

## .verdict

open — to the commander at the pr.
