# domain.term.choice.reason: exited

## .etymology

*exit* — "a way out; to go out." it is the brain-cli's own word for the command (`/exit`), so the
verdict reads back the act the caller asked for, in the caller's own vocabulary. the past form says
the act is done.

## .why not `quit` / `closed` / `terminated` / `killed` / `gone`

- `quit` — the other command's name. to pick one command's word for both would read as if only
  that one counted
- `closed` — names the socket, not the clone. a socket can close for many reasons; the verdict
  claims one of them: the clone ended as asked
- `terminated` / `killed` — imply an outside hand. the clone ended itself, on request
- `gone` — the probe-blind reason (`socket-gone`) already owns it, and that reason is a failure
  when no exit was asked. one word for both would blur the success from the fault

## .the cue that fired

measured 2026-09-28: `rhx clone say @:modelprobe --what /exit` delivered the exit, then printed ~40
copies of `😶 clone probe fault — degraded to feed-not-live (may self-heal on the next poll)` and
closed with `💥 MalfunctionError … feed-not-live`, exit 1. the clone did exactly what it was told,
and the say called it a malfunction.

two causes, both cured:
- the per-poll degrade reached stderr on every poll → it now goes to the durable trace log alone
  (`getCloneTraceSinkToLog`); stderr carries only the verdict
- the gone socket was read as a feed not yet live, polled to the bound → a gone socket is named at
  connect (`CloneSocketGoneError`), stops the poll at once, and after an asked exit reads `exited`

## .why a success, not a quiet failure

a supervisor that ends a clone with `clone say --what /exit` needs to know the end took. an exit 1
on every clean stop teaches it to ignore the say's exit code, which then hides the real failures.

## .see also
- `term=withheld._.choice._.md` — the other verdict outside the triple
- `term=unreadable._.choice._.md` — the verdict a gone socket after a prompt reads as
- `define.invariant.clone-say-delivery` — what a verdict promises
