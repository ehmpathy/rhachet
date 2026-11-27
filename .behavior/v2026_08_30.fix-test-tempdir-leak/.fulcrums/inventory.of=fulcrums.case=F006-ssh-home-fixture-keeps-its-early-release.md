# F006 — the ssh home fixture keeps its early release of the dir

## .the fork

repo-rules i009 nitpick.2: `withTestHomeWithSshKey` and `createTestHomeWithSshKey().teardown` still
`rmSync` their genTempDir home; the rule says a genTempDir dir carries no call-site teardown duty.
the ask: drop the `rmSync`.

## .taken — keep the `rmSync`

- **it is a tested contract.** `withTestHomeWithSshKey.test.ts` `[case0][t1]` asserts *temp
  directory is cleaned up* once the callback completes. measured 2026-11-22: with the `rmSync`
  dropped, that case goes red. `rule.require.review-test-changes` forbids a refactor that deletes an
  extant assertion of prior behavior unasked
- **it is an early release, never the reclaim.** the dir is genTempDir-stamped, so the run's
  teardown reclaims it regardless; the `rmSync` only frees the disk sooner within a long run. the
  rule's point — no call site may be the ONLY reclaim — still holds
- the comment now says so at both sites, so a reader does not take it for the reclaim

## .rework

clean — drop the two `rmSync` calls and the test case, should the human want the fixture's
contract narrowed.

## .confidence

92%.

## .verdict

settled by the driver, by reason. disputed, not conceded.
