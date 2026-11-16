import { availableParallelism, getPriority, setPriority } from 'node:os';

import { getOneAcceptanceBox } from './getOneAcceptanceBox';

/**
 * .what = lowers this run's cpu priority on a shared box, and returns the box, cores, and nice
 *   the run now holds
 * .why = nice yields a contested core to a claude seat or a peer crew, and costs naught on an idle
 *   box. set in globalSetup, before jest forks its workers, every worker and grandchild inherits it
 *
 * .note = only lowers, never raises: a run already at nice 19 stays at 19, and an unprivileged
 *   process may not raise its own priority anyway
 * .note = the os reads are injectable through context, so a test can prove the only-lowers rule
 *   without a change to its own process
 */
export const setAcceptanceBoxPriority = (
  input: { env: Record<string, string | undefined> },
  context: {
    os: { cores: () => number; getPriority: () => number; setPriority: (nice: number) => void };
  } = {
    os: { cores: availableParallelism, getPriority: () => getPriority(), setPriority },
  },
): {
  box: ReturnType<typeof getOneAcceptanceBox>;
  cores: number;
  niceNow: number;
} => {
  // decide the box
  const cores = context.os.cores();
  const box = getOneAcceptanceBox({ env: input.env, cores });

  // lower the priority, on a shared box only
  if (box.niceTarget !== null && context.os.getPriority() < box.niceTarget)
    context.os.setPriority(box.niceTarget);

  return { box, cores, niceNow: context.os.getPriority() };
};
