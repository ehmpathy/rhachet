# F14 — two extant test expectations move with a requirement change

- **fork**: two extant tests change their expected value. one: `getCloneInputStateOrBlind [case4]`
  now expects reason `probe-unanswered` where it expected `feed-not-live`. two:
  `computeCloneSayReport.test.ts` `unreadable feed-not-live` now expects `do NOT blind re-send`
  where it expected `wait`. keep the old expectations, or move them with the requirement
- **taken**: move them. each old value pinned a defect a reviewer raised and the route conceded:
  - `feed-not-live` named four causes, and its cure (re-enroll) is false on a loaded box. that was
    i007 r11 blocker.1, conceded. a reply timeout now has its own reason
  - the old hint said "retry" on a say that is always `delivered: true`, which invites a doubled
    message. that was i006 r10 blocker.1, conceded `urgent`; the harm is a say typed twice
- **what the tests still hold**: each changed assertion is as exact as the one it replaced, an exact
  reason and an exact phrase. the scene, the elapsed-time bound, the degrade-not-throw property and
  the "do not jump to re-enroll" half of r9.n1 all stay asserted, the last through the snapshot of
  the full hint. new behavior got new rows (`probe-unanswered` released and unreadable)
- **rework**: clean. one assertion each
- **confidence**: 90%. the approval on record is a reviewer's concession, not the wisher's word
- **where**: `src/domain.operations/clone/socket/getCloneInputStateOrBlind.integration.test.ts`,
  `src/domain.operations/clone/socket/computeCloneSayReport.test.ts`
- **verdict**: open, escalated to the wisher. disputed against `5.3 i001 r8 blocker.1`,
  `r8 blocker.2` and `r2 nitpick.1`, then again on the same two expectations at
  `5.3 i004 r12 blocker.1/2` and `5.3 i005 r12 blocker.1/2`. the reviewer holds that the new reason
  and the hint rewrite are out of scope; only the wisher can settle that
