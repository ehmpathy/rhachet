# F6 — whether a wait on a peer's export is silent

- **fork** — (a) a waiter prints naught while a peer exports (`onWait: null`); (b) a waiter prints
  one stderr line on its first lost attempt, as `withRepoMutex` does (`ℹ another rhx process holds …`);
  (c) a waiter prints one line only once its wait passes a few seconds
- **taken** — (b). a waiter can sit behind a hung peer for up to two minutes (the hang guard), and up
  to three behind a killed one (the lease); a silent `rhx keyrack unlock` that long reads as a hang.
  the line prints once per wait: one human unlock that waits once prints one line. the line names the profile, never a value.
  in a jest burst each waiter prints one line, which is the cost of (b)
- **copy** — the line names the wait bound and the lease in plain words (`… up to 5 minutes (if the
  other process was killed, the wait ends on its own within 3 minutes)`), so a human behind a dead
  peer knows the wait ends on its own. one copy
  for a live and a dead holder: a waiter cannot tell them apart at its first lost attempt, and a split
  copy would need (c)'s timer. a holder in the same process reads as "another process" too; the op
  cannot see whose the key is
- **rework** — clean. one `onWait` arrow (`emitAwsProfileExportWaitNotice`) and the [case1] stderr
  assertion; (a) is the arrow set back to `null`, (c) a timer inside it
- **confidence 85%, low because** — a burst of 33 jest workers now prints up to 32 notice lines per
  run; whether that noise is worth the human's signal is the wisher's call
- **where** — `genAwsProfileExport` → `withDiskMutex({ onWait })`; `emitAwsProfileExportWaitNotice.ts`;
  [case1]
- **verdict** — taken (b) after the ergonomist lane read (a) as a hidden blocked state; open for the
  wisher
