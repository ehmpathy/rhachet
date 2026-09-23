# define.pty-stream-vs-screen

## .what

the clone pty gives a byte STREAM, not a rendered SCREEN. to read the clone's input
state — buffered / enqueued / withheld, and the on-screen counts — the daemon must
emulate the stream into a grid first.

## .why it matters

the brain-cli is a TUI. its pty output is raw ansi: cursor moves, line clears,
scroll-region sets, overwrites. that stream states what the child EMITTED, in emit
order — never what the screen SHOWS. a later escape code can move the cursor back and
overwrite an earlier byte, so a byte seen in the stream may already be gone from the grid.

every verdict this repo reads is a question about a REGION of the rendered grid:

- `buffered` — is our text in the input box now?
- `enqueued` — is it in the queue region above the box, and did the on-screen count rise?
- `withheld` — does a modal hold focus?
- the counts — how many turns sit on screen?

none of these answer from the raw stream, because in the stream those regions are just
bytes placed by cursor-move codes — not by their order of appearance. to know "what sits
at row R col C" you must apply every cursor move, clear, wrap, and scroll to a grid. that
application IS terminal emulation.

## .the choice

| option | cost |
|---|---|
| `@xterm/headless` | zero runtime deps, pure js, ~2mb / 7 files, no native addon; `buffer.getLine(i).translateToString()` yields the rendered row |
| a hand-rolled ansi parser | reinvent xterm — cursor moves, scroll regions, wrap, wide chars — for the same three regions |
| transcript-only | no emulator, but cannot part buffered / enqueued / absent, because the transcript lags and holds no input-region state |

the "three statuses are simple" instinct misleads: the statuses are simple, but each one
still needs the grid to know WHERE its text landed. the grid is the hard part, and xterm
already owns it. `@xterm/headless@6.0.0` is the headless core of xterm.js — the terminal
inside vs code — so its correctness is trodden by millions of installs. it is pinned to a
fixed version, so the rendered shape it reads does not move under us; when the pin lifts,
the version diffs eject into the adapter pattern already begun (`BrainHooksAdapter`,
`KeyrackHostVaultAdapter` are its peers).

## .how it interacts with the socket

the emulator does NOT replace the clone socket. it sits server-side, behind it:

```
client --ask--> socket --> server reads screen --> xterm grid --reply--> client
```

- the socket stays the one transport; it already replies today (`genCloneSocketServer.ts`)
- the say-internal probe rides that same reply; xterm only fills the classification it returns.
  🟡 today this screen read is exercised only INSIDE `say`; a STANDALONE `clone get` that rides it
  is F15-deferred (`define.brain-cli-input-states`), so shipped `clone get` still reads the transcript
- the daemon already tees the pty stream (the mirror), so the feed is free; the emulator
  is the only new cost

## .see also

- `define.brain-cli-input-states` — the buffered / enqueued / released triple this reads
