import { ConstraintError } from 'helpful-errors';

/**
 * .what = what the ENROLLER does with the child after the spawn
 * .why =
 *   - 🔴 the axis is INTERACTION — when, and through what, the enroller talks to the
 *     clone. that is what parts the three, and it is why each needs its own wire:
 *
 *     | mode | the interaction | so the enroller… |
 *     |---|---|---|
 *     | `watch` | NOW, continuous, through this terminal | mirrors out, pumps stdin, holds the foreground |
 *     | `async` | LATER, through the reach socket (`say` / `get`) | returns the address and exits; the clone outlives it |
 *     | `await` | NONE — the one prompt is already given, one answer is owed | awaits the child's exit and forwards its code |
 *
 *   - so `watch` exists in order to INTERACT. an `await` has no interaction left to
 *     hold: its prompt rode in on the command line and its answer rides out on stdout,
 *     which is why it may neither claim a terminal nor detach from the caller
 *   - the mode is settled by NATURE rather than by preference — you cannot mirror into
 *     a terminal that does not exist, and you cannot detach from an answer you owe — so
 *     it is DERIVED, and the caller's `asked` only narrows what nature permits
 *
 * 🔴 .all three are ASKABLE, and the symmetry is the point = `await` was derivable and
 *   not statable for a release, so a caller who wanted *"hand it this prompt and wait"*
 *   had to know that `-p` implies the mode rather than reach for rhachet's own word for
 *   it. a settled vocabulary with one value absent from its own surface teaches the
 *   surface rather than the vocabulary
 *
 *   ⇒ and each askable value has a nature clamp, so the surface cannot state an
 *     impossibility: a `watch` needs a terminal, an `await` needs a prompt, and an
 *     `async` needs neither (it detaches from both)
 *
 * 🔴 .why `await` and not `oneshot` = three reasons, and each stands alone:
 *   - ACCURACY — no enroll is ever truly one-shot. `--resume` picks a prior clone back
 *     up, so the child that "finished" is reachable again; what is bounded is the
 *     enroller's wait, never the clone's life
 *   - GRAIN — `watch`, `async`, `await` are each a verb about what the ENROLLER does,
 *     which is what this axis measures. `oneshot` was a noun about the child
 *   - COLLISION — `one-shot` already carries four unrelated senses in this repo: a
 *     render mode (`invokeEnroll`), a latch (`genCloneScreenFeed`), a caller kind
 *     (`socket/constants`), and a `-p` invocation (`isInteractiveTty`). a fifth sense
 *     in a contract is `rule.forbid.domain-term-ambiguity`
 *
 * 🔴 .note = this axis REPLACED `isCloneEnrollAttended`. that predicate fed the
 *   socket gate, so a tty read decided whether a clone could be REACHED; here the
 *   same read decides only what the enroller DOES
 *   (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
 */
export const computeCloneEnrollMode = (input: {
  /** does the enroller hold a terminal to mirror into? */
  tty: boolean;
  /** what the caller stated, if they stated one */
  asked: 'watch' | 'async' | 'await' | null;
  /**
   * does the invocation owe its caller an answer on stdout — a print-mode child that
   * will exit once it has given one? (`isBrainCliPrintMode`)
   */
  printMode: boolean;
}): 'watch' | 'async' | 'await' => {
  // a watch with no terminal is impossible, never merely odd — the caller stated
  // an intent the environment cannot satisfy, so say so rather than hand back the
  // other mode silently (rule.require.failfast)
  if (input.asked === 'watch' && !input.tty)
    ConstraintError.throw(
      'can not enroll a clone in watch mode with no tty. there is no terminal to mirror the clone into',
      { asked: input.asked, tty: input.tty },
    );

  // 🔴 an explicit `--await` with no prompt is a HANG, and the hang is unbounded. an
  //   `await` holds the enroller until the child exits, and a brain-cli session does
  //   not exit — it waits for input forever. so the wait would never settle, and the
  //   caller would read it as a slow enroll rather than as their own input defect
  //
  // ⇒ the prompt is what bounds the wait, so an `await` requires one. the passthrough
  //   is where it rides in (`-p` / `--print`), which is why `printMode` is the signal
  //   rather than a flag of rhachet's own: the prompt belongs to the brain, and a
  //   second surface for it would be a synonym (rule.forbid.domain-term-synonyms)
  if (input.asked === 'await' && !input.printMode)
    ConstraintError.throw(
      'can not enroll a clone in await mode with no prompt. an await holds until the child exits, and a brain-cli session never does — pass a prompt through (e.g. `-p "<prompt>"`), or use --async to detach',
      { asked: input.asked, printMode: input.printMode },
    );

  // an explicit ask nature can satisfy is honored — a human at a terminal may
  // background their own clone, and a caller who states `--async` alongside a print
  // flag owns that choice (they asked to detach from an answer, and may have meant it)
  if (input.asked) return input.asked;

  // 🔴 a print-mode invocation is an `await` BY NATURE, whatever the terminal says.
  //   this row outranks the tty default because the tty answers "is there a terminal
  //   to mirror into?" and a print-mode child does not want a mirror — it wants its
  //   answer awaited. a tty-only derivation reads `async` here, detaches, and hands
  //   the caller an enroll banner where the answer was owed
  if (input.printMode) return 'await';

  // otherwise the terminal decides
  return input.tty ? 'watch' : 'async';
};
