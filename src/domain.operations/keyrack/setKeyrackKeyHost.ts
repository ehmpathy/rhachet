import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import {
  type KeyrackGrantMechanism,
  KeyrackHostManifest,
  type KeyrackHostVault,
  KeyrackKeyHost,
} from '../../domain.objects/keyrack';
import type { KeyrackHostContext } from './genKeyrackHostContext';

/**
 * .what = configure storage for a credential key on this host
 * .why = enables per-host credential storage configuration
 *
 * .note = uses findsert semantics — if host found with same attrs, return found
 */
export const setKeyrackKeyHost = async (
  input: {
    slug: string;
    mech: KeyrackGrantMechanism;
    vault: KeyrackHostVault;
    exid?: string | null;
  },
  context: KeyrackHostContext,
): Promise<KeyrackKeyHost> => {
  const now = new Date().toISOString();

  // construct key host
  const keyHost = new KeyrackKeyHost({
    slug: input.slug,
    mech: input.mech,
    vault: input.vault,
    exid: input.exid ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // check if key already exists
  const hostFound = context.hostManifest.hosts[input.slug];
  if (hostFound) {
    // if found with same attrs, return found (findsert semantics)
    if (
      hostFound.mech === input.mech &&
      hostFound.vault === input.vault &&
      hostFound.exid === (input.exid ?? null)
    ) {
      return new KeyrackKeyHost(hostFound);
    }
  }

  // update manifest with new/updated key host
  const hostsUpdated = {
    ...context.hostManifest.hosts,
    [input.slug]: keyHost,
  };

  const manifestUpdated = new KeyrackHostManifest({
    ...context.hostManifest,
    hosts: hostsUpdated,
  });

  // persist manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  return keyHost;
};
