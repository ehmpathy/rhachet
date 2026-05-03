import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import {
  type KeyrackGrantMechanism,
  KeyrackHostManifest,
  type KeyrackHostVault,
  KeyrackKeyHost,
} from '@src/domain.objects/keyrack';
import { isEphemeralVault } from '@src/domain.operations/keyrack/isEphemeralVault';
import { isKeyrackKeyHostAttrsEqual } from '@src/domain.operations/keyrack/isKeyrackKeyHostAttrsEqual';

import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { daemonAccessRelock } from './daemon/sdk';
import type { ContextKeyrack } from './genContextKeyrack';

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
    mech?: KeyrackGrantMechanism | null;
    vault: KeyrackHostVault;
    exid?: string | null;
    env?: string;
    org?: string;
    vaultRecipient?: string | null;
    maxDuration?: string | null;
    secret?: string | null;
    at?: string | null;
  },
  context: ContextKeyrack,
): Promise<KeyrackKeyHost> => {
  // guard: host manifest required
  if (!context.hostManifest)
    throw new UnexpectedCodePathError(
      'hostManifest required for set; call daoKeyrackHostManifest.get() first',
      { slug: input.slug },
    );
  const hostManifest = context.hostManifest;

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

  // extract env from slug (format: org.env.keyName)
  const envFromSlug = asKeyrackKeyEnv({ slug: input.slug }) || 'all';

  // store secret in vault
  // .note = vault encapsulates mech calls: infers mech if absent, checks compat, calls mech.acquireForSet
  const adapter = context.vaultAdapters[input.vault];
  const setResult = await adapter.set(
    {
      slug: input.slug,
      mech: input.mech ?? null,
      exid: input.exid ?? null,
    },
    context,
  );

  // use mech from vault.set result (may have been inferred)
  const mechForManifest = setResult.mech;

  // if adapter derived an exid (e.g., aws.config guided setup), use it for the manifest entry
  const exidForManifest = setResult.exid ?? input.exid ?? null;

  // write-only vaults (get === null) are passthrough — skip manifest write
  // .why = write-only vaults cannot be used for subsequent keyrack get/unlock
  //        so its equivalent to them never been present on this host
  // .bonus = enables push to write-only vaults without risk of erasure of usable host keys
  if (adapter.get === null) {
    // return a transient KeyrackKeyHost (not persisted) for CLI output
    return new KeyrackKeyHost({
      slug: input.slug,
      mech: mechForManifest,
      vault: input.vault,
      exid: exidForManifest,
      env: input.env ?? 'all',
      org: orgExpanded,
      vaultRecipient: input.vaultRecipient ?? null,
      maxDuration: input.maxDuration ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // invalidate stale daemon cache for this key (if daemon is active)
  // this ensures `get` returns "locked" instead of stale value after `set`
  // .note = skip for os.daemon vault — daemon IS the source, set already stored there
  if (input.vault !== 'os.daemon') {
    await daemonAccessRelock({ slugs: [input.slug], owner: context.owner });
  }

  // check if key already exists in manifest
  const hostFound = hostManifest.hosts[input.slug];
  if (hostFound) {
    // if found with same attrs, return found (findsert semantics)
    const attrsEqual = isKeyrackKeyHostAttrsEqual({
      hostFound: new KeyrackKeyHost(hostFound),
      attrs: {
        mech: mechForManifest,
        vault: input.vault,
        exid: exidForManifest,
        env: input.env ?? 'all',
        org: orgExpanded,
        vaultRecipient: input.vaultRecipient ?? null,
      },
    });
    if (attrsEqual) {
      return new KeyrackKeyHost(hostFound);
    }
  }

  // construct key host with derived mech and exid
  const keyHost = new KeyrackKeyHost({
    slug: input.slug,
    mech: mechForManifest,
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
    ...hostManifest.hosts,
    [input.slug]: keyHost,
  };

  const manifestUpdated = new KeyrackHostManifest({
    ...hostManifest,
    hosts: hostsUpdated,
  });

  // persist host manifest
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  // set inventory entry (after manifest persist)
  // .note = ephemeral vaults skip inventory (cleared on relock)
  if (!isEphemeralVault({ vault: input.vault })) {
    await daoKeyrackInventory.set({ slug: input.slug, owner: context.owner });
  }

  // for non-sudo keys: also write to keyrack.yml (if gitroot available)
  if (envFromSlug !== 'sudo' && context.gitroot) {
    const keyName = asKeyrackKeyName({ slug: input.slug });
    await daoKeyrackRepoManifest.set.findsertKeyToEnv({
      gitroot: context.gitroot,
      key: keyName,
      env: envFromSlug,
      at: input.at ?? undefined,
    });
  }

  return keyHost;
};
