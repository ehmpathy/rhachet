import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import { getOneKeyrackGrantByKey } from '@src/domain.operations/keyrack/getOneKeyrackGrantByKey';

import { emitKeyrackBlockedReport } from './emitKeyrackBlockedReport';

/**
 * .what = get ONE grant by key for a cli command, or render the blocked report and yield null
 * .why = the keyed twin of `getAllKeyrackGrantsOrEmitBlocked`. a keyed ask has its own refusals
 *        — an org mismatch, and a bare key that needs a manifest there is none of
 *        (`getOneKeyrackGrantByKey`) — and each is caller-fixable, so each is owed the same
 *        `🔐 keyrack … / └─ ✋ ConstraintError:` tree a sweep's refusal already gets
 *
 * ⚠️ .why.family = every other branch of the verb family had already converged on an
 *        `*OrEmitBlocked` operation: the repo sweep on `getAllKeyrackGrantsByRepoOrEmitBlocked`,
 *        the get paths on `getAllKeyrackGrantsOrEmitBlocked`, `fill` and `firewall` on
 *        `emitKeyrackBlockedReport` directly. the keyed branch alone still called the bare
 *        operation, so ONE ask out of the set answered a caller-fixable refusal with a
 *        flush-left `✋ ConstraintError:` and an args dump. one rule, two renders — the same
 *        gap this family exists to close (`rule.require.keyrack-emoji-palette`)
 *
 * .note = `null` is a SIGNAL, never a swallow: the report is already on stderr by the time it
 *         returns, and the return type names the null so a caller cannot ignore it without the
 *         compiler's consent. any error that is not a `ConstraintError` rethrows untouched
 *         (`rule.forbid.failhide`)
 *
 * .note = `command` rides in `input`, not a third arg, because `rule.require.input-context-pattern`
 *         caps a procedure at `(input, context)` and this op's `context` slot is already spoken
 *         for by a real dependency bag (`ContextKeyrackGrantGet`). the label is a value the
 *         caller names, never a dependency, so `input` is where it belongs
 */
export const getOneKeyrackGrantByKeyOrEmitBlocked = async (
  input: Parameters<typeof getOneKeyrackGrantByKey>[0] & { command: string },
  context: Parameters<typeof getOneKeyrackGrantByKey>[1],
): Promise<KeyrackGrantAttempt | null> => {
  const { command, ...ask } = input;

  try {
    return await getOneKeyrackGrantByKey(ask, context);
  } catch (error) {
    // only a constraint is a rendered refusal; a malfunction is a defect and must surface
    if (!(error instanceof ConstraintError)) throw error;

    emitKeyrackBlockedReport({ error, command });
    return null;
  }
};
