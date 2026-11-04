# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | gate bound = lookup bound + 5s slack (65s) | clean | best-guessed | 85% |
| F2 | keyrack daemon `getSocketPeerPid` 5s bound left as is | dirty | best-guessed — dedicated PR #685 | 80% |
| F3 | client 30s wedge floor left below the new gate bound | clean | settled by the wisher — defer (S1) | 100% |
| F4 | issue's extra cures (kernel-perm fallback, `auth-lookup-fault`, ss-free pid read) not adopted | clean | best-guessed — dedicated PR #683 | 85% |
| F5 | clamp via a fake slow `ss` on `PATH`, not an injected exec | clean | best-guessed | 88% |
| F6 | an abandoned probe's `ss` scan is not killed when its peer hangs up | clean | settled by the wisher — defer (S2) | 100% |
| F7 | if the exec timeout does not settle a shell pipeline at its bound, drop the shell (`execFile` + node-side filter) | clean | proven — `getSocketPeerCred.integration.test.ts [case2]`: settles at ~1s of a 1s bound over a 20s `ss`; shell kept | 100% |
| F8 | the clone's peer pid is read from the peer's `ss` line; the keyrack daemon's reader is left (#686) | clean | settled by the wisher — fix the clone gate here (S3) | 100% |
| F9 | `getSocketPeerCred` keeps `process.env` and its readlink/stat leaves inline; no further split here | clean | best-guessed | 85% |
| F12 | the slow-box say proven at the server via `sayClone` (`[case19]`); no real-brain cli snapshot, no wait signal here | clean | reversed in i007: the cli acceptance case was added (`clone.say.slowbox`); the wait signal stays out, #688 | 75% |
| F11 | concerns on extant lines 43–525 of the server suite held out of scope (review diffed a stale local `main`) | clean | best-guessed | 92% |
| F10 | the gate's `timeout` path stays proven at the unit grain (`awaitCloneAuthGate [case4]`); no server seam for its bound | clean | best-guessed | 80% |
| F13 | a same-user caller `ss` cannot attribute (another pid namespace, non-dumpable) is denied — fail closed | clean | best-guessed | 80% |
| F14 | two extant expectations move with a conceded requirement change (`probe-unanswered`; no "retry" on a delivered say) | clean | best-guessed | 90% |
| F15 | each deferral is a wisher scope cut (S1–S3) or a dedicated PR (#682–#688, #704) | dirty | best-guessed | 85% |
| F16 | the `clone say` refusal render carries no `[args]` echo — an extant, shared render's deliberate exemption | dirty | best-guessed | 80% |
| F17 | the unreadable `clone get` tree takes subbranches on every branch the new helper renders | clean | best-guessed | 85% |
| F18 | two reviewer pairs ask opposite shapes of one test (the stderr trim; the `when` wrapper); the first ask stands | clean | best-guessed — a third opinion or the wisher settles | 75% |
| F19 | the `auth-denied` refusal copy and its server-fault class are extant, and stay | dirty | best-guessed | 80% |
| F20 | the cross-user `clone get` copy fix is its own PR; the read is pinned and proven refused here | dirty | best-guessed — dedicated PR #704 | 80% |
| F21 | the clone-side auth trace lines are pinned by phrase (`toContain`), not by snapshot | clean | best-guessed | 80% |
| F22 | the unreadable tree's `cause` leaf names its reason slug, like its extant peers | clean | best-guessed | 80% |
