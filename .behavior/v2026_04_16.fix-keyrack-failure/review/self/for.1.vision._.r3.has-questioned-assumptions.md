# self review r3: has-questioned-assumptions

third pass. paused. breathed. let me look with fresh eyes.

## what did r2 miss?

r2 found implementation assumptions (PING must verify, proactive vs reactive). but I didn't question the core STRATEGY.

---

## hidden assumption: kill daemon on single PING failure is correct

**what do we assume?**
one PING failure means daemon is unhealthy and should be killed.

**why might this not hold?**
PING could fail due to:
- transient ss race condition (would succeed on retry)
- momentary system load (ss slow to respond)
- one-off kernel hiccup

**what if opposite were true?**
could retry PING 2-3 times before concluding daemon is unhealthy.

**verdict: issue found**

kill on first failure is aggressive. a single PING retry would catch transient issues without adding significant latency.

**action:** update vision — add retry logic to health check design.

---

## hidden assumption: cached credentials are already lost

**what do we assume?**
if daemon is unhealthy, cached credentials are inaccessible, so kill loses no value.

**why might this not hold?**
if failure is intermittent (ss works 50% of the time), some commands might succeed. user might not realize daemon is flaky.

**what if opposite were true?**
user might prefer "flaky daemon that sometimes works" over "fresh daemon that requires re-unlock".

**verdict: holds**

an intermittent daemon is worse than a fresh one:
- unpredictable failures are frustrating
- user can't trust the daemon
- re-unlock is better than intermittent failures

but this assumption is worth a note — we choose "reliable over available".

---

## hidden assumption: PING timeout is obvious

**what do we assume?**
PING will have a reasonable timeout.

**why might this not hold?**
- too short timeout: kill healthy but slow daemon
- too long timeout: user waits for unhealthy daemon

**what if opposite were true?**
need explicit timeout decision.

**verdict: issue found**

need to specify timeout. suggest: 1000ms — long enough for slow daemon, short enough for UX.

**action:** add timeout to design decisions.

---

## hidden assumption: fresh daemon always starts clean

**what do we assume?**
spawned daemon will be healthy because it's fresh.

**why might this not hold?**
if problem is:
- ss command broken
- permission issue
- code bug in getSocketPeerPid

fresh daemon would have same issue.

**verdict: already addressed**

vision covers this: "fresh daemon also fails → propagate error". good.

but could clarify: after propagate error, user should get actionable hint (e.g., "check ss command permissions").

**action:** add error message guidance to vision.

---

## fixes applied

### issue 1: PING retry needed

**found:** single PING failure might be transient; kill is aggressive.

**fix:** update vision to add PING retry:
- try PING
- if fails, wait 100ms, retry once
- if still fails, kill and respawn

### issue 2: PING timeout not specified

**found:** no timeout decision documented.

**fix:** add to design decisions: "PING timeout = 1000ms"

### issue 3: error message for fresh-daemon-fails case

**found:** no guidance on what user should do if fresh daemon also fails.

**fix:** add to edge cases: error should include actionable hint.

---

## non-issues (hold as-is)

| assumption | why it holds |
|------------|-------------|
| cached credentials lost | unreliable daemon is worse than re-unlock |
| fresh daemon starts clean | ss issues are rare; propagate if systemic |
| proactive over reactive | user never sees transient error |
