# define.invariant.clone-socket-brain-cli-only

## .what

a clone's dispatch socket grants input to a **verified-live brain-cli** and to no other
process — never a raw terminal, never a shell. a `say` is delivered only when a brain-cli is
confirmed the live peer behind the socket; when that cannot be confirmed, the message is refused
(fail loud), never written.

## .invariant

for every dispatch (`say`) that reaches a clone socket:

```
say delivered  ⟹  a brain-cli is the verified-live peer behind that socket
```

equivalently, the contrapositive is the guard that enforces it:

```
brain-cli not verified live  ⟹  say NACK'd, zero bytes written
```

this holds across all three reach-states, so there is **no path** by which a `say` reaches a
raw terminal:

- **DEAF** (never had a socket) — there is no socket to connect to → `say` refused by construction
- **DEAD** (had a socket, brain-cli exited) — the socket is gone (`ENOENT`) or a stale orphan
  that refuses (`ECONNREFUSED`) → `say` refused by construction
- **LIVE** (socket answers) — the socket server consults `isBrainCliAlive()` per message and
  NACKs any `say` when the brain-cli is not the live peer (the exit-race window), so a socket
  whose brain-cli has just exited never carries a dispatch to a defunct pty or a stray process

## .why

the whole safety premise of the clone socket over a full-terminal control mechanism (kitty
ipc, tmux control-mode) is that it is **scoped to one brain-cli**, not the wider terminal. a
socket that could carry input to a shell would forfeit that premise — a cron or comms handler
(the machine consumers the socket exists for) could escalate a `say` into arbitrary shell
access on a dead or deaf clone. this invariant is the guarantee that they cannot: the dispatch
surface is a brain-cli's input channel and no more.

paired with the **content gate** (`isSafeCloneDispatchInput` — only plain text + SGR color may
pass, cursor/screen CSI + OSC + the paste-terminator are refused), the two together are the
complete "no shell access via a dead/deaf clone's socket" contract.

## .evidence

- **the guard** — `src/domain.operations/clone/socket/genCloneSocketServer.ts`: the per-frame
  `isBrainCliAlive()` check before `queue.enqueue`; a false result replies `rejected` and
  continues, so the bytes are never written.
- **the prod wiring** — `src/domain.operations/clone/pty/genBrainCliPtyClone.ts`: the
  `brainCliAlive` latch is flipped false in the child's `onExit` handler BEFORE `finalize`
  closes the socket, so a `say` that lands as the exit fires is refused by the guard.
- **the content gate** — `src/domain.operations/clone/socket/isSafeCloneDispatchInput.ts`.
- **the clamp** — `genCloneSocketServer.integration.test.ts` case11: a live, connectable socket
  whose `isBrainCliAlive` returns false NACKs a well-formed, content-safe `say` and writes zero
  bytes; case1 (the same helper with `isBrainCliAlive: () => true`) writes the message, so the
  pair is a control/treatment proof that the gate is what blocks the write.
- **settled by** — the human wisher (2026-08-13): "clone sockets must never grant access to raw
  terminal, only to brain-clis … if we cant verify there's a brain-cli active in that socket, we
  dont allow --say to it. thats the invariant."

## .enforcement

- a socket server that accepts a `say` without an `isBrainCliAlive` gate = **blocker**
- a code path that writes dispatch bytes to a socket whose brain-cli is not verified live =
  **blocker**
- a content gate that admits raw terminal-control (cursor/screen CSI, OSC, paste-terminator) to
  the child = **blocker**

## .see also

- `define.clone-reach-states.md` — the LIVE | DEAF | DEAD model this invariant guards
- `domain.terms/term=deaf._.choice._.md` — the DEAF state's term
- `rule.require.failloud` (mechanic) — a refused `say` fails loud with a named fix
