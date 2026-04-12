# self-review: has-questioned-requirements

## context

the vision pivoted from poll-based hooks to pty wrapper + daemon + socket. reviewing whether each requirement holds.

---

## requirement: enable push notifications into brain clis

**who said this was needed?**
the wish document. vlad wants clones to receive external notifications without human intervention.

**what evidence supports this?**
usecases are concrete: slack notifications, PR review alerts, peer clone coordination. these are real workflows where humans currently act as message bus.

**what if we didn't do this?**
humans remain the bottleneck. clones stay deaf. no autonomous coordination.

**is the scope right?**
yes. v1 focuses on local single-machine push. distributed is explicitly out of scope.

**verdict:** requirement holds. core value proposition is clear.

---

## requirement: pty wrapper instead of poll

**who said this was needed?**
emerged from research. opencode-queue can only drain on idle — can't wake terminated sessions. poll-based approach has latency and can't inject into active sessions.

**what evidence supports this?**
- poll can't write to stdin of a process it didn't spawn
- pty master has direct write access to slave's stdin
- this is how terminal emulators work

**what if we didn't do this?**
we'd be limited to:
- poll latency (seconds vs milliseconds)
- no injection into active sessions
- can't wake terminated sessions

**could we achieve the goal simpler?**
claude channels exist but are research-preview only. pty wrapper is the simpler portable solution that works with any brain cli.

**verdict:** requirement holds. pty wrapper is necessary for the capabilities we want.

---

## requirement: daemon process

**who said this was needed?**
need something to watch `.comms/` and deliver to actors. could be built into wrapper, but centralized daemon is cleaner.

**what evidence supports this?**
- single watcher for all topics vs N watchers per actor
- daemon can manage socket connections centrally
- separation of concerns: wrapper handles pty, daemon handles routing

**what if we didn't do this?**
each wrapper would need its own file watcher. more complexity per wrapper. harder to add features like retry logic.

**could we achieve the goal simpler?**
wrapper could watch directly, but daemon centralizes concerns. worth the separate process.

**verdict:** requirement holds. daemon is cleaner architecture.

---

## requirement: role filter syntax

**who said this was needed?**
wish document mentions filtering by role to route messages to specific clones.

**what evidence supports this?**
- foreman shouldn't receive driver messages
- mechanic shouldn't receive ops alerts
- need to narrow broadcast to relevant actors

**what if we didn't do this?**
all clones receive all messages. noisy. clones waste tokens on irrelevant notifications.

**could we achieve the goal simpler?**
the `+mechanic,-driver` syntax is already minimal. matches extant `rhx enroll` pragma.

**verdict:** requirement holds. role filtering is essential for targeted delivery.

---

## requirement: unix socket for IPC

**who said this was needed?**
need communication channel between daemon and wrapper.

**what evidence supports this?**
- standard unix pattern for process communication
- bidirectional if needed later
- works with node.js net module

**what if we didn't do this?**
alternatives: named pipes (less flexible), shared memory (complex), HTTP (overkill).

**could we achieve the goal simpler?**
socket is already the simple choice for this use case.

**verdict:** requirement holds. socket is appropriate IPC mechanism.

---

## summary

| requirement | verdict | notes |
|-------------|---------|-------|
| push notifications | holds | core value prop |
| pty wrapper | holds | necessary for capabilities |
| daemon | holds | cleaner architecture |
| role filter | holds | essential for routing |
| unix socket | holds | appropriate IPC |

no requirements need removal or modification. the pivot from poll to pty wrapper was the right call — it enables capabilities the original approach couldn't deliver.
