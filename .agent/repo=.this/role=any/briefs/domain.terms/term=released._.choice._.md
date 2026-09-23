# domain.term: released

term.chosen   = released
term.kind     = adj
term.synonyms.forbidden:
- landed
- taken
- accepted
- received
- consumed
- processed

⚠️ **`delivered` is NOT a forbidden synonym — it is a DISTINCT term on the transmission axis.** it
names *the bytes reached the pty*, never *the brain took the message*. the two co-exist in one
say outcome (`delivered: true, verdict: 'released'`); to fold them would erase the exact gap this
wish was opened to close. see the boundary below.

⚠️ **`submit` is kin, never a synonym.** `submit` is the ACT the brain performs; `released` is the
STATE that act leaves the message in. every `released` message was `submit`ted; the words compose
at two grains of one contract. see `term=submit`.

## .what

**the brain took the message as a turn.** the terminal state of the input triple
(`buffered → enqueued → released`) — the message left the brain's queue into the repl and was
written to the transcript as a processed user turn.

it is the one success verdict a `say` renders byte-for-byte as it did before this wish: the extant
`😶🎙️ said to <addr>` line, exit 0, stdout (V13).

## ⚠️ .the boundary — `released` is RECEIPT, `delivered` is TRANSMISSION

this is the whole root of the wish. the socket confirms transmission and infers receipt from a
transcript that lags — so a message the brain merely queued read as a false failure.

| term | the claim | the surface it reads |
|------|-----------|----------------------|
| `delivered` | the bytes reached the pty | the socket ack (`sayClone.ts`) |
| **`released`** | the brain took it as a turn | the transcript rise (`getCloneSubmittedCount`) |

a message is `delivered` the instant the bytes leave the socket; it becomes `released` only once
the brain dequeues it and writes the user turn. between the two it is `enqueued`, and to read that
`enqueued` state as a drop was the primary defect.

## ⚠️ .the boundary — `released` outranks `enqueued`

a transcript rise is the STRONGEST observation: the brain writes the user turn ON submit, so a
rise proves the turn was taken. it therefore wins even when the box also looks enqueued — the
verdict order checks the transcript first (`computeCloneSayVerdict.ts`), and the observe loop
reserves its first poll cycle for the transcript to settle, so an idle say never mis-reads an
in-flight release as `enqueued` (`getCloneSayObservation.ts`, case=5).

## .refs
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`     # the `released` branch — transcript rose
- `src/domain.operations/clone/socket/computeCloneSayReport.ts`      # the `😶🎙️ said to <addr>` success line (V13)
- `src/domain.operations/clone/socket/getCloneSayObservation.ts` # the transcript-rise basis + the first-cycle grace
- `src/domain.operations/clone/getCloneSubmittedCount.ts`            # the count rise the verdict reads

⇒ the boolean `getCloneSubmitLanded` — whose `landed` word this verdict replaced — is superseded by
`getCloneSayObservation` and no longer exists; zero importers remain anywhere in the tree. its
etymology is held in the `.reason` file below.

## .reason
see the ref-level cluster beside this choice:
- `term=released._.choice.reason.md` — etymology, the `landed` it replaces, the delivered/released split
