import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import { getKeyrackKeyGrants } from '@src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants';

import { emitKeyrackBlockedReport } from './emitKeyrackBlockedReport';

/**
 * .what = get grants for a cli command, or render the turtle-blocked report and yield null
 * .why = a refusal from the grant core must read exactly like a refusal from a command's own
 *        guards, and there is more than one branch that calls the core — so the translation
 *        from `ConstraintError` to rendered report belongs in ONE place, where the two
 *        branches cannot drift apart
 *
 * .note = `null` is a SIGNAL, never a swallow: the report is already on stdout by the time it
 *         returns, and the return type names the null so a caller cannot ignore it without
 *         the compiler's consent. any error that is not a `ConstraintError` rethrows
 *         untouched (`rule.forbid.failhide`)
 * .note = this exists so its callers can use `const`. a try/catch that assigns into an outer
 *         variable forces a `let`, which is the mutation `rule.require.immutable-vars`
 *         forbids — the extraction removes the REASON for the `let` rather than works
 *         around it
 */
export const getAllKeyrackGrantsOrEmitBlocked = async (
  input: Parameters<typeof getKeyrackKeyGrants>[0],
  options: { command: string },
): Promise<KeyrackGrantAttempt[] | null> => {
  try {
    return await getKeyrackKeyGrants(input);
  } catch (error) {
    // only a constraint is a rendered refusal; a malfunction is a defect and must surface
    if (!(error instanceof ConstraintError)) throw error;

    emitKeyrackBlockedReport({ error, command: options.command });
    return null;
  }
};
