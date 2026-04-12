# pivot: hook+poll → PTY wrapper + IPC socket

## date

2026-04-12

## original approach (from wish)

```
hook.onStop → verify background poller active → exit(2) if not
background task → polls .agent/.comms/ → invokes hook.onPush
```

problems identified:
- poll overhead (tokens, latency)
- complex lifecycle via hooks
- subverts REPL model with exit(2) hack
- no way to inject into already-active session

## research findings

### OpenCode (opencode-queue)

- queues messages in active session
- drains via `client.session.prompt()` when `session.idle` fires
- does NOT wake terminated/asleep sessions
- only works for intra-session message buffer

### OpenHands

- server-first architecture (Docker sandbox + REST API)
- external triggers via webhooks, GitHub events
- solves wake problem by design — it's a daemon, not a REPL

### Claude Code channels

- `--channels` lets MCP servers push into active session
- requires MCP server infrastructure
- session must be active with channels enabled

## key insight

brain CLIs are REPL-style, not daemon-style. to inject into an active session, you need to control the PTY master — which the terminal emulator normally holds.

if `rhx enroll claude` holds the PTY master instead, we gain write access to claude's stdin.

## new approach: PTY wrapper + IPC socket

```
┌─────────────────────────────────────────────────────┐
│  terminal                                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  rhx enroll claude (wrapper)                  │  │
│  │                                               │  │
│  │   stdin ─────┐      ┌──────── daemon socket   │  │
│  │              ▼      ▼                         │  │
│  │           ┌──────────┐                        │  │
│  │           │ PTY master│ ◄─── WE CONTROL THIS  │  │
│  │           └─────┬────┘                        │  │
│  │                 │                             │  │
│  │           ┌─────▼────┐                        │  │
│  │           │ PTY slave │                       │  │
│  │           └─────┬────┘                        │  │
│  │                 │                             │  │
│  │           ┌─────▼────┐                        │  │
│  │           │  claude  │                        │  │
│  │           └──────────┘                        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### data flow

| source | path |
|--------|------|
| user types | terminal → wrapper stdin → PTY master → claude |
| daemon pushes | daemon → unix socket → wrapper → PTY master → claude |
| claude outputs | claude → PTY slave → wrapper → terminal stdout |

### socket location

```
.agent/.sockets/for.actor=$actorId.sock
```

### registry

```
.agent/.sockets/for.actor=$actorId.json
{
  "pid": 12345,
  "socket": ".agent/.sockets/for.actor=$actorId.sock",
  "roles": ["mechanic", "driver"],
  "startedAt": "2026-04-12T..."
}
```

## daemon responsibilities

1. watch `.agent/.comms/` for inbound messages
2. filter by role (per hook.onPush config)
3. write to matched actor socket(s)
4. message appears in claude's stdin as if user typed it

## benefits over original approach

| aspect | hook+poll | PTY+socket |
|--------|-----------|------------|
| latency | poll interval | instant (inotify + socket) |
| complexity | lifecycle via hooks | clean separation |
| injection | impossible into active session | direct stdin write |
| overhead | background task tokens | minimal (daemon is native) |

## implementation notes

- use `node-pty` for PTY creation in Node.js
- wrapper must handle SIGWINCH (terminal resize)
- wrapper must handle SIGINT/SIGTERM gracefully
- socket cleanup on wrapper exit

## open questions

- should daemon be per-repo or global?
- how to handle multiple actors with same roles?
- message format in `.agent/.comms/` — json? markdown?
- should wrapper auto-start daemon if not active?
