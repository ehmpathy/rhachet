# F5 — the async mirror trades memory for a live loop

## .the fork

the cure makes the attended daemon's stdout tty handle async, so a chunk the pane cannot take yet
queues in node instead of a block of the loop. two questions follow:

1. **behind a slow pane, may the queue grow without a bound?** — or should the mirror drop or
   coalesce chunks past a high-water mark
2. **when `flush` times out on a frozen pane, should the handle go back to sync?** — or stay async

## .taken

1. **no bound.** the queue holds only the brain-cli's own redraw output, whose rate is the tui's
   repaint rate, and a pane that is slow (not dead) drains it. a drop or coalesce would tear the
   human's screen — the fidelity the sync write gave for free — and a coalesce needs a screen model
   in the mirror. a dead pane ends the clone through `flush`'s bound and exit
2. **stay async.** on the timeout path the pane is frozen by definition. a sync handle would block
   the next write to it, and with it the exit the bound exists to protect. the clone is about to
   exit, so the process-wide mode does not outlive it in any way a reader sees. on the callback path
   the queue is empty, so sync mode is restored there

## .the harm the bound accepts

a pane frozen past the 2000ms bound at the clone's exit drops what still queues — and the brain-cli's
last frames hold the leave-alt-screen, cursor-show, and mouse-off sequences. that human's shell is
left garbled until they run `reset`. the sync write delivered those frames, at the cost of an exit
held for as long as the pane stayed frozen. the bound picks a clean exit over a clean screen for the
rare pane that is frozen at that moment; a pane that is slow but alive drains within the bound
(case2). a terminal-reset write at the bound would itself queue behind the frozen pane, so it cures
naught on the path where the harm lands.

the acquire sits after every host wire that can throw, and the release runs last in `finalize`,
after the socket is closed and unlinked — so a failed enroll never leaves the mode async, and a
signal in the drain window leaves no orphan socket.

## .rework

clean. a high-water mark is a local change inside `genPtyCloneHostFromProcess.writeOut`; a restore
on the timeout path is one line in `flush`. no caller depends on either choice.

## .confidence — 80%

measured: behind a pane frozen past the flush bound, `flush` settles at its bound (about 2010ms) and
the process exits while the pane is still frozen — `genPtyCloneHostFromProcess.integration.test.ts`
[case3]. red with the bound lifted (`flushMs` 4264, held until the pane thawed).

a long-lived clone behind a pane that is slow for minutes has not been measured; its memory curve is
the open part.

## .where

`src/domain.operations/clone/pty/genPtyCloneHostFromProcess.ts` (`writeOut`, `flush`)
