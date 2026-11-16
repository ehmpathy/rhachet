import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { KeyrackGrantRenewal } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = one renew try, settled into a renewal or an operational fault, within a bound
 * .why = the renew calls out to the mech's upstream, which can hang. a hang that never settles
 *        would hold the key's in-flight slot forever, and the key would die with no mark.
 *        the bound turns a hang into a counted fault, so it can halt and be named
 *
 * .note = only an operational fault (ConstraintError, MalfunctionError) is settled into
 *         `fault`. any other throw is a code defect and is rethrown, never counted as a
 *         transient fault (rule.forbid.failhide)
 */
export const getOneRenewalSettled = async (
  input: { grant: KeyrackKeyGrant },
  context: {
    getOneRenewal: (input: {
      grant: KeyrackKeyGrant;
    }) => Promise<KeyrackGrantRenewal>;
    timeoutMs: number;
  },
): Promise<
  | { renewal: KeyrackGrantRenewal; fault: null }
  | { renewal: null; fault: ConstraintError | MalfunctionError }
> => {
  // bound the try; a hang becomes a MalfunctionError
  const timer: { handle: NodeJS.Timeout | null } = { handle: null };
  const timeout = new Promise<never>((_, reject) => {
    timer.handle = setTimeout(
      () =>
        reject(
          new MalfunctionError('renew timed out', {
            slug: input.grant.slug,
            timeoutMs: context.timeoutMs,
          }),
        ),
      context.timeoutMs,
    );
  });

  try {
    const renewal = await Promise.race([
      context.getOneRenewal({ grant: input.grant }),
      timeout,
    ]);
    return { renewal, fault: null };
  } catch (error) {
    // settle only an operational fault; a defect propagates
    const isOperationalFault =
      error instanceof ConstraintError || error instanceof MalfunctionError;
    if (!isOperationalFault) throw error;
    return { renewal: null, fault: error };
  } finally {
    if (timer.handle) clearTimeout(timer.handle);
  }
};
