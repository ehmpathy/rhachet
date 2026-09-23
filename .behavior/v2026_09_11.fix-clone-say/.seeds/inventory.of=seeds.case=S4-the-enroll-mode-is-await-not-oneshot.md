# seed S4 — the enroll mode is `await`, never `oneshot`

## .said

> whats "oneshot" ? and why is it needed ?

> oneshot is a great name ; cause the purpose of watch is to interact with it

> and the default is what, oneshot if non-tty, watch if tty?

> how about , await, async, and watch

> await = oneshot -> you await the reponse / cause you can always --resume a prior clone;
> so its not really oneshot ever

## .settled

the enroll-mode axis is **INTERACTION** — when, and through what, the enroller talks to the
clone. that is what parts the three modes, and it is why each needs its own wire:

| mode | the interaction | so the enroller… |
|---|---|---|
| `watch` | NOW, continuous, through this terminal | mirrors out, pumps stdin, holds the foreground |
| `async` | LATER, through the reach socket (`say` / `get`) | returns the address and exits; the clone outlives it |
| `await` | NONE — the prompt is already given, one answer is owed | awaits the child's exit and forwards its code |

⇒ so `watch` exists in order to INTERACT, and a print-mode child has no interaction left to
hold: its prompt rode in on argv and its answer rides out on stdout.

**the mode word is `await`, and `oneshot` is rejected** — no enroll is ever truly one-shot,
because `--resume` picks a prior clone back up. what is bounded is the ENROLLER'S WAIT, never
the clone's life. and `await` names the enroller's act, which matches the grain of `watch` and
`async`; `oneshot` was a noun about the child.

**the derivation stays two-input.** the tty alone cannot decide the mode:

| the question | what answers it |
|---|---|
| *does the child EXIT?* | the passthrough — `-p` / `--print` |
| *is there a terminal to interact through?* | the tty |

⇒ so *"`await` if non-tty, `watch` if tty"* is refused: it would await a **session** that never
exits and hang forever, and a non-tty session enroll is real — one clone enrolls a peer.

## .landed

- `src/domain.operations/clone/pty/computeCloneEnrollMode.ts`
- `src/domain.operations/clone/pty/computeCloneEnrollMode.test.ts`
- `src/domain.operations/enroll/isBrainCliPrintMode.ts`
- `src/domain.operations/enroll/isBrainCliPrintMode.test.ts`
- `src/contract/cli/invokeEnroll.ts`
- `src/domain.operations/clone/genCloneOndisk.ts`
- `.agent/repo=.this/role=any/briefs/domain.terms/term=enroll.mode._.choice._.md`
- `.agent/repo=.this/role=any/briefs/domain.terms/term=enroll.mode._.choice.reason.md`
