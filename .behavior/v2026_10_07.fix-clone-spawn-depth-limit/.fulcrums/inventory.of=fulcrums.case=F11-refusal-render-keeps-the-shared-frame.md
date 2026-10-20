# F11 — the depth refusal keeps the shared frame, with no `[args]` echo

**the fork:** (a) the depth refusal renders through the shared `withCliOutputErrors` frame as
every other wrapped refusal does · (b) add an `[args]` invocation echo to the wrapped path, so
this refusal (and every other) carries it.

**taken:** (a). the wrapped path omits `[args]` by a documented choice:
`src/contract/cli/emitCliErrorAndExit.ts:22` — *"the `[args]` trailer is this handler's own
context. the wrapped path (`withCliOutputErrors`) knows its args from its own invoker and does not
want the line"*. this pr changes the refusal's words, not the frame; it adds no new render path.

- (b) is a render-policy change for every wrapped refusal in the cli, not this one: it resnaps
  each wrapped refusal snapshot repo-wide and reverses a choice the code records. that is its own
  decision, owned by whoever owns `asCliErrorFrame`, and outside a depth-limit wish
- the refusal a reviewer reads is not bare: the hint names who to ask (the clone that spawned
  you, or a human) and, for a human in a pane split from a clone, `rhx enroll` at the tty. it
  never names the depth var. `depth` / `depthMaxToSpawn` name the state

**rework:** clean for this refusal — it would inherit (b) for free once the shared frame grows it.

**confidence:** 75%. `rule.require.refusals-carry-context` asks for the echo on every refusal a
human reads; whether that rule overrides the documented frame choice is the council's call.

**where:** `src/contract/cli/emitCliErrorAndExit.ts:22`, `src/contract/cli/asCliErrorFrame.ts`.

**verdict:** —
