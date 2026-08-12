import { asHashSha256Sync } from 'hash-fns';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';
import { getAllKeyrackProbeAddresses } from '@src/domain.operations/keyrack/reach/getAllKeyrackProbeAddresses';
import { getHomeDir } from '@src/infra/getHomeDir';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = check if inventory entry exists for a slug (sync)
 * .why = inventory is vault-agnostic source of truth for "was key ever set"
 */
const doesInventoryExist = (input: {
  slug: string;
  owner: string | null;
}): boolean => {
  const home = getHomeDir();
  const ownerDir = asKeyrackOwnerDir({ owner: input.owner });
  const hash = asKeyrackSlugHash({ slug: input.slug });
  const path = join(
    home,
    '.rhachet',
    'keyrack',
    'inventory',
    ownerDir,
    `${hash}.stocked`,
  );
  return existsSync(path);
};

/**
 * .what = check if os.secure vault file exists for a slug
 * .why = os.secure uses individual .age files per key
 */
const doesOsSecureVaultExist = (input: {
  slug: string;
  owner: string | null;
  home: string;
}): boolean => {
  const ownerDir = `owner=${input.owner ?? 'default'}`;
  const hash = asHashSha256Sync(input.slug).slice(0, 16);
  const vaultPath = join(
    input.home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.secure',
    ownerDir,
    `${hash}.age`,
  );

  return existsSync(vaultPath);
};

/**
 * .what = check if os.direct vault has an entry for a slug
 * .why = os.direct uses json store, need to check key existence in store
 */
const doesOsDirectVaultExist = (input: {
  slug: string;
  owner: string | null;
  home: string;
}): boolean => {
  const ownerDir = `owner=${input.owner ?? 'default'}`;
  const storePath = join(
    input.home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.direct',
    ownerDir,
    'keyrack.direct.json',
  );

  if (!existsSync(storePath)) return false;

  try {
    const content = readFileSync(storePath, 'utf8');
    const store = JSON.parse(content) as Record<string, unknown>;
    return input.slug in store;
  } catch {
    return false;
  }
};

/**
 * .what = infer why a key was not granted: locked or absent
 * .why = makes it easier to interpret why a key was not granted
 *
 * .when = call this ONLY when a key could not be granted (not in daemon/envvar)
 *
 * .note = checks inventory first (vault-agnostic, records all set keys)
 * .note = falls back to vault-specific checks for legacy keys without inventory
 * .note = returns 'locked' if key was set (needs unlock)
 * .note = returns 'absent' if key was never set (needs set)
 * .note = every probe below is addressed by (slug, reach), never by slug alone. were they
 *         slug-only, an ask for a reach no key was ever cut for would read 'locked' —
 *         because the REACHLESS key is set — and hand the human an `unlock --reach` that
 *         cannot succeed. the diagnosis has to be as reach-aware as the lookup it explains
 */
export const inferKeyrackKeyStatusWhenNotGranted = (input: {
  slug: string;
  reach?: KeyrackKeyReach;
  owner: string | null;
}): 'locked' | 'absent' => {
  // the exact address, then its env=all twin at the SAME reach — one probe order,
  // shared with the daemon store and the manifest lookup
  const addresses = getAllKeyrackProbeAddresses({
    slug: input.slug,
    reach: input.reach,
  }).map((probe) => probe.address);

  // check inventory first (vault-agnostic, works for all vault types)
  if (
    addresses.some((slug) => doesInventoryExist({ slug, owner: input.owner }))
  )
    return 'locked';

  // fallback: check vault-specific storage for legacy keys without inventory
  const home = process.env.HOME;
  if (!home) return 'absent';

  // check os.secure vault (encrypted .age files)
  if (
    addresses.some((slug) =>
      doesOsSecureVaultExist({ slug, owner: input.owner, home }),
    )
  )
    return 'locked';

  // check os.direct vault (plaintext json store)
  if (
    addresses.some((slug) =>
      doesOsDirectVaultExist({ slug, owner: input.owner, home }),
    )
  )
    return 'locked';

  return 'absent';
};
