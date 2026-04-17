# self review: has-questioned-assumptions

## assumption 1: PING command is sufficient to verify daemon health

**what do we assume without evidence?**
that a PING command will exercise the same code path that fails (getSocketPeerPid → ss lookup).

**what evidence supports this?**
the daemon verifies caller session on every command via `verifyCallerLoginSession`. PING would trigger this verification.

**what if the opposite were true?**
if PING didn't use verifyCallerLoginSession, it wouldn't catch the failure. but all commands use this verification — it's the security model.

**did the wisher say this, or did we infer it?**
inferred. the wish says "verify daemon health" but doesn't specify how.

**what exceptions exist?**
could bypass verification for PING. but that would defeat the purpose — we want to test the exact code path that fails.

**verdict: holds** — PING must use verifyCallerLoginSession to catch the failure.

---

## assumption 2: ss lookup failure is daemon's fault, not systemic

**what do we assume without evidence?**
that a fresh daemon will not have the same ss lookup failure.

**what evidence supports this?**
the failure happens when daemon state diverges from kernel state. a fresh daemon would have fresh socket, fresh inode.

**what if the opposite were true?**
if ss failure is systemic (e.g., ss command broken, permissions), fresh daemon would also fail. this would cause infinite restart loop.

**did the wisher say this, or did we infer it?**
inferred. the error message suggests stale daemon, but we haven't proven fresh daemon works.

**what exceptions exist?**
- ss could be absent or broken (rare, but possible)
- kernel could be in weird state (namespace issues)
- permissions could block ss

**mitigation:**
the vision already handles this: "fresh daemon also fails → propagate error (not a stale daemon issue)"

if health check fails on fresh daemon, we propagate the error instead of looped retry.

**verdict: holds** — but implementation must limit retries to prevent infinite loop.

---

## assumption 3: fresh daemon spawn will succeed after kill

**what do we assume without evidence?**
that kill of old daemon followed by spawn of new one will work.

**what evidence supports this?**
`findsertKeyrackDaemon` already has spawn logic. the daemon start is independent of the old daemon state.

**what if the opposite were true?**
if socket file persists after daemon dies, spawn could fail with EADDRINUSE. but spawn already handles this — it removes stale socket files.

**did the wisher say this, or did we infer it?**
inferred. the wish implies this flow but doesn't specify.

**what exceptions exist?**
- socket file locked by another process
- permissions on socket directory changed
- disk full (can't create socket file)

**mitigation:**
spawn already handles ENOENT and ECONNREFUSED. other failures would propagate as errors.

**verdict: holds** — spawn logic is robust.

---

## assumption 4 (hidden): we should kill the unhealthy daemon

**what do we assume without evidence?**
that the correct response to unhealthy daemon is to kill it and spawn fresh.

**what evidence supports this?**
the alternative (leave unhealthy daemon) means user commands continue to fail. kill and restart is the standard daemon recovery pattern.

**what if the opposite were true?**
could try to "heal" the daemon instead of kill. but there's no heal operation — the daemon is just a process with in-memory state.

**did the wisher say this, or did we infer it?**
wisher said "findsert a new healthy daemon if extant is unhealthy". this implies replacement, not heal.

**what exceptions exist?**
kill of daemon loses cached credentials. user would need to re-unlock. but if daemon is unhealthy, credentials are inaccessible anyway.

**verdict: holds** — kill and restart is correct.

---

## summary

all assumptions hold:
1. PING uses same verification path — catches the failure
2. ss failure is daemon-specific — fresh daemon has fresh socket
3. spawn succeeds after kill — spawn logic handles stale sockets
4. kill is correct response — no alternative for unhealthy daemon

one implementation note surfaced:
- must limit retries to prevent infinite loop if failure is systemic

no issues that block progress. ready to proceed.
