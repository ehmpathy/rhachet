# F22 — the key leaf colons move as one, in their own pr

## .the fork

i001 r001 blocker.1: `expires in: 52m` is a colon separator on stdout, and this branch rewrote the code that emits it (the leaf moved into a `StatusLeaf` object; its bytes did not change).

- **a** — repair `expires in:` here, alone
- **b** — repair all three key leaves (`env:`, `org:`, `expires in:`) in both renders, here
- **c** — repair all three in both renders, in a pr of their own

## .taken

c. a mixes two forms in one key branch, which the rule's own aim (one separator per relation) forbids. b reaches `emitKeyrackKeyBranch` (unlock and get output) and 18 snapshot files, 16 of them acceptance suites outside the renew, several of which need live vault keys this host lacks. that fails the CLEAN test of fix-forward. the rule names an extant colon line that a change did not otherwise touch as no violation; the leaf's bytes are extant, and only its container moved.

measured (i003): `expires in:` sits on 55 snapshot lines, and `unlock` prints the same leaf (`emitKeyrackKeyBranch.ts:130`, `└─ expires in: Nm`). a repair in the status render alone would print one fact two ways across two commands; a repair in both moves the unlock snapshots too, which is the sweep F22 sends to its own pr.

## .rework

dirty for this pr (16 unrelated acceptance snapshots); clean as its own pr.

## .confidence — 80%, why not higher

the reviewer reads "the line moved into an object" as "the line was touched", and that read is defensible.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `src/domain.operations/keyrack/cli/emitKeyrackKeyBranch.ts`

## .the dedicated pr

5.3 i001 r001 blocker.1 and r006 blocker.1 raise it again (r006: the status branch mixes `key: value` with the renew's `key = value`). measured 2026-11-21: the `key: value` leaves (`env:`, `org:`, `vault:`, `expires in:`) sit on 378 lines across `src` and `blackbox`, 56 of them `expires in:` snap lines. that is a contract change to every keyrack key render, so per `rule.forbid.deferrals-short-of-a-dedicated-pr` it is its own pr, planned:

- **title** — `fix(keyrack): key leaves drop their colons, one separator per relation`
- **diff** — `emitKeyrackKeyBranch.ts`, `asKeyrackStatusKeyBranch.ts`, `asKeyrackKeyReachLeaves.ts`: each `key: value` leaf becomes `key = value`. plus each keyrack snap that holds one, resnapped by path, and the renew journey's `expires in` mask
- **bound** — no other render, no text change beyond the separator, no wire change
- **order** — opened once #759 merges, so its resnap meets the renew snaps once

the detail stays in `.dream/v2026_11_21.chore.keyrack-key-leaves-drop-their-colons.md`.

## .verdict

open — to the commander at the pr.
