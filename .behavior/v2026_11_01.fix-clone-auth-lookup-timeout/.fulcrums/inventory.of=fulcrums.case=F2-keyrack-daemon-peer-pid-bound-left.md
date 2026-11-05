# F2 — keyrack daemon `getSocketPeerPid` 5s bound left as is

- **fork**: the keyrack daemon runs the same `ss -xp` scan under its own 5s exec bound
  (`getSocketPeerPid.ts:79`). raise it too, or leave it
- **taken**: leave it. the wish and issue name the clone socket's peer-cred lookup; the daemon's
  gate is a different threat model (same login session) with its own callers and timers
- **rework**: dirty. not one literal: the daemon's lookup is a sync `execSync`
  (`getSocketPeerPid.ts:77`), so a 60s bound would freeze the daemon's event loop for up to a
  minute. the cure is an async rewrite, bound to #686's parser switch in the same function
- **confidence**: 80% — the same load hazard plausibly bites there; no evidence it has yet
- **where**: `src/domain.operations/keyrack/daemon/svc/src/infra/getSocketPeerPid.ts`
- **verdict**: open — a dedicated PR, ehmpathy/rhachet#685 (the bar it clears: F15)
