# F37 · the 5.3 i002 polish points kept as they are

## .the fork

- **a.** keep each point below as it stands, with its reason
- **b.** take each one in this pr

## .taken = a, per point

| point | kept because |
|---|---|
| r10.n1 · `rhx enroll` prints drift faults with no wire test | the renderer is snapped (`asBootDriftFaultLines`); the enroll loop only prints what `setBrainDirBoot` returns, and the init path that shares the fault set is clamped at integration (`syncAndReportBrainDirBoots` [case4]) |
| r10.n3 · the prune apply tree is snapped only at unit | tree and json are built from one view (`asClonePruneView`); the unit snap holds the tree, acceptance holds the plan tree and the apply json; an apply consumes its state, so a second apply in the same scene sees none |
| r10.n4 · init's `✗` and `🟡 outside` rows snapped at the renderer | the rows are one renderer's output; the wire is snapped for the live-clone row in `init.delta-live` and `enroll.acceptance` |
| r10.n5 · the non-tty resume line is a `toContain` | the pty twin [t5b] snaps it; the non-tty line is the same string |
| r10.n6 · the live `/compact` journey did not run | it runs under `BRAIN_LIVE_SCOPE=all` (F33); the mechanism is proven live by `rhx boot.compact.probe --door add-dir`, exit 0, cited in the yield |
| r10.n7 · no single journey composes role hook → init → nudge | each link is proven at its own grain (`syncOneRoleHooksIntoOneBrainRepl` snap, `clone.boot.drift.acceptance` nudge); no role in this repo declares the hook yet (F2) |
| r11.4 · the nudge's escape row and "naught" | the escape row is the clone's own check; "naught" is this repo's word for none (the gerund hook forbids its usual peer) |
| r11.5 · "respawn" names no command | how a clone is respawned depends on how its enroller birthed it; the error hints now name `rhx enroll` |
| r11.6 · `sha256=<h>` beside a bare `drift = <h>` | the two are different things: a revision dir name, and a hash of the drift file, which has no dir |
| r11.7 · `[t1b]` states its suggestion three times | the text is the shared clone-address parser's, owned outside this pr |
| r11.8 · sliced snapshots in the editor journey and resume line | the slice is the row under test; the full trees are snapped elsewhere |
| r12.n1–n4 · daemon teardown, probe runner, help colons, prune hint | each is named as no loss by the reviewer itself: teardown only, a runner change with the same asserts, `rule.forbid.colons-in-stdout`, and a hint that now names what the prune reaps |
| i004 r10.n1 · `outside: true` never runs through the verb | the field is one boolean the reader computes (`asBootDelta` [case4] proves it on a real render); the verb only prints it, and its tree and json shapes are snapped at unit |
| i004 r10.n3 · `[t0]` and `[t3c]` check with `toContain` | `[t0c]` snaps the whole stderr frame of the same refusal family; the two cases assert the one row each is about |
| i004 r11.1 · the temp file name in the fs cause | the cause is the os errno text, kept verbatim so a human can search it; the hashes are now masked per revision (`$HASH1`, `$HASH2`) |
| i004 r11.2 · prune json `count` counts clones only | a rename moves a json contract a cron reads; the revisions-only plan and apply are now snapped (`clone.prune` [case6][t1]), so the shape is visible |
| i004 r11.4 · the errno message names the path twice | it is node's own `EACCES` message, kept verbatim; a split into code and path would be a second error shape for one fault |
| i004 r11.5 · the prune tree has no label over the clone rows | the clone rows are the primary result and sit at the root as they did before this pr; only the new revisions group is labeled |
| i004 r11.6 · the json `outside` field has no stated sense | the tree row names it in full beside the field, and a rename moves a json contract shipped in this pr's own drift verb |
| i004 r12.8 · prune `plan:` and `pruned:` lost their colons | `rule.forbid.colons-in-stdout` forbids the colon as a separator, and the repo-rules reviewer asked for exactly this repair |

## .rework = clean

each point is one file and its snap; no contract moves.

## .confidence = 80%, why

each point is polish, not shipped harm; a reviewer may weigh parity higher than this does.

## .where

the files each point names. answers 5.3 i002 nitpicks on r10, r11, r12.

## .verdict

owed — a council rules at the close.
