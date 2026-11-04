# F4 — the issue's extra cures not adopted

- **fork**: issue #678 also proposes (a) a kernel-perm fallback in `isCallerSameUser` when the
  lookup throws, (b) a distinct `auth-lookup-fault` reply reason, (c) a pid read with no full
  `ss -xp` scan
- **taken**: none. the wish scopes the outcome to the two bounds and the same-user accept
- **rework**: clean — each is additive
- **confidence**: 85% — (b) would fix the residual mislabel at a 60s kill; still out of scope
- **where**: `isCallerSameUser.ts`, `awaitCloneAuthGate.ts`, `genCloneSocketServer.ts`, `getSocketPeerCred.ts`
- **verdict**: open — a dedicated PR, ehmpathy/rhachet#683: (a) changes who the gate admits, (b)
  changes the wire protocol, (c) rewrites the lookup (the bar each clears: F15)
