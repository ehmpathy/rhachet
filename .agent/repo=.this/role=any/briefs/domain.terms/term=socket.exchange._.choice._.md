# domain.term: socket.exchange

term.chosen   = exchange
term.kind     = noun
term.boundary = socket
term.synonyms.forbidden:
- request
- roundtrip
- transaction
- session

## .what

one request-then-reply round on a clone socket: connect, write ONE framed request, reassemble the
framed reply stream, and drive a caller's terminal predicate to a settle.

the exchange owns the connection lifecycle — the socket has a single owner, and no caller leaks a
live handle. the caller owns only the payload, the terminal predicate (single-frame-wins vs
loop-until-phase), and the settle actions.

the two client halves that share it are a **probe** (a `get` read — one reply frame settles) and a
**say** (a dispatch — a `queued` ack re-arms, a `delivered`/`rejected` ack settles). both are the
SAME exchange with two request/terminal shapes, so a protocol change (a heartbeat, a timeout
strategy, a held-connection mode) is written ONCE.

## .refs

- `src/domain.operations/clone/socket/exchangeOnCloneSocket.ts` — the communicator itself
- `src/domain.operations/clone/socket/getCloneInputState.ts` — the probe half (single-frame)
- `src/domain.operations/clone/socket/sayClone.ts` — the say half (loop-until-phase)
- `src/domain.operations/clone/socket/genCloneSocketServer.ts` — the server the exchange speaks to

## .reason

- `term=socket.exchange._.choice.reason.md`
