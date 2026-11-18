# fulcrum F10: each moved trace line keeps its words; the wedged say stays proven below acceptance

## .the fork

the l3 reviewers asked for three changes past the wish, each graded `[nitpick][better]`:

1. reword the daemon's log lines to one shared prefix, drop the slug jargon in the write-fault
   line, and say "all are in" when the fallback kept every line
2. add a stall class to the stall line (`class=` or a decode in a hint), so a log reader need not
   read `loop active` against the drift themselves
3. add an acceptance snapshot of a wedged `clone say`

- **a.** do all three in this pr
- **b.** keep each moved line's words, keep the stall line's three measures as its whole
  contract, and keep the wedged say proven at the unit and live-socket grains

## .taken — b

- the wish moves lines from the pane to the log, and keeps the stall line "with its drift". a
  reword of lines this pr only moved changes what an operator's grep already finds, a contract
  change the wish did not ask for, and one each line's own owner should make
- the stall line's class is read from its three measures (vision case=2: `loop active` near the
  drift is self-held, both far below is a starved loop). a `class=` token is a derived field
  stamped into a log line, which commits the daemon to one decode rule; the measures stay true
  if that rule is refined
- the async mirror's exit drain is proven where it can be watched: `genPtyCloneHostFromProcess`
  [case2] (every chunk reaches a still pane, in order, before exit) and [case3] (a frozen pane
  never holds the exit), both a real host in a real pty child. an acceptance scene whose stub
  brain exits would add the cli around it, and no assert the host suite lacks
- a wedge needs a live socket that never acks. the live-source twin already exists:
  `genCloneSocketServer.integration` [case5] drives a real dispatch against a real socket that
  never answers, and snaps the headline and hint it emits. an acceptance twin would only add a
  ~30s bound to the suite

## .rework — clean

each is self-contained: a copy change in its owner, a field in `genCloneLoopLagWatch`, a scene
in `blackbox/`. none is depended on by this pr.

## .confidence — 80%

why not higher: a uniform prefix would make the log easier to grep, and the reviewers raised it
in good faith; the wisher may want it here.

## .where

stone 5.3.verification, peer review i004: r011 nitpick.6 (words), r011 nitpick.7 (stall class),
r010 nitpick.2 (wedged acceptance snap); i005 r010 nitpick.1 (exit-drain acceptance journey).
