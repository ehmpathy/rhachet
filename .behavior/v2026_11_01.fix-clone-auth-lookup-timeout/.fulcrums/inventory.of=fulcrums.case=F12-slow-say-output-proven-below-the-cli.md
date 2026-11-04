# F12 — the slow-box say is proven at the server and `sayClone`, not by a real-brain cli snapshot

## .the fork

a level-3 reviewer (i005, enroll-impl-behavior-intent, items 4 and 6) asked for:

- an acceptance case in `blackbox/cli`: a real enrolled clone, a 7s fake `ss`, and a snapshot of
  the `rhx clone say` tree (`said to @:…` plus the `feed not live` note)
- a trace of what the cli prints while it waits on a slow gate, with a progress signal if silent

or prove the slow-box say where this PR changed behavior — the server gate — and leave the cli
render, which this PR does not touch, to its own snapshots.

## .taken

the second.

- this PR changes no cli code and no render. `rhx clone say` reaches the socket through `sayClone`,
  and `[case19]` drives the real server, real gate, real exec, and real `ss` (slowed) through that
  same `sayClone` to `{ delivered: true }` with the exact bytes on the child
- the tree a `delivered` say renders is already snapped by the extant clone-say acceptance suites
- 🔴 one premise did not hold: a slow `ss` also blinds each observe probe (1s reply bound), so a
  delivered say with no transcript rise ends `unreadable feed-not-live`. that branch was always
  post-write, yet its hint said "retry", and a retry doubles the say. cured in the copy, not the
  harness: the hint now forbids a blind re-send and names `clone get`
  (`computeCloneSayReport.ts`, row clamped in `computeCloneSayReport.test.ts`)
- a real-brain acceptance case would need the fake `ss` on the PATH of a spawned clone daemon, a
  claude brain, and a 7s+ wait per run — a new harness seam for an unchanged render
- the wait itself (5s probe + 9s gate on a 9s `ss`) is the observe loop's extant behavior; a
  progress signal there is a cli feature, not this bound fix — filed as #688

## .verdict — reversed in i007, half

- **the acceptance case: reversed.** two premises above fell. the PR does change a cli render (the
  `probe-unanswered` leaf and hints, i007), and the harness seam was cheap: the fake `ss` only has to
  be on PATH when the stub-brain PATH is read. so `rhx clone say` on a 7s `ss` is driven through the
  cli and both trees are snapped (i007 r10 blocker.1, conceded): the success tree against a real
  claude in `blackbox/cli/clone.say.slowbox.realbrain.acceptance.test.ts [case1]`, and the busy
  `unreadable` tree with a stub brain in `blackbox/cli/clone.say.slowbox.integration.test.ts [case2]`
  — integration by grain, since a stub brain is no acceptance dependency
- **the wait signal: holds.** the slowbox run measures the cost — 13.7s of silence before
  `said to` (`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-01T23-59-59Z.stderr.log`).
  that silence predates this PR (a slow-box say always waited silently, up to its 30s window); this PR
  turns a fast false refusal into a slower true success. a status line is a cli output contract — its
  stream, threshold, and tty form — with stderr snapshots across the clone-say suites to move, so it
  fails CLEAN and ships as its own PR, #688

## .rework

clean. an acceptance case is additive; a wait signal is a cli change with its own snapshot.

## .confidence

75% — the render is unchanged code, but a reviewer may still want the human-visible tree pinned on
a slow box.

## .where

- `src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts [case19]`
- `blackbox/cli/` (the extant clone-say acceptance suites)
