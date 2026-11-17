import { asCloneAddressHuman } from '../asCloneAddressHuman';

/**
 * .what = the stderr lines a held first say prints: one as the hold begins, one as it ends, and
 *   one if the gate faults
 * .why = a say that waits with no word reads as a hang; the lines name the wait, its cause, and its
 *   bound as it happens, on stderr, so the say's stdout contract is unchanged
 */
export const asBootCacheHoldNotice = (
  input:
    | {
        phase: 'begin';
        leadSerial: string;
        leadStarted: boolean;
        boundMs: number;
      }
    | { phase: 'released' | 'bound'; leadSerial: string; heldMs: number }
    | { phase: 'faulted'; reason: string },
): string => {
  // a tolerated gate fault never stops the say; the line names the fault and that the say goes on
  if (input.phase === 'faulted')
    return `🟡 the boot cache gate faulted (${input.reason}); this say goes unheld`;

  // the lead is named the way a human retypes it
  const lead = asCloneAddressHuman({ slug: null, serial: input.leadSerial });

  // the begin line names the bound the gate holds now, and only the lead state it observed;
  //   the bound and the held time share one precision, so the two lines read as one measure
  if (input.phase === 'begin') {
    const leadState = input.leadStarted
      ? `${lead} sent the first request of this boot`
      : `${lead} claimed the first request of this boot and has not sent it yet`;
    return `ℹ held for the boot cache, up to ${(input.boundMs / 1000).toFixed(1)}s, until ${lead} begins its first reply; ${leadState}`;
  }

  const seconds = (input.heldMs / 1000).toFixed(1);
  if (input.phase === 'released')
    return `ℹ held ${seconds}s for the boot cache, until ${lead} began its first reply; this clone reads the boot from cache`;
  return `ℹ held ${seconds}s for the boot cache; ${lead} has not replied, so this clone writes the boot itself`;
};
