# F34 — the renew leaf keeps its state and count labels

## .the fork

5.3 i002 r011 nitpick.2: one renew slot reads `renew = on`, `renewed = Nx`, or `renew = off`. `on` / `off` may read like a toggle a human could flip.

- **a** — one label for the slot, e.g. `renews = auto` · `renews = N` · `renews = stopped at cap`
- **b** — keep the extant labels

## .taken

b. each label names a different fact: whether the daemon will act (`renew = on` / `off`), or how often it already has (`renewed = Nx`). one label over both would fold a state and a count into one word. `off` never stands alone: it carries the cap leaf and its unlock command beneath it, so a reader is told why it is off and how to move it. the labels are already in the vision's demos (case 1, case 6) and in both snap files, so a rename is a contract change the wisher reads at the pr.

## .rework

clean: three string literals in `asRenewLeavesHead`, their asserts, and a resnap.

## .confidence — 75%, why not higher

the "a toggle the human could flip" read is real for a first-time reader, and no measured reader has shown which side of the fork reads faster.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts` `asRenewLeavesHead`

## .verdict

ruled by the commander at #759 (r4696113871, 2026-11-25): `renewal = on` is the right amount of information. the count leaf goes, and the slot reads `renewal = <state>` (see F36).
