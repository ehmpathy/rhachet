import { asHashSha256Sync } from 'hash-fns';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';
import { getHomeDir } from '@src/infra/getHomeDir';

import { getEnvAllFallbackSlug } from './decideIsKeySlugEqual';

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
 */
export const inferKeyrackKeyStatusWhenNotGranted = (input: {
  slug: string;
  owner: string | null;
}): 'locked' | 'absent' => {
  // compute env=all fallback slug (e.g., ehmpathy.test.KEY → ehmpathy.all.KEY)
  const fallbackSlug = getEnvAllFallbackSlug({ for: { slug: input.slug } });

  // check inventory first (vault-agnostic, works for all vault types)
  if (doesInventoryExist({ slug: input.slug, owner: input.owner })) {
    return 'locked';
  }
  if (
    fallbackSlug &&
    doesInventoryExist({ slug: fallbackSlug, owner: input.owner })
  ) {
    return 'locked';
  }

  // fallback: check vault-specific storage for legacy keys without inventory
  const home = process.env.HOME;
  if (!home) return 'absent';

  // check os.secure vault (encrypted .age files)
  if (doesOsSecureVaultExist({ slug: input.slug, owner: input.owner, home })) {
    return 'locked';
  }
  if (
    fallbackSlug &&
    doesOsSecureVaultExist({ slug: fallbackSlug, owner: input.owner, home })
  ) {
    return 'locked';
  }

  // check os.direct vault (plaintext json store)
  if (doesOsDirectVaultExist({ slug: input.slug, owner: input.owner, home })) {
    return 'locked';
  }
  if (
    fallbackSlug &&
    doesOsDirectVaultExist({ slug: fallbackSlug, owner: input.owner, home })
  ) {
    return 'locked';
  }

  return 'absent';
};
