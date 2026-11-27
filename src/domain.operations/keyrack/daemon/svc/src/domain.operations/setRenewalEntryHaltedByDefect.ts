import type {
  DaemonRenewalEntry,
  DaemonRenewalRecord,
} from '../domain.objects/daemonRenewalRecord';

/**
 * .what = set one renewal entry `halted` with a defect, if it is still the entry read
 * .why = a defect does not heal on retry, so it is named at once; the one shape of that
 *        halt lives here, for the per-key catch and the tick-level sweep alike
 *
 * .note = written through `setIfHeld`, so an unlock or relock that landed meanwhile wins
 */
export const setRenewalEntryHaltedByDefect = (
  input: { address: string; entry: DaemonRenewalEntry; error: string },
  context: { renewalRecord: DaemonRenewalRecord },
): void => {
  context.renewalRecord.setIfHeld({
    address: input.address,
    before: input.entry,
    after: { ...input.entry, status: 'halted', error: input.error },
  });
};
