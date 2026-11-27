# F36 — the renewal leaf is one state word

## .the fork

#759 r4696100133, r4696104937, r4696113871: the status tree carried a lapse subtree (cause, fix, command, browser note), a halt subtree (cause, error headline, full-error command, fix, prune), an at-cap subtree, and a `renewed = Nx` count. the commander asks to cut every line a human does not need.

- **a** — one leaf, `renewal = on | off | lapsed | halted`; an expired key reads `expired` alone; the count, the error, and the cause stay in `--json`
- **b** — keep one cause line under `lapsed` and `halted`
- **c** — `renewal = in <IsoDuration>` (the commander's second option)

## .taken

a. the state word names why no renew will come (`lapsed`, `halted`) or that none is owed (`off`), and the cure for each is the same unlock a human already knows. the wish asks that status show the renew and any lapse; `renewal = lapsed` shows it in one leaf. once the key has expired, the commander rules `expired` sufficient. the wire carries the same four words, so the render maps naught.

## .rework

clean: one leaf producer in `asKeyrackStatusKeyBranch`, its caselist, and a resnap.

## .confidence — 70%, why not higher

a halt whose cause lives in the daemon's env (no `aws` on its PATH) is cured by a prune, not an unlock; that cue now lives only in `--json`.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/asDaemonStatusKey.ts`

## .verdict

open — to the commander at the pr.
