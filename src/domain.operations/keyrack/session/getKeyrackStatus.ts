import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessStatus } from '@src/domain.operations/keyrack/daemon/sdk';
import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

/**
 * .what = get status of unlocked keys in daemon
 * .why = shows what keys are available and how much time is left
 *
 * .note = includes recipient info from host manifest
 */
export const getKeyrackStatus = async (input?: {
  owner?: string | null;
  prikeys?: string[];
}): Promise<{
  keys: DaemonStatusRow[];
  recipients: KeyrackKeyRecipient[];
  owner: string | null;
  socketPath: string;
} | null> => {
  const owner = input?.owner ?? null;

  // derive socket path from owner
  const socketPath = getKeyrackDaemonSocketPath({ owner });

  const result = await daemonAccessStatus({ socketPath });

  // daemon not reachable — return null
  if (!result) {
    return null;
  }

  // create context with identity discovery
  const context = genContextKeyrack({ owner, prikeys: input?.prikeys });

  // fetch host manifest for recipient info
  const hostManifestResult = await daoKeyrackHostManifest.get(
    { owner },
    context,
  );

  return {
    keys: result.keys.map((k) => ({
      slug: k.slug,
      env: k.env,
      org: k.org,
      ...asKeyrackKeyReachField({ reach: k.reach }),
      expiresAt: k.expiresAt,
      ttlLeftMs: k.ttlLeftMs,
    })),
    recipients: hostManifestResult?.manifest.recipients ?? [],
    owner,
    socketPath,
  };
};
