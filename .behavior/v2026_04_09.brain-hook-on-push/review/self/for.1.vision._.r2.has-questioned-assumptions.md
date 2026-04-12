# self-review: has-questioned-assumptions

## context

review of hidden assumptions in the pty wrapper + daemon + socket vision.

---

## assumption: node-pty will work for this use case

**what do we assume without evidence?**
that node-pty can spawn claude, hold the pty master, and accept writes that reach claude's stdin.

**what evidence supports this?**
- node-pty is used by VS Code terminal, hyper, and other production terminal emulators
- pty master/slave is standard unix mechanism
- no evidence yet that it works specifically with claude cli

**what if the opposite were true?**
if node-pty doesn't work, we'd need alternative: direct pty syscalls, or different approach entirely.

**did the wisher say this?**
no. wisher mentioned hooks and channels. pty wrapper emerged from research as better path.

**verdict:** assumption is reasonable but **must be validated by POC**. this is why poc.pty-wrapper exists.

---

## assumption: claude will respond to stdin injection while idle

**what do we assume without evidence?**
that claude cli, when idle at prompt, will process input written to its stdin via pty master.

**what evidence supports this?**
- this is how terminals work — all input on stdin is processed
- claude is a readline-style repl
- no direct evidence yet

**what if the opposite were true?**
if claude doesn't respond to pty stdin writes, the entire approach fails. would need to investigate claude's input handler.

**verdict:** assumption is reasonable but **must be validated by POC**. critical path.

---

## assumption: file-based `.comms/` is sufficient for v1

**what do we assume without evidence?**
that filesystem as message bus is good enough for local single-machine use.

**what evidence supports this?**
- filesystem is simple, portable, debuggable
- can `ls` and `cat` messages manually
- no external dependencies

**what if the opposite were true?**
if filesystem proves inadequate (race conditions, latency), could switch to sqlite or redis. but for v1 POC, filesystem is simplest.

**did the wisher say this?**
wisher mentioned `.agent/.comms/$topic/` explicitly. file-based was the stated design.

**verdict:** assumption holds. wisher-specified and appropriate for v1.

---

## assumption: daemon should be separate from wrapper

**what do we assume without evidence?**
that centralized daemon that watches `.comms/` is better than each wrapper with its own watcher.

**what evidence supports this?**
- single watcher vs N watchers
- centralized retry logic
- separation of concerns

**what if the opposite were true?**
wrapper could watch `.comms/` directly. simpler deployment (one process). but harder to add cross-actor features later.

**verdict:** assumption is a design choice, not requirement. could revisit if daemon proves complex. for now, separation is cleaner.

---

## assumption: role filter syntax is sufficient

**what do we assume without evidence?**
that `+mechanic,-driver` syntax covers needed filter patterns.

**what evidence supports this?**
- matches extant `rhx enroll` pragma
- covers: has role, excludes role, exact match
- wisher specified this syntax

**what if the opposite were true?**
complex filters (AND/OR expressions, wildcards) might be needed. but v1 can start simple.

**verdict:** assumption holds. wisher-specified syntax. can extend later if needed.

---

## assumption: unix sockets are appropriate IPC

**what do we assume without evidence?**
that unix sockets are the right IPC mechanism for daemon-to-wrapper communication.

**what evidence supports this?**
- standard unix pattern
- works with node.js net module
- bidirectional capability

**what if the opposite were true?**
alternatives: named pipes (less flexible), HTTP (overkill), shared memory (complex). socket is middle ground.

**verdict:** assumption holds. socket is standard choice.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| node-pty works | validate | POC required |
| claude responds to stdin | validate | POC required |
| file-based .comms/ | holds | wisher-specified |
| separate daemon | design choice | revisit if needed |
| role filter syntax | holds | wisher-specified |
| unix sockets | holds | standard choice |

two critical assumptions must be validated by POC before we proceed to production implementation.
