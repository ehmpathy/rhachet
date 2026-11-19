import type { BrainHook } from '@src/domain.objects/BrainHook';

import { asTimeoutMillisecondsOfBrainHook } from './asTimeoutMillisecondsOfBrainHook';

/**
 * .what = the whole seconds of a role hook's timeout, iso or short form (`10s`)
 * .why = claude reads a hook timeout in whole seconds; the manifest stores it the same way
 * .note = rounded up, at least 1: a rule is never cut off before the time it declared, and a
 *   sub-second timeout never reads as 0, which the dispatcher's watchdog would treat as none
 */
export const asTimeoutSecondsOfBrainHook = (input: {
  timeout: BrainHook['timeout'];
}): number =>
  Math.max(
    1,
    Math.ceil(
      asTimeoutMillisecondsOfBrainHook({ timeout: input.timeout }) / 1000,
    ),
  );
