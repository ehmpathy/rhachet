import { daoKeyrackHostManifest } from '../../../access/daos/daoKeyrackHostManifest';
import type { KeyrackKeyRecipient } from '../../../domain.objects/keyrack';
import { getKeyrackDaemonSocketPath } from '../daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessStatus } from '../daemon/sdk';

/**
 * .what = get status of unlocked keys in daemon
 * .why = shows what keys are available and how much time is left
 *
 * .note = includes recipient info from host manifest
 */
export const getKeyrackStatus = async (input?: {
  owner?: string | null;
}): Promise<{
  keys: Array<{
    slug: string;
    env: string;
    org: string;
    expiresAt: number;
    ttlLeftMs: number;
  }>;
  recipients: KeyrackKeyRecipient[];
  owner: string | null;
  socketPath: string;
} | null> => {
  // resolve socket path based on owner
  const socketPath = getKeyrackDaemonSocketPath({
    owner: input?.owner ?? null,
  });

  const result = await daemonAccessStatus({ socketPath });

  // daemon not reachable — return null
  if (!result) {
    return null;
  }

  // fetch host manifest for recipient info
  const hostManifest = await daoKeyrackHostManifest.get({
    owner: input?.owner ?? null,
  });

  return {
    keys: result.keys.map((k) => ({
      slug: k.slug,
      env: k.env,
      org: k.org,
      expiresAt: k.expiresAt,
      ttlLeftMs: k.ttlLeftMs,
    })),
    recipients: hostManifest?.recipients ?? [],
    owner: input?.owner ?? null,
    socketPath,
  };
};
