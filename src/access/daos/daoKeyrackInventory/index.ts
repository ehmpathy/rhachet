import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';
import { getHomeDir } from '@src/infra/getHomeDir';

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * .what = computes the inventory path for a keyrack key
 * .why = centralizes path computation for inventory entries
 *
 * .note = path pattern: ~/.rhachet/keyrack/inventory/owner={owner}/{hash}.stocked
 */
const getInventoryPath = (input: {
  slug: string;
  owner: string | null;
}): string => {
  const home = getHomeDir();
  const ownerDir = asKeyrackOwnerDir({ owner: input.owner });
  const hash = asKeyrackSlugHash({ slug: input.slug });
  return join(
    home,
    '.rhachet',
    'keyrack',
    'inventory',
    ownerDir,
    `${hash}.stocked`,
  );
};

/**
 * .what = persistence for keyrack inventory entries
 * .why = tracks which keys have been set on the host (vault-agnostic)
 *
 * .note = uses empty .stocked files (chmod 600) for security
 * .note = enables accurate locked vs absent status for all vaults
 */
export const daoKeyrackInventory = {
  /**
   * .what = check if inventory entry exists
   * .why = used by inferKeyrackKeyStatusWhenNotGranted to determine locked vs absent
   */
  exists: async (input: {
    slug: string;
    owner: string | null;
  }): Promise<boolean> => {
    return existsSync(getInventoryPath(input));
  },

  /**
   * .what = create inventory entry
   * .why = records that a key has been set on the host
   *
   * .note = creates dir with mode 0o700, file with mode 0o600
   * .note = idempotent — re-set is no-op (file already exists)
   */
  set: async (input: { slug: string; owner: string | null }): Promise<void> => {
    const path = getInventoryPath(input);
    const dir = dirname(path);

    // create directory with restricted permissions
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true, mode: 0o700 });
    }

    // create empty file with restricted permissions (idempotent)
    if (!existsSync(path)) {
      await writeFile(path, '', { mode: 0o600 });
    }
  },

  /**
   * .what = remove inventory entry
   * .why = records that a key has been deleted from the host
   *
   * .note = idempotent — re-del is no-op (file already gone)
   */
  del: async (input: { slug: string; owner: string | null }): Promise<void> => {
    const path = getInventoryPath(input);
    if (existsSync(path)) {
      await rm(path);
    }
  },
};
