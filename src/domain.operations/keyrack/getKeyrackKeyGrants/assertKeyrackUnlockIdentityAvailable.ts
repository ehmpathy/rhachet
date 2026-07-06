import { MalfunctionError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';

import type { ContextKeyrack } from '../genContextKeyrack';

/**
 * .what = asserts an unlock identity is discoverable via a one-time host-manifest load + decrypt
 * .why = a locked key can only be unlocked if the host manifest decrypts; probe that upfront so an
 *        absent identity fails as a MalfunctionError with a --prikey hint, not deep in the unlock loop
 *
 * .note = the manifest result is intentionally not returned — this is a pure availability check;
 *         the caller reuses the same context so the decrypt does not repeat
 */
export const assertKeyrackUnlockIdentityAvailable = async (
  input: { owner: string | null; env: string; keys: string[] },
  context: ContextKeyrack,
): Promise<void> => {
  await MalfunctionError.wrap(
    async () => daoKeyrackHostManifest.get({ owner: input.owner }, context),
    {
      message:
        'could not load host manifest to auto-unlock keyrack keys; no discoverable identity — unlock manually with --prikey',
      metadata: { owner: input.owner, env: input.env, keys: input.keys },
    },
  )();
};
