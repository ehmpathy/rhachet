import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';

/**
 * .what = the renewal entries whose status is `on` and that are not mid-renew
 * .why = the entries a tick-level defect may land on: a lapsed or halted entry keeps the
 *        cause a human already reads, and an entry mid-renew settles on its own
 */
export const getAllRenewalEntriesOnIdle = (input: {
  entries: Array<{ address: string; entry: DaemonRenewalEntry }>;
  inflight: ReadonlySet<string>;
}): Array<{ address: string; entry: DaemonRenewalEntry }> =>
  input.entries.filter(
    ({ address, entry }) =>
      entry.status === 'on' && !input.inflight.has(address),
  );
