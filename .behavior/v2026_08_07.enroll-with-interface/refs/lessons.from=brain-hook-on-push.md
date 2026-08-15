# lessons — from the peer behavior `brain-hook-on-push` (PR #322)

> extracted 2026-08-07 from `ehmpathy/rhachet` PR #322 (`vlad/brain-hook-on-push`,
> behavior `v2026_04_09.brain-hook-on-push`). that behavior is the **comms** predecessor of this one:
> its goal was to **push a message into a live brain-cli** (a new `onPush` hook), and its research
> converged on the SAME ipc substrate this behavior builds. **this behavior SUPERSEDES it** — #322's
> implementation will NOT merge. what we keep is its **research + POC + lessons**; the comms usecase
> itself returns LATER, rebuilt on THIS frame. capture the salvage so we neither re-derive it nor lose it.

## the relationship — this supersedes #322

- **this behavior** delivers the **substrate**: the managed pty interface per clone
  (`.agent/.actors/…/clones/serial=…/interface/` = socket + stream) plus the **reach** verbs
  (`say` / `get`).
- **#322** proved the same substrate is needed for comms (push into a live clone), but built it on the
  OLD frame — a **per-actor** socket (`.agent/.sockets/`) fed by a `.comms/` daemon, with no clone
  grain. its implementation is **superseded** here; only its research + POC + lessons carry forward.
- the comms usecase returns LATER as a **downstream consumer of THIS frame's `say`** — rebuilt on
  `.agent/.actors/…/clones/…/interface/`, never #322's flat `.agent/.sockets/`. it does not re-invent
  the socket frame; it calls `say` against a clone.

## lesson 1 — the pty-master insight is independently confirmed

their research reached our assumption #1 on its own:

> "brain CLIs are REPL-style, not daemon-style. to inject into a live session you must control the
> PTY master — which the terminal emulator normally holds. if `rhx enroll` holds the PTY master
> instead, we gain write access to claude's stdin."

two independent threads converged on **hold the pty master in enroll**. cite this; do not re-argue it.

## lesson 2 — the prior-art is already researched (reuse in stone 3.1.1)

their external-product research, directly reusable for our `3.1.1.research.external.product`:

| prior art | mechanism | the limit that matters to us |
|---|---|---|
| **OpenCode** (`opencode-queue`) | queues messages, drains via `client.session.prompt()` when `session.idle` fires | **intra-session buffer only** — does NOT wake a terminated/exited session; needs the session already live |
| **OpenHands** | server-first (daemon + REST + docker sandbox) | solves wake **by design** because it is a daemon, not a REPL — the trade is a heavy server |
| **Claude Code `--channels`** | MCP servers push into a live session | needs MCP infra AND the session live with channels enabled |

the through-line: **queue/channel approaches require the session to already be live.** our frame
**solves wake** where they cannot — it records the `exid` and delegates to the brain-cli's native
`--resume`. that is the one capability all three prior-arts lack, and it is our differentiator.

## lesson 3 — they PIVOTED away from hook+poll+exit(2); do not revisit it

the `brain-hook-on-push` wish STARTED with: `onStop` hook → a background poller of `.agent/.comms/`
→ `exit(2)` to force continuation. it was abandoned. recorded reasons:

- poll overhead (tokens, latency)
- complex lifecycle via hooks
- subverts the REPL model with an `exit(2)` hack
- **cannot inject into an already-live session**

lesson: the ipc must be the **pty + socket**, never hooks/poll. our design already assumes this —
this pivot is the **evidence** for the "what is awkward → pty native dependency" call, not a reason
to reconsider hooks.

## lesson 4 — a runnable POC already exists (de-risks execution)

PR #322 carries two POC stones with concrete code:

- **`poc.pty-wrapper`** — `node-pty` spawn of claude; `pty.onData → stdout`; `stdin.setRawMode +
  stdin → pty.write`; a `net` unix socket whose inbound data is written to `pty.write()` (→ claude
  stdin); `SIGINT`/`SIGTERM` cleanup. this is a near-exact reference for our interface adapter.
- **`poc.daemon`** — `fs.watch` on a comms dir, parse json, connect to the actor socket, write. this
  is the comms-router layer (their behavior, not ours).

their open POC questions are OUR edge-critipaths to prove (they match the vision's edge table):
1. does `node-pty` work on linux/mac? (our "pty native module absent" fallback)
2. does a stdin write **wake claude from idle-at-prompt**? (our dispatch input-protocol unknown)
3. what if claude is **mid-response** when the write lands? (our single-writer / ready-state)
4. does `--resume` behave? (our revive delegation)
5. `fs.watch` reliability + file-drop→delivery latency (comms-layer, theirs)

## lesson 5 — OUR clone grain fixes THEIR open question

their registry is **per-actor**: `.agent/.sockets/for.actor=$actorId.{sock,json}` (pid, socket,
roles, startedAt). their unresolved open question:

> "how to handle multiple actors with same roles?"

our **actor → clone** split answers it directly: each live run is a distinct **clone** with its own
`serial` + its own `interface/` socket, so "many concurrent runs of one actor" is first-class, not an
open question. their `$actorId` socket key is really a **per-run** key — i.e. our clone `serial`. this
is a genuine advance our frame contributes back: **the socket is per-clone, not per-actor.**

## lesson 6 — vocabulary the rebuilt comms usecase must adopt

| brain-hook-on-push | this behavior | reconcile |
|---|---|---|
| `for.actor=$actorId.sock` (per-run) | clone `serial` + `interface/` socket | the socket is per-**clone**; their `$actorId` conflates run with identity |
| "inject" / "push" | **say** (`rule.require.get-set-gen-verbs`) | one verb — `say` — for dispatch into a clone |
| `.agent/.sockets/` (flat) | `.agent/.actors/…/clones/serial=…/interface/` | the socket lives under the clone, not a flat dir |
| `.agent/.comms/` + daemon + topic/role filter | out of scope here | the comms router is the downstream consumer of `say` |
| `onPush` hook, `BrainHookPushMessage`, `BrainHookPushFilter` | n/a here | comms-layer domain objects — theirs, built on our interface |

## the net

`brain-hook-on-push` is **the comms usecase that motivated the wish** — ahead of us on external
research, behind us on the identity frame. **this behavior supersedes its implementation** (it will not
merge); we salvage its proven pty+socket path, its prior-art + POC code, and the per-actor-socket open
question our clone grain resolves. the comms usecase itself is rebuilt LATER on THIS frame — a
downstream consumer of `say`, never a second socket frame. **this behavior owns the interface +
`say`/`get`; the future comms router only calls `say`.**
