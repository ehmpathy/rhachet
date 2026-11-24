import type {
  DaemonRenewEntry,
  DaemonRenewRecord,
} from '../domain.objects/daemonRenewRecord';

/**
 * .what = mark one renew entry `halted` with a defect, if it is still the entry read
 * .why = a defect does not heal on retry, so it is named at once; the one shape of that
 *        mark lives here, for the per-key catch and the tick-level sweep alike
 *
 * .note = written through `setIfHeld`, so an unlock or relock that landed meanwhile wins
 */
export const setRenewEntryHaltedByDefect = (
  input: { address: string; entry: DaemonRenewEntry; error: string },
  context: { renewRecord: DaemonRenewRecord },
): void => {
  context.renewRecord.setIfHeld({
    address: input.address,
    before: input.entry,
    after: { ...input.entry, mark: { kind: 'halted', error: input.error } },
  });
};
