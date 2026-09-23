import type { CloneSayVerdict } from './computeCloneSayVerdict';

/**
 * .what = what a caller's retry policy should do with a say verdict — the three-way split the
 *   vision names "the wish's loudest benefit"
 * .why = a transcript-only verify has ONE word for failure, so a daemon cannot tell "re-send"
 *   from "never re-send" apart. these three actions make the policy writable:
 *   - `no-resend` — the brain HAS it (`released`) or HOLDS it (`enqueued`); a re-send would
 *     duplicate the turn
 *   - `resend` — the pre-check refused (`withheld`), so NO pty write happened
 *     (`delivered: false`); a re-send cannot duplicate, so it is the safe action
 *   - `verify-never-blind` — the bytes were delivered but no rise is provably held
 *     (`buffered` — our text sits in the region, a blind re-send appends and wedges;
 *     `absent` — delivered, yet a modal may have eaten it; `unreadable` — we do not know
 *     where it went): verify the state, never re-send blind
 */
export type CloneSayRetryAdvice = 'no-resend' | 'resend' | 'verify-never-blind';

/**
 * .what = map one say verdict to its retry advice — pure, total over the six verdicts
 * .why = the vision documents this contract as prose; this materializes it as code so an
 *   in-repo consumer (a supervisor daemon that reads a verdict) derives the safe action from
 *   one tested owner, never a hand-rolled `switch` one mis-derived branch away from the exact
 *   hazard the design exists to prevent — a blind re-send into a `buffered` state that appends
 *   and wedges (r011-i007-n3)
 *
 * .note = a `switch` with no `default`, so a seventh verdict added later is a compile error
 *   here — the advice for it must be a deliberate choice, never an implicit fall-through
 */
export const computeCloneSayRetryAdvice = (input: {
  verdict: CloneSayVerdict;
}): CloneSayRetryAdvice => {
  switch (input.verdict) {
    // the brain has it (released) or holds it (enqueued) — a re-send duplicates the turn
    case 'released':
    case 'enqueued':
      return 'no-resend';

    // the pre-check refused — no bytes reached the pty, so a re-send cannot duplicate
    case 'withheld':
      return 'resend';

    // delivered, yet no rise is provably held — verify the state, never re-send blind
    case 'buffered':
    case 'absent':
    case 'unreadable':
      return 'verify-never-blind';
  }
};
