# domain.term: socket

term.chosen   = socket
term.kind     = noun            # a domain-object (dobj): [...noun][state]?
term.synonyms.forbidden:
- interface
- ipc
- phone
- line
- channel

## .what

a **socket** is a **clone**'s live-reach channel — a unix domain socket, host-scoped under
`$XDG_RUNTIME_DIR`, through which a caller dispatches a message into the clone's brain-cli input
(the `say` verb). its liveness IS the clone's liveness: connectable → LIVE, refused/absent → DEAD
(no stored state field — F4). the socket bounds BOTH who may connect (caller-auth: same-user via
SO_PEERCRED) AND what they may send (a content gate) — the "small blast radius" over full-terminal
control (kitty/tmux). one socket per clone (not per actor), so parallel clones each have their own.

## .refs

- .agent/repo=.this/role=any/briefs/define.actor-clone-hierarchy.md   (the clone's socket is its dispatch channel)
- .behavior/v2026_08_07.enroll-with-interface/1.vision.yield.md        (open-question #1: the socket term, wisher-answered)
- src/domain.operations/clone/socket/                                  (genCloneSocketServer, sayClone, the socket ops)

## .reason

see the ref-level cluster beside this choice:
- `term=socket._.choice.reason.md` — etymology, why not interface/ipc/phone, the wisher's dispute resolution
