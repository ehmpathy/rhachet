import { ConstraintError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { asBootCacheHoldNotice } from './asBootCacheHoldNotice';
import { holdFirstSayForBootCache } from './holdFirstSayForBootCache';

/**
 * .what = whether a gate fault is one of the two the say may go on past
 *   - a ConstraintError from the gate's tree: chiefly a peer that holds the lead record's mutex past
 *     the wait bound (`withRepoMutex`); any other is a state the caller owns, and is printed, not hidden
 *   - a node system fault on a read or a socket probe (an errno `code`, e.g. ENOENT, EISDIR, ECONNREFUSED)
 * .note = errno by shape, never `instanceof Error`: a node fs error may come from another realm
 * .note = all else (a TypeError, a MalfunctionError from a broken invariant) is a defect, and is rethrown
 */
const isGateFaultTolerable = (error: unknown): error is { message: string } => {
  if (error instanceof ConstraintError) return true;
  if (typeof error !== 'object' || error === null) return false;
  // .note = an error boundary: a thrown value is `unknown`; the cast names only the two keys read,
  //   each typed `unknown` and checked below, so no shape is assumed
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    typeof message === 'string' &&
    typeof code === 'string' &&
    /^E[A-Z]+$/.test(code)
  );
};

/**
 * .what = hold a clone's first say for the boot cache, and print each stage of the hold on stderr;
 *   a tolerable gate fault prints its cause and lets the say go unheld
 * .why = the gate trades latency for cost; a contention or i/o fault in it is no reason for a say
 *   to fail. such a fault must not stop a dispatch that would have landed, and must not go unseen
 *
 * .note = the catch is an allowlist (`isGateFaultTolerable`), and loud: each tolerated fault is named
 *   on stderr with its message; every other error is rethrown (`rule.forbid.failhide`)
 */
export const holdFirstSayForBootCacheOrUnheld = async (
  input: { repoPath: string; clone: CloneOndisk },
  context: { log: { error: (line: string) => void } },
): Promise<void> => {
  try {
    const hold = await holdFirstSayForBootCache(input, {
      pollMs: 250,
      onHoldBegin: (begun) =>
        context.log.error(asBootCacheHoldNotice({ phase: 'begin', ...begun })),
    });
    if (
      (hold.outcome === 'released' || hold.outcome === 'bound') &&
      hold.leadSerial !== null
    )
      context.log.error(
        asBootCacheHoldNotice({
          phase: hold.outcome,
          leadSerial: hold.leadSerial,
          heldMs: hold.heldMs,
        }),
      );
  } catch (error) {
    // only a contention or i/o fault is tolerated; a defect goes up
    if (!isGateFaultTolerable(error)) throw error;
    context.log.error(
      asBootCacheHoldNotice({ phase: 'faulted', reason: error.message }),
    );
  }
};
