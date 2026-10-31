import { MalfunctionError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = wrap a repl brain so each ask and act fails loud past a bounded wait
 * .why = when the vendor refuses a call (rate limit, no credit, a dead token), the repl
 *   path hangs rather than throws, so a test waits out jest's timeout with no cause named.
 *   a bounded wait turns that silent hang into a MalfunctionError that names the likely
 *   causes and the re-run
 * .note = a backstop in test infra; the root cure is a repl that throws the vendor's error
 */
export const asBrainReplBounded = (input: {
  brain: BrainRepl;
  waitMs: number;
}): BrainRepl => {
  // race a call against the bound; clear the timer either way, so no handle stays open
  const withinBound = async <T>(call: Promise<T>): Promise<T> => {
    let timer: NodeJS.Timeout | undefined;
    const bound = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new MalfunctionError(
              `the repl brain gave no answer in ${Math.round(input.waitMs / 1000)}s`,
              {
                brain: `${input.brain.repo}/${input.brain.slug}`,
                why: 'a vendor refusal (rate limit, no credit, a dead oauth token) hangs the repl rather than throws',
                hint: 'run `claude -p --model haiku "say ok"` to see the vendor text, fix the cause, then re-run the suite',
              },
            ),
          ),
        input.waitMs,
      );
    });
    try {
      return await Promise.race([call, bound]);
    } finally {
      clearTimeout(timer);
    }
  };

  // the same brain, with each call held to the bound
  return {
    ...input.brain,
    ask: (askInput, context) => withinBound(input.brain.ask(askInput, context)),
    act: (actInput, context) => withinBound(input.brain.act(actInput, context)),
  };
};
