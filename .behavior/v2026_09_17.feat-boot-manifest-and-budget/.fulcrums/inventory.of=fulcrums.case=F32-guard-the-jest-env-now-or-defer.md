# F32 — guard the shared jest env against an incomplete `dist/` now, or defer?

- **raised** = 2026-09-22, at `5.1.execution.from_vision`, on the close-out acceptance tier
- **rework** = **dirty**
- **status** = ANSWERED
- **confidence** = **84%**

---

## .the fork, stated fairly

a full acceptance tier ran 50 minutes and returned 96 suites "failed to run" on one absent build
artifact, then closed with a summary that named **snapshots** and advised the reader to inspect
their own diff. the repair is ~10 lines and the shape is already in use six files away.

| | **pull it in now** | **defer it** |
|---|---|---|
| the change | a preflight in `jest.acceptance.env.ts` (or a `globalSetup`) that asserts the dist entrypoints and throws a `ConstraintError` that names `npm run build` | a caught dream, and the tier keeps its 50-minute misdirection |
| who it serves | every reader of every acceptance run, in every future round | the next reader who hits it |
| what it touches | 🔴 the **one file all 136 acceptance suites load** | naught in this round |
| the risk | a throw in a shared setup changes the failure mode of 136 suites at once, and this behavior's review lanes cannot see any of them | the defect stands, and costs the next reader a diagnosis |

---

## .the call, and why — at the time

**deferred, with a dream** (`2026_09_22.an-incomplete-dist-invalidates-the-whole-acceptance-tier`).

the SAFE/CLEAN test answers it, and it answers **no** on both halves:

- **SAFE?** 🔴 no. `jest.acceptance.env.ts` is the `setupFiles` entry for every acceptance suite, so
  a preflight added there is a change to the failure mode of the whole tier. a preflight that is
  slightly wrong — a path that is correct on this host and not in cicd, an artifact that is
  legitimately absent in one config — converts a green tier into a red one for all 136 at once
- **CLEAN?** 🔴 no. this behavior's diff is `boot/`, `manifest/`, `contract/cli/invokeRoles*`, and
  `blackbox/cli/roles.*`. the jest env is in none of them, so the repair would arrive in review
  lanes that have no basis to grade it

🟡 **and the third half of the fix is not even ours.** the summary that misdirects is rendered by
`git.repo.test`, which ships from `rhachet-roles-ehmpathy` — a reseed rather than a local repair
(`rule.always.scope-onetime-lessons-to-the-behavior`).

---

## .why the confidence is 84% rather than higher

two live doubts, and neither is about whether the defect is real:

1. 🔴 **the cause is unsettled.** whether `dist/contract/sdk.keyrack.js` went absent by a stale
   tree, a partial build, or a write that raced the runner was **not established**. a preflight is
   the right repair for all three, so the deferral does not depend on the answer — but a reader who
   later finds it is a *race* may judge that the preflight is insufficient and a lock is owed, which
   would make this row too narrow
2. 🟡 **"dirty" is an estimate of ripple, made alone.** the claim that a shared-setup throw is
   risky enough to defer is a judgment about blast radius, not a measurement of one. it could be
   that a `globalSetup` preflight is genuinely isolated and the CLEAN objection alone carries the
   deferral — in which case the row is right and its first reason is inflated

⇒ the 16% is those two, and the row is filed precisely so a council can overturn either.

---

## .where

- the dream: `.dream/2026_09_22.an-incomplete-dist-invalidates-the-whole-acceptance-tier.dream.md`
- the file the fix would touch: `jest.acceptance.env.ts:8`
- the pavement it would lift: `blackbox/sdk/*.realnode.acceptance.test.ts` — six suites that each
  already guard their own dist artifact with a `ConstraintError` that names `npm run build`
- the summary that misdirects: `git.repo.test` (`rhachet-roles-ehmpathy`)

---

## .the verdict, once ruled

_unruled._

---

## .see also

- `rule.always.fix-forward-under-scouts-honor` — the SAFE/CLEAN test this row applies
- `rule.always.catch-dreams-for-followups` — the dream the deferral owes, and which it has
- `rule.forbid.mechanism-inferred-from-outcome` — why doubt #1 stays open rather than closed by the
  most plausible cause
- `F20` — the round's other **dirty** defer-vs-repair on a shared walk, and the one whose deferred
  12% came true
