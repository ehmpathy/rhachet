import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';

/**
 * .what = the renew entries that carry no mark and are not mid-renew
 * .why = the entries a tick-level defect may land on: a marked entry keeps the cause a
 *        human already reads, and an entry mid-renew settles on its own
 */
export const getAllRenewEntriesUnmarkedIdle = (input: {
  entries: Array<{ address: string; entry: DaemonRenewEntry }>;
  inflight: ReadonlySet<string>;
}): Array<{ address: string; entry: DaemonRenewEntry }> =>
  input.entries.filter(
    ({ address, entry }) => entry.mark === null && !input.inflight.has(address),
  );
