import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllKeyrackReachesForSlug } from '@src/domain.operations/keyrack/reach/getAllKeyrackReachesForSlug';

/**
 * .what = the email of every account the keyrack holds a token for
 * .why = `get` lists each stored account (case=2); the reach of each slot copy is its email
 * .note = no host manifest yet → no accounts, never an error
 */
export const getAllBrainAuthSlotEmails = async (input: {
  owner: string | null;
}): Promise<string[]> => {
  // load the host manifest
  const context = genContextKeyrack({ owner: input.owner });
  const loaded = await daoKeyrackHostManifest.get(
    { owner: input.owner },
    context,
  );
  if (!loaded) return [];

  // list the reaches the slot holds, each named by its email
  const reaches = getAllKeyrackReachesForSlug({
    hosts: loaded.manifest.hosts,
    slug: CLAUDE_AUTH_SLOT.slug,
  });
  return asSlotReachEmails({ reaches });
};

/**
 * .what = the email each slot reach names
 * .why = a slot's reach exid IS the account's email (fulcrum F2)
 */
const asSlotReachEmails = (input: { reaches: KeyrackKeyReach[] }): string[] =>
  input.reaches.map((reach) => reach.exid);
