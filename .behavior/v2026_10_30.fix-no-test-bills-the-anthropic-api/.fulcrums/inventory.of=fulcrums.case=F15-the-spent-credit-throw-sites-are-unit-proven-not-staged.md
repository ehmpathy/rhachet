# F15 — the spent-credit throw sites are unit-proven, not driven by a staged screen

## .the fork
- (a) the classifier and the error are unit-tested; the two harness sites that throw it are one
  call each, itemized as a gap (vision cell 23)
- (b) a staged suite drives `enrollRealClaudeAndWaitReach` and `sayAndPollForMarker` against a
  stub claude whose screen prints the spent-credit text, and asserts the named error

## .taken
(a). the logic lives in `isBrainScreenCreditSpent` and `getErrorOfCreditSpent`, each with its own
unit suite and a snapshot of the error (`blackbox/.test/infra/getErrorOfCreditSpent.test.ts`). each
harness site is one call that wraps a thrown error; a staged suite would add a stub brain-cli that
renders a tui screen, a pty spawn and a 2-minute ready wait, to prove one line.

## .what (a) gives up
a harness site that stops to call the classifier would go unseen until a real spent credit met it.
the gap is named in `1.vision.experience.case=_.md` § gaps.

## .rework
clean: a new suite beside `getRealClaudeOrThrow.integration.test.ts`.

## .confidence = 75%
the grain rule asks an orchestrator for an integration test; this holds the cost too high for a
one-line wrap.

## .where
`blackbox/.test/infra/enrollCloneHarness.ts` `failAndRelease`, `sayAndPollForMarker`;
`.reviews/peer/5.3.verification._.review.i001.*.r004.*` nitpick.3.
