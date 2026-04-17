# self review: has-questioned-requirements

## requirement 1: deep health check via PING command

**who said this was needed?**
the user encountered the failure. the wish document captures the observed behavior.

**what evidence supports this?**
the error trace shows:
- daemon socket accepted connection (TCP handshake succeeded)
- daemon command failed when `ss -xp` could not find socket inode
- `isDaemonReachable` returned true because it only checks TCP handshake

**what if we didn't do this?**
users would have to manually kill stale daemons. the error message gives no hint that this is the fix.

**is scope too large, too small, or misdirected?**
scope is appropriate. the fix is internal to `findsertKeyrackDaemon` — no contract changes needed.

**could we achieve the goal in a simpler way?**

considered alternatives:

| alternative | pros | cons |
|-------------|------|------|
| retry on failure at call site | no new command needed | error handlers scattered across callers |
| make ss lookup more resilient | addresses root cause | ss behavior is external, can't control |
| catch error in daemonAccessUnlock, restart daemon, retry | single retry point | complex, hides failure mode |
| **deep health check in findsert** | proactive, single place | requires PING command |

the proactive approach (deep health check) is simplest:
- single point of health verification
- callers don't need retry logic
- failure detected before user command runs

**verdict: holds** — deep health check via PING is the right approach.

---

## requirement 2: automatic recovery by spawn fresh daemon

**who said this was needed?**
implied by the wish: "findsert a new healthy daemon if the extant one is unhealthy"

**what evidence supports this?**
the alternative (manual intervention) is poor UX. daemons are implementation detail; users shouldn't know they exist.

**what if we didn't do this?**
we could error with a hint like "run `rhx keyrack daemon prune`". but this exposes internals and adds friction.

**is scope too large, too small, or misdirected?**
appropriate. findsert already handles daemon spawn; this extends it to handle unhealthy-to-healthy transition.

**could we achieve the goal in a simpler way?**
no. if we detect unhealthy daemon, we must either:
- tell user to fix it (poor UX)
- fix it automatically (good UX)

**verdict: holds** — automatic recovery is the right choice.

---

## requirement 3: no contract changes

**who said this was needed?**
design choice in vision: "no contract change"

**what evidence supports this?**
the issue is internal health detection. the public contract (`findsertKeyrackDaemon`) doesn't need new parameters.

**what if we didn't do this?**
could add `options.forceHealthCheck` or similar. but why would caller ever NOT want health check?

**is scope too large, too small, or misdirected?**
appropriate. callers want "give me a functional daemon" — implementation details are internal.

**could we achieve the goal in a simpler way?**
yes, this IS the simpler way. no contract change = no caller updates needed.

**verdict: holds** — no contract change is correct.

---

## summary

all requirements hold:
1. deep health check via PING — addresses root cause at right layer
2. automatic recovery — good UX, hides internal complexity
3. no contract changes — simpler integration, backwards compatible

no issues found. ready to proceed.
