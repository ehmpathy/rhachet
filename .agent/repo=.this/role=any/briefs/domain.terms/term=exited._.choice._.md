# domain.term: exited

term.chosen   = exited
term.kind     = adj
term.synonyms.forbidden:
- quit
- closed
- terminated
- killed
- gone

⚠️ **`exited-mid-dispatch` is a DISTINCT reach fault, never this verdict.** that fault is a clone
that ended WHILE the write was in flight, so the say never delivered — it throws. `exited` is a say
that DID deliver, asked the clone to end, and saw it end after.

⚠️ **`socket-gone` is the probe-blind reason, not the verdict.** a gone socket after a PROMPT is a
clone that died on its own and reads `unreadable` with reason `socket-gone`. only a gone socket
after an asked exit reads `exited`.

## .what

**the say asked the clone to end (`/exit`, `/quit`), and its socket then closed.** the clone did
exactly what it was told. it sits outside the input triple, like `withheld`: no screen is left to
read, so there is no `buffered` / `enqueued` / `released` state to report.

it is a success verdict: exit 0, stdout, `😶🎙️ said to @:x — the clone exited as asked`.
`delivered: true`, `reason: null`, `probe: 'unsupported'` (no screen was read). retry advice:
`no-resend` — the clone ended, so no one is left to re-send to.

## ⚠️ .the boundary — both halves, or neither

`exited` needs BOTH facts, and each alone reads as before:

| message | socket after | verdict |
|---------|--------------|---------|
| `/exit` or `/quit` | gone (absent or refused) | `exited` ✅ |
| a prompt | gone | `unreadable`, reason `socket-gone` — the clone died on its own |
| `/exit` or `/quit` | still answers | the extant read decides — the clone has not ended yet |

so a missed exit costs at most the prior behavior (`unreadable`), and a live clone can never read
as `exited`.

## .refs
- `src/domain.operations/clone/isBrainCliExitCommand.ts`                  # the message half
- `src/domain.operations/clone/socket/CloneSocketGoneError.ts`            # the socket half, named at connect
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`          # the `exited` branch
- `src/domain.operations/clone/socket/computeCloneSayPollStep.ts`         # a gone socket stops the poll at once

## .reason
see the ref-level cluster beside this choice:
- `term=exited._.choice.reason.md` — etymology, the cue that fired, why a success
