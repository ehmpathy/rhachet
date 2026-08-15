# domain.term: accrual

term.chosen   = accrual
term.kind     = noun            # the cost hazard of unbounded clone creation; a domain concept ([...noun])
term.synonyms.forbidden:
- buildup
- pileup
- leak
- drift

## .what

**accrual** is the **cost hazard of unbounded clone creation** — the way a bare `rhx enroll` (which is
create-always by design) lets a **cron that retries** stand up billed brains one after another, so the
live-clone count *accrues* without bound until the credit drain compounds. it is the money-cost twin of
the wish's headline caller class ("crons"): each retry mints a fresh live clone, and the accrual is the
sum of those still-billed brains.

the domain answers accrual with a **soft, visible warn** (never a hard cap — that would fight the wish):
- `computeCloneAccrualWarn` — the pure classifier: `{liveCount, threshold} → {warn, liveCount}`
- `CLONE_ACCRUAL_THRESHOLD` — the soft threshold (a council knob) the count is measured against
- `getOneCloneLiveCountForActor` — the impure live-count leaf the classifier reads
- `asCloneAccrualWarnLine` — the single-owned transformer that renders the advisory text a human sees

so accrual is the *hazard*; the accrual-warn is the *status-feedback* that makes the hazard visible
before it compounds (`rule.require.status-feedback`).

## .refs

- src/domain.operations/clone/computeCloneAccrualWarn.ts            (the pure accrual classifier)
- src/domain.operations/clone/asCloneAccrualWarnLine.ts             (renders the advisory text)
- src/domain.operations/clone/getOneCloneLiveCountForActor.ts       (the live-count leaf)
- src/utils/cloneAccrualThreshold.ts                                (CLONE_ACCRUAL_THRESHOLD)
- src/contract/cli/invokeEnroll.ts                                  (emits the accrual warn on enroll)

## .reason

see the ref-level cluster beside this choice:
- `term=accrual._.choice.reason.md` — etymology, why not buildup/pileup/leak/drift, the soft-warn-not-cap axis
