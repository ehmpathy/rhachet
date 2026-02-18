import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import {
  type KeyrackGrantMechanism,
  KeyrackHostManifest,
  type KeyrackHostVault,
  KeyrackKeyHost,
} from '../../domain.objects/keyrack';
import { vaultAdapterOsDirect, vaultAdapterOsSecure } from './adapters/vaults';
import type { KeyrackHostContext } from './genKeyrackHostContext';

/**
 * .what = configure storage for a credential key on this host
 * .why = enables per-host credential storage configuration
 *
 * .note = uses findsert semantics — if host found with same attrs, return found
 * .note = sudo credentials (env=sudo) stored only in host manifest
 * .note = regular credentials stored in host manifest AND keyrack.yml
 */
export const setKeyrackKeyHost = async (
  input: {
    owner?: string | null;
    slug: string;
    mech: KeyrackGrantMechanism;
    vault: KeyrackHostVault;
    exid?: string | null;
    env?: string;
    org?: string;
    vaultRecipient?: string | null;
    maxDuration?: string | null;
    value?: string | null;
  },
  context: KeyrackHostContext,
): Promise<KeyrackKeyHost> => {
  const now = new Date().toISOString();

  // validate org — only @this or @all allowed at domain level
  const orgInput = input.org ?? '@this';
  if (orgInput !== '@this' && orgInput !== '@all') {
    throw new BadRequestError('org must be @this or @all', {
      org: orgInput,
      note: 'use @this for same-org credentials, @all for cross-org',
    });
  }

  // resolve @this to actual org from repo manifest
  if (orgInput === '@this' && !context.repoManifest?.org) {
    throw new BadRequestError('@this requires repo manifest to resolve org', {
      note: 'run from a repo with keyrack.yml or use @all for cross-org credentials',
    });
  }
  const resolvedOrg = orgInput === '@this' ? context.repoManifest!.org : '@all';

  // construct key host
  const keyHost = new KeyrackKeyHost({
    slug: input.slug,
    mech: input.mech,
    vault: input.vault,
    exid: input.exid ?? null,
    env: input.env ?? 'all',
    org: resolvedOrg,
    vaultRecipient: input.vaultRecipient ?? null,
    maxDuration: input.maxDuration ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // always store value in vault first (ensures file exists even on findsert match)
  if (input.value) {
    const envValue = input.env ?? 'all';
    if (input.vault === 'os.secure') {
      await vaultAdapterOsSecure.set({
        slug: input.slug,
        value: input.value,
        env: envValue,
        org: resolvedOrg,
        vaultRecipient: input.vaultRecipient ?? null,
        // when no explicit vaultRecipient, use manifest recipients
        recipients: input.vaultRecipient
          ? undefined
          : context.hostManifest.recipients,
      });
    }
    if (input.vault === 'os.direct') {
      await vaultAdapterOsDirect.set({
        slug: input.slug,
        value: input.value,
        env: envValue,
        org: resolvedOrg,
      });
    }
  }

  // check if key already exists in manifest
  const hostFound = context.hostManifest.hosts[input.slug];
  if (hostFound) {
    // if found with same attrs, return found (findsert semantics)
    if (
      hostFound.mech === input.mech &&
      hostFound.vault === input.vault &&
      hostFound.exid === (input.exid ?? null) &&
      hostFound.env === (input.env ?? 'all') &&
      hostFound.org === resolvedOrg &&
      hostFound.vaultRecipient === (input.vaultRecipient ?? null)
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

  // persist host manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  // for non-sudo keys: also write to keyrack.yml (if gitroot available)
  const envValue = input.env ?? 'all';
  if (envValue !== 'sudo' && context.gitroot) {
    // extract key name from slug (format: $org.$env.$key)
    const keyName = input.slug.split('.').slice(2).join('.');
    await daoKeyrackRepoManifest.set.findsertKeyToEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: envValue,
    });
  }

  return keyHost;
};
