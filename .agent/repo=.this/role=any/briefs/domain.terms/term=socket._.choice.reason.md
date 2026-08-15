# domain.term.choice.reason: socket

## .etymology

why `socket`: the clone's live-reach channel is, concretely, a **unix domain socket** — so the
term names exactly what the artifact IS, at the grain a reader can act on. once the observe-half
(`get`) reads the brain-cli's own transcripts rather than a streamed mirror, the socket IS the whole
live artifact (dispatch), so it earns the name outright rather than a more abstract wrapper word.

## .disputes

### dispute: interface / ipc  —  raised (vision open-q #1)  —  status: RESOLVED (keep `socket`)
- raised.by  = wisher
- claim      = the channel could be named the more abstract `interface` or `ipc` (inter-process comm)
- counter    = `interface` is overloaded (every contract is an "interface") and `ipc` is a mechanism
               category, not the concrete artifact; `socket` names the artifact whose liveness the whole
               design keys on. both retired as synonyms.
- resolution = keep `socket`; `interface` + `ipc` recorded as forbidden synonyms.

### dispute: phone / line  —  raised (wish instinct)  —  status: RESOLVED (keep `socket`)
- raised.by  = wisher (the wish reached for "phone" — "that's how we reach them")
- claim      = "phone" / "line" is the most evocative — you "open a line", "leave a message"
- counter    = the socket serves crons AND comms AND self-management; a comms-flavored word
               ("phone") over-specializes a general capability to one usecase. the neutral `socket`
               keeps the frame general. (the vision's "what is awkward?" #2 names this exact trap.)
- resolution = keep `socket`; `phone` + `line` recorded as forbidden synonyms.

## .evidence

- discovery: the wisher answered fulcrum #1 (`1.vision.yield.md` open-questions) explicitly with `socket`.
- invariants: the socket's liveness IS the clone's liveness (F4 — no stored LIVE/DEAD field); one
  socket per clone (never per actor); it bounds caller-auth (same-user) AND content (safe-input gate).
