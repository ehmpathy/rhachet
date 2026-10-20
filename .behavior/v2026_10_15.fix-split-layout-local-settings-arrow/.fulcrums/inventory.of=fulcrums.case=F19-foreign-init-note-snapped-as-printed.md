# F19 — the mechanic init's false note is snapped as it prints, and fixed upstream

## .the fork
- A: snap the mechanic permissions init's stdout as `rhachet-roles-ehmpathy@1.39.5` prints it, and owe
  the reword to that repo
- B: mask or strip the note in this repo's snapshot until upstream rewords it
- C: patch the note here (a vendored init, or a `node_modules` edit)

## .taken = A, and why
- the text is a foreign package's stdout; rhachet only runs the init and passes its lines through. a
  snapshot that shows what a human sees is the honest lock, blemish and all
- B hides from the reviewer the exact line a human reads, so the blemish ships unseen — the opposite of
  what `rule.forbid.snapshot-visual-blemishes` asks a snapshot to do
- C forks a supplier's init from a consumer
- the reword is caught (`dreams/v2026_10_19.reseed.mechanic-permissions-note-misreads-the-split-layout.md`)
  and pushed upstream as the human; the radio holds it while `radio.uses` is blocked globally
  (`appendix/radio.task.mechanic-permissions-note.md`). rhachet resnaps when a release lands

## .rework = clean
one resnap of `init.incremental` once the upstream release lands.

## .confidence = 80%, low because
the wisher may hold the merge until upstream ships.

## .where
`blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` [case1]

## .correction (2026-10-20, pr #633 ci)
the note was never printed for the test's repo. the mechanic init prints it only when
`CLAUDE_CONFIG_DIR` is set, and the suite inherited that var from the runner, itself a claude
clone; the note named the runner's own actor dir. ci has no such var and printed no note, so the
snapshot failed there. the invoker now strips `CLAUDE_CONFIG_DIR` beside the clone identity vars
(`asEnvWithoutCloneIdentity`), and [case1] is resnapped without the note, as ci prints it.

the reword upstream still holds for a human who runs `rhx init` inside a clone, but no snapshot
here locks the note any more, so this repo no longer waits on it.

## .verdict
settled by the correction above — no merge hold needed for this repo.
