# domain.term: bind

term.chosen   = bind
term.kind     = verb
term.boundary = clone.socket
term.synonyms.forbidden:
- listen
- attach
- open
- connect

## .what

to claim a unix socket path as this server's address — the one act that can fail before a clone
socket can serve anyone.

a bind has exactly three outcomes: it **succeeds** (libuv emits `'listening'`), it **faults**
(libuv emits `'error'` with an errno — `EADDRINUSE`, `EACCES`, `ENAMETOOLONG`), or — the outcome
the code must still bound — **neither** (see `term=stalled`).

## .refs

- src/domain.operations/clone/socket/constants.ts (CLONE_SOCKET_BIND_TIMEOUT_MS)
- src/domain.operations/clone/socket/genCloneSocketServer.ts
- src/domain.operations/clone/asCloneSocketBindFaultError.ts
- src/domain.operations/clone/isCloneSocketBindFaultError.ts

## .reason

- `term=bind._.choice.reason.md`
