# F5 — a failed role init stops the loop, or the loop goes on

- **fork:** when one role's init fails in `rhx init --roles a b c`, (a) stop at that role (today), sync
  hooks to the roles linked so far, fail loud; or (b) go on through every other role, collect the
  failures, sync hooks to every role that linked, then fail loud with the list
- **taken:** (a). it is extant behavior, and the director's clause ("an init that fails part way")
  describes it. (b) is a wider behavior change
- **why (b) is a real contender:** on the measured cloud run mechanic is first, so (a) leaves 1 of 14
  roles linked and (b) leaves 13. (b) boots far more of the crew. and `invokeInit.ts:126` already says
  "absolute mode may accumulate errors" — only package-discovery errors accumulate today, not init
  failures, so the comment and the code disagree
- **rework:** clean — the loop in `getRolesLinkedFromFound.ts` and the error it throws
- **confidence:** 60%. the commander's call: which boots the p0 crew better, and which a human expects
- **where:** `1.vision.yield.md` → open question 5, case 3
- **verdict:** —
