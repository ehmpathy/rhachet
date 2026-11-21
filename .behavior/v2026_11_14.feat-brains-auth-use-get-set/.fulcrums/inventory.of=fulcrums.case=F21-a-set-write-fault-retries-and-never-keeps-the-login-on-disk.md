# F21 — a `set` write fault retries the keyrack write; the new login never stays on disk

> raised by the i005 seams dream (shape item 8); best-guessed.

## .the fork

after the human completes the browser login, `set` files the new refresh token in the keyrack. if
that write faults, the login exists only in the temp config dir the cli wrote it to.

options:

- A. retry the write a few times at the park pace; on a last fault, fail loud as a malfunction that
  says naught was filed, and remove the temp dir as always (today)
- B. keep the temp login dir, print its path, and let the human retry from it (the dream's shape)

## .taken

A — B leaves a live refresh token in a plain file under `/tmp` past the process, readable by any
process of the same user, for as long as the human takes to act. a keyrack fault is most often
transient (a daemon restart, a lock held), which a retry absorbs. the cost of A on a hard fault is
one more browser login.

## .rework

clean — the retry is one helper (`setLoginFiled`) inside `setBrainAuthAccount`; B is a change to its
final cleanup and its error hint.

## .confidence — 85%

## .where

`src/domain.operations/brain/auth/account/setBrainAuthAccount.ts` (`setLoginFiled`) ·
`setBrainAuthAccount.integration.test.ts` [case9]

## .verdict

best-guessed. if the commander prefers B, it is a clean rework.
