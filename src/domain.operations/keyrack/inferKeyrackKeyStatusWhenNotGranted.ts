import { asHashSha256Sync } from 'hash-fns';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKeyrackHostManifestIndexPath } from './getKeyrackHostManifestPath';

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
  } catch (error) {
    // corrupt JSON is expected (treat as absent); rethrow other errors
    if (error instanceof SyntaxError) return false;
    throw error;
  }
};

/**
 * .what = check if host manifest index has an entry for a slug
 * .why = enables locked detection for non-local vaults (1password, aws.iam.sso)
 *
 * .note = index is unencrypted, contains only slugs (no secrets)
 * .note = index is written alongside encrypted manifest by daoKeyrackHostManifest.set
 */
const doesHostManifestIndexHaveEntry = (input: {
  slug: string;
  owner: string | null;
}): boolean => {
  const indexPath = getKeyrackHostManifestIndexPath({ owner: input.owner });

  if (!existsSync(indexPath)) return false;

  try {
    const content = readFileSync(indexPath, 'utf8');
    const slugs = JSON.parse(content) as string[];
    return slugs.includes(input.slug);
  } catch (error) {
    // corrupt JSON is expected (treat as absent); rethrow other errors
    if (error instanceof SyntaxError) return false;
    throw error;
  }
};

/**
 * .what = infer why a key was not granted: locked or absent
 * .why = makes it easier to interpret why a key was not granted
 *
 * .when = call this ONLY when a key could not be granted (not in daemon/envvar)
 *
 * .note = checks vault file/entry existence and host manifest index
 * .note = host manifest index is unencrypted (slugs only, no secrets)
 * .note = returns 'locked' if key exists in vault or manifest (needs unlock)
 * .note = returns 'absent' if no entry anywhere (needs set)
 */
export const inferKeyrackKeyStatusWhenNotGranted = (input: {
  slug: string;
  owner: string | null;
}): 'locked' | 'absent' => {
  const home = process.env.HOME;
  if (!home) return 'absent';

  // check os.secure vault (encrypted .age files)
  if (doesOsSecureVaultExist({ slug: input.slug, owner: input.owner, home })) {
    return 'locked';
  }

  // check os.direct vault (plaintext json store)
  if (doesOsDirectVaultExist({ slug: input.slug, owner: input.owner, home })) {
    return 'locked';
  }

  // check host manifest index (handles 1password, aws.iam.sso, etc)
  if (
    doesHostManifestIndexHaveEntry({ slug: input.slug, owner: input.owner })
  ) {
    return 'locked';
  }

  return 'absent';
};
