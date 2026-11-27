# F15 — each deferral is a wisher scope cut or a dedicated PR

- **fork**: `rule.forbid.deferrals-short-of-a-dedicated-pr` lets a deferral stand only for a
  massive dirty refactor that earns its own PR. does each item this PR leaves for later clear that
  bar, or must it land here
- **taken**: each clears the bar, or the wisher settled it:

  | item | why it is not done here | owner |
  |---|---|---|
  | the 30s client window below the 65s gate | wisher cut (S1) | #682 |
  | an abort of the scan on hangup | wisher cut (S2) | #684 |
  | the keyrack daemon's own-pid read | wisher cut (S3). the switch changes who the keyrack daemon admits, a security contract with its own callers | #686 |
  | the keyrack daemon's 5s bound (F2) | not one literal. the daemon's lookup is a sync `execSync`, so a 60s bound would freeze the daemon's event loop for up to a minute. the cure is an async rewrite, and it is bound to #686's parser switch in the same function | #685 |
  | a distinct `auth-lookup-fault` reason (F4 b) | a wire-protocol change across server, client, say report, hints and every deny snapshot | #683 |
  | a kernel-perm fallback (F4 a) | a change to who the gate admits on a fault. a security policy, not a fix | #683 |
  | an `ss`-free pid read (F4 c) | a rewrite of the lookup | #683 (an option of its shape) |
  | the `clone get` 5s reply on a slow box | a different bound, on a different verb, outside the wish | #687 |
  | a wait signal on a slow say | an output contract across the clone-say suites (F12) | #688 |
  | the cross-user `clone get` copy (F20) | a new member of the closed probe-blind set, with copy in every map keyed by it, or a throw on a parse the say shares | #704 |

  every item is filed as a dedicated issue with a bounded scope, each its own PR
- **rework**: dirty for each. every row changes a contract (admission, wire, output) that wants its
  own review
- **confidence**: 85%. the F2 row rests on the sync `execSync`, read at `getSocketPeerPid.ts:77`
- **where**: `.seeds/`, F2, F4, F8, F12, `5.1.execution.from_vision.yield.md` (the follow-up line)
- **verdict**: open. disputed against `5.3 i001 r1 blocker.2`, `5.3 i004 r11 nitpick.4` (#683) and
  `5.3 i004 r11 nitpick.5` (#688)
