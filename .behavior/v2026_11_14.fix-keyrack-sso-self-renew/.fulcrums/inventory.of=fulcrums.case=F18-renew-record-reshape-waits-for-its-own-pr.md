# F18 — the renew record's reshape waits for its own pr

## .the fork

i004 r011 named three reshapes of the renew record and its wire:

- nitpick.1 — fold `renewOneEntry`'s five outcomes into one pure transition, `asDaemonRenewEntryAfterOutcome`
- nitpick.3 — send the renew `source` on `KeyrackDaemonUnlockRenewal`, and keep identity + source + expiry in the record rather than the whole grant
- nitpick.6 — an explicit `isExpired` on the status row; the record owns `inflight`; the sdk gate injected rather than skipped under `AWS_SDK_MOCK`; one mech adapter map

i001 r011 named four more of the same reach: a mech-owned lapse text (#2), a `mech → renewer` registry (#4), one store for the grant and its renew facet (#8), and a bound on how long a mark keeps the daemon up (#9). each moves the adapter contract, the store, or the daemon's lifetime, so each rides the same pr.

each one is sound. the fork: land them in this pr, or in a pr of their own.

## .taken

a pr of its own. each one changes the daemon wire or the record shape, and the daemon is long-lived: a wire change in the same pr as the renew widens the skew surface this pr just clamped (the `renewable` reply and its cue). the renew behavior is proven as it stands — unit, acceptance (renew, halt, cure, lapse, expiry, cure from lapse), and the live two-expiry proof.

## .rework

dirty for this pr: the record shape and the unlock wire are read by the tick, the status rows, the unlock, and the acceptance journey; a reshape now moves every one of them under a review that is otherwise closed. clean as its own pr.

## .confidence

80%. the transition (nitpick.1) alone is local and could land here; it is held with the rest so the record reshapes once, not twice.

## .where

`src/domain.operations/keyrack/daemon/svc/src/domain.operations/renewDaemonGrantsDue.ts` · `daemonRenewRecord.ts` · `KeyrackDaemonUnlockRenewal` · `getOneGrantRenewal.ts` · `getOneAwsSsoSessionProof.ts`

## .the work

caught as a dream: `.dream/v2026_11_20.refactor.keyrack-renew-record-reshape.md`

## .verdict

open, for the wisher.
