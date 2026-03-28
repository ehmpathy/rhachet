import { asHashSha256Sync } from 'hash-fns';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getEnvAllFallbackSlug } from './decideIsKeySlugEqual';

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
 * .note = checks vault file/entry existence, not host manifest
 * .note = host manifest is encrypted, we avoid decrypt here
 * .note = returns 'locked' if vault has the key (needs unlock)
 * .note = returns 'absent' if vault has no entry (needs set)
 *
 * .caveat = only checks os.secure and os.direct vaults
 * .caveat = keys in other vaults (1password, etc) will mislead with 'absent'
 * .caveat = best we can do without manifest decrypt
 */
export const inferKeyrackKeyStatusWhenNotGranted = (input: {
  slug: string;
  owner: string | null;
}): 'locked' | 'absent' => {
  const home = process.env.HOME;
  if (!home) return 'absent';

  // compute env=all fallback slug (e.g., ehmpathy.test.KEY → ehmpathy.all.KEY)
  const fallbackSlug = getEnvAllFallbackSlug({ for: { slug: input.slug } });

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
