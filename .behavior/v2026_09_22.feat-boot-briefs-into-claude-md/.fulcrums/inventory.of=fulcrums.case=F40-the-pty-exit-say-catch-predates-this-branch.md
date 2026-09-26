# F40 — the pty `exit 3` say catch predates this branch

## .fork

peer r2 (failhides) nitpick.1 flagged `.catch(() => undefined)` on the `exit 3` say in
`genBrainCliPtyClone.integration.test.ts`, and asked that it be narrowed to the teardown race.

| option | |
|---|---|
| a. hold | the line predates this branch, and the test already fails if the say never lands |
| b. narrow | accept only the error class a mid-ack teardown throws; rethrow the rest |

## .verdict — TAKEN (a), 80%, rework clean

- `git diff main` on the file shows this branch touched only the brainDir inputs and removed a
  `CLAUDE_CONFIG_DIR` before/after block; the catch is `main`'s
- the `then` asserts the clone exits with code 3. a say that failed to deliver cannot produce
  that code, so a broken dispatch fails the test — the reviewer notes as much: *"this is not a
  fake green"*
- (b) needs the exact error a pty teardown raises mid-ack, which varies with the race; a guess
  there would turn a stable test flaky. to measure it costs repeated real-pty runs, off the scope
  of a boot transport change

## .why the confidence is not higher

a narrowed catch would make a different say fault read as that fault rather than as a wrong exit
code. that is a diagnosis gain, not a correctness gain.

## .rework

clean: a narrowed catch is a one-line test edit.

## .where

- `src/domain.operations/clone/pty/genBrainCliPtyClone.integration.test.ts` — the `exit 3` say
