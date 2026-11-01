import { MalfunctionError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { BRAIN_AUTH_ENV_KEYS } from '@src/domain.operations/brain/auth/BRAIN_AUTH_ENV_KEYS';

/**
 * .what = the cause line and the hint of a hung repl, from the credential its env holds
 * .why = the repl bills whatever its env holds. a probe from a human shell with no api key
 *   answers on the box login and reads as an all-clear, while the suite's env billed a key
 *   with no credit; so the hint must name the credential the repl actually used
 */
const asHungReplDiagnosis = (input: {
  env: NodeJS.ProcessEnv;
}): { auth: string; hint: string; credit?: string } => {
  // the api-billed keys the repl inherited, in table order
  const keysApi = BRAIN_AUTH_ENV_KEYS.filter(
    (entry) => entry.bills === 'api' && !!input.env[entry.key],
  ).map((entry) => entry.key);

  // an api key outranks the box login, so the vendor refused that key
  if (keysApi.length > 0)
    return {
      auth: `${keysApi.join(' and ')} in the test env, so the repl billed the api`,
      hint: 'run `rhx claude.vendor.probe --via keyrack-test` to see the vendor text on that key. a probe from a shell with no api key answers on the login, so it shows naught about the key',
      credit:
        'a spent credit is cured only by whoever funds the key. ask them to restore it, then re-run the suite',
    };

  // no api key: the repl used the box login
  return {
    auth: 'no api key in the test env, so the repl used the box login',
    hint: 'run `rhx claude.vendor.probe --via login` to see the vendor text on that login, fix the cause, then re-run the suite',
  };
};

/**
 * .what = the wait a live haiku repl call gets before the bound fails it
 * .why = one value for every live-brain suite: well above a haiku reply on a narrow
 *   context (seconds), well below jest's per-test timeout, so a vendor hang fails with
 *   its named cause first
 */
export const BRAIN_REPL_BOUND_MS = 60_000;

/**
 * .what = wrap a repl brain so each ask and act fails loud past a bounded wait
 * .why = when the vendor refuses a call (rate limit, no credit, a dead token), the repl
 *   path hangs rather than throws, so a test waits out jest's timeout with no cause named.
 *   a bounded wait turns that silent hang into a MalfunctionError that names the likely
 *   causes and the re-run
 * .note = a backstop in test infra; the root cure is a repl that throws the vendor's error
 */
export const asBrainReplBounded = (
  input: {
    brain: BrainRepl;
    waitMs: number;
  },
  context: { env: NodeJS.ProcessEnv } = { env: process.env },
): BrainRepl => {
  // race a call against the bound; clear the timer either way, so no handle stays open
  const withinBound = async <T>(call: Promise<T>): Promise<T> => {
    const timer: { handle: NodeJS.Timeout | null } = { handle: null };
    const bound = new Promise<never>((_, reject) => {
      timer.handle = setTimeout(
        () =>
          reject(
            new MalfunctionError(
              `the repl brain gave no answer in ${Math.round(input.waitMs / 1000)}s`,
              {
                brain: `${input.brain.repo}/${input.brain.slug}`,
                why: 'a vendor refusal (rate limit, no credit, a dead oauth token) hangs the repl rather than throws',
                ...asHungReplDiagnosis({ env: context.env }),
              },
            ),
          ),
        input.waitMs,
      );
    });
    try {
      return await Promise.race([call, bound]);
    } finally {
      if (timer.handle) clearTimeout(timer.handle);
    }
  };

  // the same brain, with each call held to the bound
  return {
    ...input.brain,
    ask: (askInput, context) => withinBound(input.brain.ask(askInput, context)),
    act: (actInput, context) => withinBound(input.brain.act(actInput, context)),
  };
};
