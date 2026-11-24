# F29 — the cap end reads as the expiry of today

## .the fork

i004 r010 blocker.3: status never shows the renew horizon, and past its cap a key simply leaves status, which a human cannot tell from a crash.

- **a** — add a `renews until <time>` leaf, and keep a short `ended at its cap` trace past the cap
- **b** — keep the cap end as the approved vision states it (case 6, c8): past the cap the key is gone, as it would be today; the `at its cap — ends at expiry, unlock to extend` leaf names the end before it lands

## .taken

b. the approved vision fixes what a human sees at the cap ("the key is gone, exactly as it would be today"), and F12 holds that an approved vision is not reworded under a later stone. a trace that outlives its grant is a new record kind, which is the renew record reshape F18 sends to its own pr; and the horizon's worth turns on F1's cap rule, still open.

## .rework

clean: one leaf from the renew entry's `capAt`, and a trace entry the cap sweep keeps for a short span; no caller hardened against the absence.

## .confidence — 70%, why not higher

on the proof host the role session runs ~12h, past the 9h default cap (F7), so there the cap does bite before the portal ends, which the vision's case 6 assumed it would not.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord.ts`

## .verdict

open — to the commander at the pr.
