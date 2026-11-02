# F6 — the brain-dir-boot journey stays whole as a smoketest

## .the fork

`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` runs one shared isolated HOME across ~12
steps (`genIsolatedClaudeHome`, `:212`). most of its real enrolls assert that a real claude LOADED a
memory file (sentinels via `askCloneForSentinels` at [t3] `:502`, [t3.1] `:705`, [t4] `:991`,
[t6] `:1175`, and via `claude -p` at [t1], [t1.1], [t1.3], [t8.1]). that is the memory-load seam,
which only a real claude proves. three of its enrolls assert rhachet behavior only:

- [t3.2] `:750` — a detached enroll into a no-credential HOME; asserts rhachet's handoff text
- [t5] `:1000` — makes the lifeguard actor; asserts `init` exit 2 and its stderr
- [t7.1] `:1235` — `clone get` returns no decoy; an empty-history snapshot

| option | cost |
|---|---|
| A. keep the journey whole, registered as a smoketest | three boots that ask no prompt — no inference, so no tokens |
| B. move [t3.2], [t5], [t7.1] onto the mock | each relies on state the journey's earlier steps built in the shared HOME; a cut rebuilds that state in a second suite, or swaps PATH mid-journey |

## .taken

A. the wish targets anthropic api calls, and these three boots make none. B buys no token saved at the
price of a split journey and a mid-journey PATH swap.

## .rework

clean — a later cut moves three when-blocks into a mock suite with a seeded fixture.

## .confidence

75%. it rests on "a boot with no prompt spends no tokens" — an assumption, not yet measured. 5.1
must measure it once (the anthropic usage for a journey run, or the boot's network calls); a boot that
does call the api turns this fulcrum to B.

## .where

`3.3.1.blueprint.product.yield.md` — `.the smoketest set, after`.

## .verdict

best-guessed.
