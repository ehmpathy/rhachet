# self review r3: has-questioned-questions

deeper pass. are there questions I missed? are my answers sound?

---

## review of question 1: log on daemon restart

**my answer:** YES, log at INFO level

**is this sound?**
- INFO level appropriate for user-visible events
- DEBUG level for internal details (why health check failed)
- consistent with log practices in keyrack

**any counterarguments?**
- could argue for WARN since daemon restart is unusual
- but WARN implies actionable issue; daemon restart is handled automatically

**verdict:** answer holds. INFO is correct level.

---

## review of question 2: graceful shutdown vs spawn over

**my answer:** spawn over, no graceful shutdown

**is this sound?**
- extant code (`spawnKeyrackDaemonBackground`) cleans up stale sockets
- orphan daemon has no socket, can't receive commands, will eventually exit
- no data loss risk (daemon caches credentials in memory, but unhealthy daemon's cache is inaccessible anyway)

**any counterarguments?**
- orphan daemon consumes resources until it exits
- if many restarts, many orphans

**mitigation:**
- daemon has TTL on credentials; when credentials expire, daemon exits
- resource consumption is minimal (idle process)

**verdict:** answer holds. spawn over is simpler and safe.

---

## review of question 3: create PING command

**my answer:** create new PING command

**is this sound?**
- PING must verify caller session (per design decision)
- extant commands not suitable:
  - GET requires key arg
  - UNLOCK requires credentials
  - STATUS might work but doesn't verify caller (if it exists)
- PING is explicit: "am I healthy?"

**any counterarguments?**
- adds new command to daemon protocol
- maintenance burden

**mitigation:**
- PING is simple (no args, returns OK or error)
- single purpose = easy to maintain

**verdict:** answer holds. create PING.

---

## are there questions not yet asked?

reviewed vision for implicit questions:

| implicit question | triage |
|-------------------|--------|
| how do we measure "fewer failures"? | [answered] - observability via logs; not a separate metric needed |
| what if recovery fails repeatedly? | [answered] - propagate error after fresh daemon also fails |
| should we limit restart rate? | [answered] - one restart per findsert; if fresh fails, error out |

no questions absent from the vision.

---

## fixes applied

no issues found. all questions properly triaged.

| question | answer | why it holds |
|----------|--------|--------------|
| log level | INFO | user-visible event, not actionable WARN |
| graceful shutdown | no | extant code handles; orphan is safe |
| command | create PING | explicit purpose, must verify caller |
