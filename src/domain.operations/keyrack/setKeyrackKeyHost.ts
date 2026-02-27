import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import {
  type KeyrackGrantMechanism,
  KeyrackHostManifest,
  type KeyrackHostVault,
  KeyrackKeyHost,
} from '@src/domain.objects/keyrack';

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
    slug: string;
    mech: KeyrackGrantMechanism;
    vault: KeyrackHostVault;
    exid?: string | null;
    env?: string;
    org?: string;
    vaultRecipient?: string | null;
    maxDuration?: string | null;
    secret?: string | null;
    at?: string | null;
  },
  context: KeyrackHostContext,
): Promise<KeyrackKeyHost> => {
  const now = new Date().toISOString();

  // expand org — accepts @this (expands from manifest), @all, or already-expanded org name
  const orgInput = input.org ?? '@this';
  const orgExpanded = (() => {
    if (orgInput === '@this') {
      if (!context.repoManifest?.org) {
        throw new BadRequestError(
          '@this requires repo manifest to expand org',
          {
            note: 'run from a repo with keyrack.yml or use @all for cross-org credentials',
          },
        );
      }
      return context.repoManifest.org;
    }
    // @all or already-expanded org name (e.g., 'testorg') — pass through
    return orgInput;
  })();

  // store secret in vault (upsert — always call adapter)
  const envValue = input.env ?? 'all';
  const adapter = context.vaultAdapters[input.vault];
  const setResult = await adapter.set({
    slug: input.slug,
    secret: input.secret ?? null,
    exid: input.exid ?? null,
    env: envValue,
    org: orgExpanded,
    vaultRecipient: input.vaultRecipient ?? null,
    owner: context.owner,
    // when no explicit vaultRecipient, use manifest recipients
    recipients: input.vaultRecipient
      ? undefined
      : context.hostManifest.recipients,
  });

  // if adapter derived an exid (e.g., aws.iam.sso guided setup), use it for the manifest entry
  const exidForManifest =
    (setResult && 'exid' in setResult ? setResult.exid : null) ??
    input.exid ??
    null;

  // check if key already exists in manifest
  const hostFound = context.hostManifest.hosts[input.slug];
  if (hostFound) {
    // if found with same attrs, return found (findsert semantics)
    if (
      hostFound.mech === input.mech &&
      hostFound.vault === input.vault &&
      hostFound.exid === exidForManifest &&
      hostFound.env === (input.env ?? 'all') &&
      hostFound.org === orgExpanded &&
      hostFound.vaultRecipient === (input.vaultRecipient ?? null)
    ) {
      return new KeyrackKeyHost(hostFound);
    }
  }

  // construct key host with derived exid
  const keyHost = new KeyrackKeyHost({
    slug: input.slug,
    mech: input.mech,
    vault: input.vault,
    exid: exidForManifest,
    env: input.env ?? 'all',
    org: orgExpanded,
    vaultRecipient: input.vaultRecipient ?? null,
    maxDuration: input.maxDuration ?? null,
    createdAt: now,
    updatedAt: now,
  });

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
  if (envValue !== 'sudo' && context.gitroot) {
    // extract key name from slug (format: $org.$env.$key)
    const keyName = input.slug.split('.').slice(2).join('.');
    await daoKeyrackRepoManifest.set.findsertKeyToEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: envValue,
      at: input.at ?? undefined,
    });
  }

  return keyHost;
};
