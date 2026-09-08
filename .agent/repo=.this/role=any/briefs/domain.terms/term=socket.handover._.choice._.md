# domain.term: socket.handover

term.chosen   = handover
term.kind     = noun
term.boundary = socket
term.synonyms.forbidden:
- handoff
- takeover
- transfer
- failover

## .what

the moment one daemon takes a socket path over from another that still holds it.

a bind does not collide: the server unlinks any stale socket before it binds, so the later daemon
silently takes the path, and the earlier one lives on with a socket file it no longer owns. the
**handover** is that window — from the successor's bind until the predecessor exits.

the two parties are the **predecessor** (the earlier daemon, whose file the successor replaces) and
the **successor** (the later one, which now owns the path).

## .refs

- `src/domain.operations/keyrack/daemon/svc/src/contract/startKeyrackDaemon.ts` — `unlinkOwnFiles`,
  whose ownership check exists precisely because a handover may be in flight
- `src/domain.operations/keyrack/daemon/daemon.integration.test.ts` — `[case11]`, the clamp on it
- `src/domain.operations/clone/socket/genCloneSocketServer.ts` — the clone socket's own bind

## .reason

- `term=socket.handover._.choice.reason.md`
