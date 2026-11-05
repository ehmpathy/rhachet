import { existsSync, readFileSync } from 'node:fs';
import type { BootCacheLead } from './asBootCacheLeadDecision';

/**
 * .what = read one boot's lead record, or null when there is none
 * .why = the first say of a clone reads it to learn whether another clone already writes this boot
 *
 * .note = a record that is no whole lead (a torn write, a hand edit) reads as null: the caller then
 *   claims the lead and rewrites it, so a bad record heals on the next first say
 */
export const getOneBootCacheLead = (input: {
  path: string;
}): BootCacheLead | null => {
  if (!existsSync(input.path)) return null;
  try {
    const record: unknown = JSON.parse(readFileSync(input.path, 'utf8'));
    // .note = a json boundary: the parse yields `unknown`; each field the cast names is checked
    //   below, and a record that fails reads as null, so no shape is trusted
    const { serial, claimedAtMs } = (record ?? {}) as Partial<BootCacheLead>;
    if (typeof serial !== 'string' || typeof claimedAtMs !== 'number')
      return null;
    return { serial, claimedAtMs };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};
