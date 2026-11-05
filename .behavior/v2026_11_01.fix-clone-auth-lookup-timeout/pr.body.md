closes #678

## what changes

- **the peer-cred lookup waits 60s** (was 5s). it keeps main's #649 design: `ss -x` names the peer inode, then a `/proc` scan finds the process that holds it. `ss` now runs with no shell and a 64 MiB read buffer. a kill at the bound, an overflow, an absent `ss`, a peer `ss` cannot name, and a peer that exits mid-lookup each fail with a named cause, not a generic `auth-denied` mystery
- **the auth gate bound sits above it.** `CLONE_AUTH_GATE_TIMEOUT_MS` = lookup + 5s = 65s (was 8s), so a slow lookup ends at the lookup, never at the gate first
- **a same-user `rhx clone say` on a loaded box is accepted.** the say prints `said to` with one calm leaf: `🟡 screen probe unanswered (a loaded box) — verified by transcript; no action needed`
- **a caller that hung up before the gate settled gets no keystrokes.** its frames are dropped, so a retry after a client wedge cannot type a say twice
- **a probe reply timeout reads `probe-unanswered`**, and its unreadable hint forbids a blind re-send of a say that was already delivered
- **rhachet-roles-ehmpathy 1.41.1**, with the peer role bumps; the init and alias snapshots move with their brief counts and hooks

## the clamp

a lookup slower than 5s and faster than 60s is accepted, red before the fix and green after:

- server grain: `genCloneSocketServer [case19]`, 9s `ss`
- cli grain: `clone.say.slowbox.realbrain [case1]`, 7s `ss`, against a real claude

the bite of each clamp is cited in `5.1.execution.from_vision.yield.md`.

## ⚠️ rollout — who gets `auth-denied`

the gate fails closed whenever the holder scan cannot name the caller:

- another unix user: its fds are unreadable to the clone, so no holder is found (proven in `clone.say.slowbox.realbrain [case2]` and `genCloneSocketServer [case21]`)
- root, for the same reason
- a same-user caller the scan cannot reach: another pid namespace, or a caller that hung up mid-dispatch. this fails closed by choice (F13); a truthful reason for it is #683

## deferred, each with its own issue

- #682 the 30s client wedge sits below the gate bound
- #683 a distinct reason for a caller the scan cannot name
- #684 abort the scan when the caller hangs up
- #687 a state `clone get` on a loaded box times out at 5s
- #688 a status line through the silent wait
- #704 a cross-user `clone get --what buffer` shows a false `peer-probe-blind` / re-enroll cause; the read is refused, and no row reaches the caller
- #686 (the keyrack daemon read its own pid) is resolved on main by #649

## 🟡 a gated red outside this PR

`clone.transcript-lag.realbrain` (A1) and `clone.screen-dogfood.realbrain` sit behind `BRAIN_LIVE_SCOPE=all` on main, so cicd skips them. run on demand with a live credential, A1 still fails: a busy real claude holds the second message, and the say reports `released`, never `enqueued`. this PR's diff leaves the verdict and the screen read untouched. the cause and the shape of the fix are caught in `.dream/v2026_11_04.fix.clone-say-enqueued-unreachable-on-current-claude.md`

## 🔴 two calls for the wisher

one peer lane (`enroll-verif-test-intent`) raised the same three points in four rounds: this PR moves extant test expectations beyond what the wish names. each was disputed against a fulcrum. if you rule for the revert, each rework is clean:

- **F14** (`.behavior/v2026_11_01.fix-clone-auth-lookup-timeout/.fulcrums/inventory.of=fulcrums.case=F14-two-extant-expectations-move-with-a-requirement.md`):
  - the new `probe-unanswered` reason replaces `feed-not-live`, whose "re-enroll" cure is false on a loaded box
  - the `feed-not-live` hint drops "retry". a retry on a delivered say types it twice, which `5.1 i006 r10` conceded as urgent
- **F17** (`...case=F17-unreadable-tree-takes-subbranches-on-the-lines-it-touches.md`): the `clone get` unreadable tree moves `cause:` / `fix:` to subbranches, per `rule.forbid.colons-in-stdout`. the copy text is unchanged

## why the 5.1 stone bought review budget

three concessions on 5.1 were graded `urgent`, each a nameable shipped harm:

- **i003 r9 b1**: the column-based `ss` parse misread a socket path with whitespace and failed open. main's #649 now reads the peer inode from the right of the line
- **i005 r10 b1**: a retry after a wedge could double a say
- **i006 r10 b1**: the "retry" hint on a delivered say

each is fixed and clamped by a test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
