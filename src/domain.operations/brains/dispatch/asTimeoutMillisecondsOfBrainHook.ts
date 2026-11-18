import { ConstraintError } from 'helpful-errors';
import { toMilliseconds } from 'iso-time';

import type { BrainHook } from '@src/domain.objects/BrainHook';

/**
 * .what = the short duration forms a role may declare beside iso: `10s`, `500ms`, `2m`, `1h`
 */
const SHORT_DURATION = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/;
const MS_PER_UNIT: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
};

/**
 * .what = the milliseconds of a role hook's timeout
 * .why = a role may declare an iso duration or a short form (`10s`); a brain adapter passes the
 *   short form through as declared, so a reader of hooks must read both, or a role that synced
 *   before fails to sync now
 */
export const asTimeoutMillisecondsOfBrainHook = (input: {
  timeout: BrainHook['timeout'];
}): number => {
  // a short form, as some roles declare it
  const short =
    typeof input.timeout === 'string'
      ? SHORT_DURATION.exec(input.timeout.trim())
      : null;
  if (short) return Math.round(Number(short[1]) * MS_PER_UNIT[short[2]!]!);

  // an iso duration, string or shape
  try {
    return toMilliseconds(input.timeout);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new ConstraintError('a role hook timeout is not a duration', {
      timeout: input.timeout,
      cause: error,
      hint: "declare the timeout as an iso duration ('PT30S') or a short form ('30s')",
    });
  }
};
