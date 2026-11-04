# self review — 5.3.verification — has-preserved-test-intentions

I read the diff of every extant test file this change touches, line by line. `git diff -U0` filtered
to removed lines settles the add-only files; the others are read whole below.

## add-only — no prior assertion moved

- `genCloneSocketServer.integration.test.ts` — the removed-line filter returns 0 lines. cases 19–22
  and their imports are new; every extant case is byte-identical
- `blackbox/.test/infra/enrollCloneHarness.ts` — the 2 removed lines are a comment that counted the
  degrade leaves ("FOUR renders … three of which"); the count was stale, so the comment now lists them
  by name. `expectCloneSaySuccessTree`'s assertions are untouched: it still accepts one `└─ 🟡` leaf
  and no more, so the new `screen probe unanswered` leaf meets the same rule every other leaf meets

## comment-only

- `awaitCloneAuthGate.test.ts` — "the whole 8s prod bound" → "65s". the assertion (settles promptly,
  far under the bound) is unchanged; only the figure in its why moved, to match the constant

## assertions that changed — each is a requirement change, documented and approved

### `getCloneInputStateOrBlind [case4]` — `reason` `feed-not-live` → `probe-unanswered`

- **before:** a silent accepted socket under a 150ms forwarded bound degrades probe-blind, reason
  `feed-not-live`, in under 10× the bound
- **after:** same scene, same probe-blind degrade, same elapsed-time assertion, reason
  `probe-unanswered`
- **why this is not a weakened test:** the test's truth was "a reply timeout degrades fast, and is
  never a throw". both halves still hold and are still asserted. what changed is the NAME the degrade
  carries, because `feed-not-live` was overloaded across four causes and its cure (re-enroll) was false
  for a loaded box — the arch-defects reviewer's blocker (i007 r11 blocker.1), conceded. the assertion
  is as strict as before: an exact reason, not a looser match. bite:
  `.log/role=mechanic/skill=git.repo.test/what=integration/2026-11-01T23-14-13Z.stderr.log`

### `computeCloneSayReport.test.ts` — the `unreadable feed-not-live` row

- **before:** `treeIncludes: 'wait'` — the hint named a wait (r9.n1): a brand-new clone attaches its
  feed on its first output, so a human should not jump straight to a re-enroll
- **after:** `treeIncludes: 'do NOT blind re-send'`
- **the risk I checked:** does the new copy drop r9.n1's intent? the intent had two parts: (a) do not
  jump to re-enroll, since the feed may still attach, and (b) "retry". (a) survives in the copy —
  `a brand-new clone attaches its feed on its first output; if this recurs, … re-enroll` — and the
  snapshot pins that full hint verbatim, so a future edit that drops it goes red. (b) was the defect:
  `unreadable` is always `delivered: true`, so "retry" invited a doubled message. that was conceded
  `urgent` (i006 r10 blocker.1), the harm nameable: a say typed twice. the row now asserts the
  property that guards that harm
- the two new rows (`probe-unanswered`, released + unreadable) are additions

## found

no weakened assertion, no deleted case, no expected value moved to match broken output. every changed
expectation names a requirement the reviewers raised and the route recorded (r11 blocker.1, r10
blocker.1), and each changed assertion is as exact as the one it replaced.
