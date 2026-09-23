# domain.term: enroll.mode

term.chosen   = mode
term.kind     = noun
term.boundary = enroll
term.values   = watch | async | await
term.synonyms.forbidden:
- oneshot
- attended
- interactive
- foreground

## .what

what the ENROLLER does with the child clone after the spawn. the axis is **INTERACTION** —
when, and through what, the enroller talks to the clone.

| value | the interaction | so the enroller… |
|---|---|---|
| `watch` | NOW, continuous, through this terminal | mirrors out, pumps stdin, holds the foreground |
| `async` | LATER, through the reach socket (`say` / `get`) | returns the address and exits; the clone outlives it |
| `await` | NONE — the prompt is already given, one answer is owed | awaits the child's exit and forwards its code |

## .the derivation

the mode is settled by NATURE rather than by preference, so it is DERIVED and the caller's ask
only narrows what nature permits. two independent inputs decide it:

| the question | what answers it |
|---|---|
| *does the child EXIT?* | the passthrough — `-p` / `--print` (`isBrainCliPrintMode`) |
| *is there a terminal to interact through?* | the tty |

⇒ a tty-only derivation is the measured defect: a no-tty `enroll … -p '<prompt>'` reads `async`,
detaches, and hands its caller an enroll banner where the brain's answer was owed.

## .the surface — all three are ASKABLE

each value has a flag, and each flag has a **nature clamp** — so the surface cannot state an
impossibility:

| flag | nature requires | else |
|---|---|---|
| `--watch` | a terminal to mirror into | refused: *"no terminal to mirror the clone into"* |
| `--await` | a prompt, so the wait is bounded | refused: *"an await holds until the child exits, and a brain-cli session never does"* |
| `--async` | neither — it detaches from both | never refused on nature |

🔴 **`await` was derivable and not statable for a release**, so a caller who wanted *"hand it this
prompt and wait"* had to know that `-p` implies the mode rather than reach for rhachet's own word for
it. a settled vocabulary with one value absent from its own surface teaches the surface rather than
the vocabulary.

⇒ the three flags are read as ONE axis value by `asCloneEnrollModeAsked`, which owns the seam's one
rule: **a caller who states two modes is refused BY NAME, never resolved by precedence.** the prior
read was a ternary chain, so `--watch --async` returned `watch` and the second flag vanished with a
zero exit — `define.invariant.an-unknown-flag-is-refused-never-dropped` one grain in, where the flag
was RECOGNIZED and then discarded.

## .invariants

- a `watch` with no tty is IMPOSSIBLE — the derivation throws rather than silently downgrade
- an `await` with no prompt is an UNBOUNDED hang — a brain-cli session does not exit, so the wait
  would never settle and the caller would read it as a slow enroll rather than their own input defect
- a `printMode` invocation NEVER derives `async`, at any tty state — `async` detaches, and a
  detached enroll returns a banner rather than the answer
- two stated modes are REFUSED, never resolved — and the refusal names both flags
- the mode decides what the enroller DOES, never whether the clone can be REACHED
  (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
- `watch` and `await` share one wire — both mirror into the caller's streams — so only `async`
  changes what `genCloneOndisk` does

## .refs

- src/domain.operations/clone/pty/computeCloneEnrollMode.ts
- src/domain.operations/clone/pty/asCloneEnrollModeAsked.ts
- src/domain.operations/enroll/isBrainCliPrintMode.ts
- src/domain.operations/clone/genCloneOndisk.ts
- src/contract/cli/invokeEnroll.ts

## .reason

- `term=enroll.mode._.choice.reason.md`
