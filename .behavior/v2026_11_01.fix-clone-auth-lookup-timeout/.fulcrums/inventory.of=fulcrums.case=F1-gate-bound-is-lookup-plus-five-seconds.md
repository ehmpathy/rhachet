# F1 — gate bound = lookup bound + 5s slack

- **fork**: the wish asks the gate bound to sit "above" the 60s lookup. pick a value: 61s, 65s, 90s, 2× …
- **taken**: `CLONE_AUTH_GATE_TIMEOUT_MS = SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS + 5_000` (65s). the
  derivation keeps the order by construction; 5s covers the `/proc` stat and promise settle after
  a kill, the same headroom the old 5s→8s pair held (3s), rounded up
- **rework**: clean — one constant
- **confidence**: 85% — the slack value is taste; the derivation is what matters
- **where**: `src/domain.operations/clone/socket/constants.ts`
- **verdict**: open
