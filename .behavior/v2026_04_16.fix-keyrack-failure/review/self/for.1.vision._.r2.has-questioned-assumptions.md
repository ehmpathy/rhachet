# self review r2: has-questioned-assumptions

deeper pass. what did I miss in r1?

## hidden assumption: PING must verify caller session

**what do we assume?**
that the PING command will use `verifyCallerLoginSession`, same as other commands.

**why might this not hold?**
we could implement PING to skip verification — a "dumb echo" that just proves the process is alive.

**what if opposite were true?**
a dumb PING would NOT catch the ss lookup failure. the daemon could PONG successfully, but still fail on UNLOCK because that command does verify.

**verdict: design requirement surfaced**

PING MUST call verifyCallerLoginSession. this is not automatic — it must be explicitly implemented this way.

**action:** update vision to clarify: "health check must exercise same verification path as real commands"

---

## hidden assumption: one retry is sufficient

**what do we assume?**
that if fresh daemon also fails health check, we should propagate error.

**why might this not hold?**
could be transient issue that requires multiple retries. or could need backoff.

**what if opposite were true?**
infinite retry loop would hang the CLI. but zero retries (current plan) might fail on transient issues.

**verdict: holds but clarify**

one retry is correct for this failure mode:
- if old daemon fails PING → spawn fresh
- if fresh daemon fails PING → error (systemic issue, not stale daemon)

two spawns would mask systemic issues. the vision handles this correctly.

---

## hidden assumption: health check should be proactive, not reactive

**what do we assume?**
that we should check health BEFORE use (proactive), not AFTER failure (reactive).

**why might this not hold?**
reactive approach would:
1. try command
2. on failure, kill daemon, spawn fresh, retry
3. if retry fails, error

**what if opposite were true (reactive)?**
pros:
- no latency on happy path (daemon is usually healthy)
- simpler: no new PING command needed

cons:
- error bubbles up to caller before retry
- caller might need retry logic
- user might see transient error before success

**verdict: proactive is correct**

proactive catches failure before user command runs. user never sees the error. this is better UX.

but this is a design choice worth a note — reactive would also work.

---

## hidden assumption: kill old daemon is safe

**what do we assume?**
that we can kill the unhealthy daemon without consequences.

**why might this not hold?**
- daemon holds cached credentials
- other processes might be mid-command to same daemon
- socket file might be left behind

**what if opposite were true?**
if we can't safely kill, we'd need:
- graceful shutdown (QUIT command)
- wait for in-flight commands
- cleanup socket file

**verdict: holds**

- cached credentials: if daemon is unhealthy, they're inaccessible anyway
- mid-command: same process, so sequential; no concurrency concern
- socket file: spawn already handles stale socket cleanup

---

## hidden assumption: health check latency is acceptable

**what do we assume?**
that PING adds acceptable latency to findsert.

**why might this not hold?**
if PING adds 100ms, every `keyrack unlock` gets 100ms slower.

**what if opposite were true?**
could skip health check if daemon was used recently (TTL cache). but adds complexity.

**verdict: holds**

PING is local unix socket call. latency should be <10ms. acceptable for the reliability gained.

---

## what did r1 miss?

r1 covered the obvious assumptions. r2 surfaced:

1. **PING must verify** — not automatic, must be explicitly designed this way
2. **proactive vs reactive** — design choice, proactive is correct but worth a note in design
3. **health check latency** — acceptable for local socket

## action items from r2

1. update vision: clarify PING must use verifyCallerLoginSession
2. note proactive choice in vision

---

## fixes applied

### issue 1: PING must verify caller session (hidden assumption)

**found:** vision assumed PING would verify caller session, but this is a design choice, not automatic.

**fixed:** added "design decisions" section to vision with explicit requirement:
- PING must call `verifyCallerLoginSession`
- health check must exercise same verification path as real commands

### issue 2: proactive vs reactive not documented (design choice)

**found:** vision assumed proactive health check without documenting why.

**fixed:** added to "design decisions" section:
- proactive health check, not reactive
- rationale: user never sees transient errors

### issue 3: PING retry needed (surfaced in deeper pass)

**found:** kill on single PING failure is aggressive. transient ss issues could cause unnecessary restarts.

**fixed:** added to "design decisions" section:
- PING retry before kill
- try PING, wait 100ms, retry once before concluding unhealthy

### issue 4: PING timeout not specified

**found:** no timeout decision documented.

**fixed:** added to "design decisions" section:
- PING timeout = 1000ms

### issue 5: error message guidance

**found:** no actionable hint when fresh daemon also fails.

**fixed:** updated edge cases table:
- "propagate error with actionable hint (e.g., check if ss command works)"

### non-issues (hold as-is)

| assumption | why it holds |
|------------|-------------|
| one daemon spawn retry | two spawns would mask systemic issues; fresh-daemon-also-fails = propagate error |
| kill daemon is safe | cached creds inaccessible anyway; no concurrency; spawn handles stale socket |
| latency acceptable | local unix socket <10ms; reliability worth small latency |
| cached credentials lost on kill | unreliable daemon is worse than re-unlock; user can trust fresh daemon |
